// scripts/verifyAllocation.ts
//
// Invariant checks for the Upgrade Point optimizer.
// Run with:  npm run verify:upgrades

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseSimpleBestiaryCsv, type BestiaryTrait } from "../src/logic/bestiary";
import {
  optimiseAllocation,
  buildCandidates,
  parseMagnitudes,
} from "../src/logic/upgradeOptimizer";
import {
  CROSS_CLASS_CAP,
  POOL_POINTS,
  TIER_COST,
  type UpgradeClass,
  UPGRADE_META,
} from "../src/logic/upgradeRules";
import type { TameablePet } from "../src/types/tameables";
import type { PlaystyleKey } from "../src/logic/teamScoring";

// Resolved from the project root, so this works however the file is bundled.
const PUBLIC = join(process.cwd(), "public");

const load = (f: string): BestiaryTrait[] =>
  parseSimpleBestiaryCsv(readFileSync(join(PUBLIC, f), "utf8"));

const byClass: Record<UpgradeClass, BestiaryTrait[]> = {
  Attack: load("attackClass.csv"),
  Tank: load("tankClass.csv"),
  Utility: load("utilityClass.csv"),
};

// --- tameables -------------------------------------------------------------

function loadTameables(): TameablePet[] {
  const text = readFileSync(join(PUBLIC, "tameables.csv"), "utf8");
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const i = (n: string) => header.indexOf(n);

  return lines.slice(1).map((line, idx) => {
    const c = line.split(",");
    return {
      id: `t-${idx}`,
      name: c[i("name")] ?? "",
      dungeon: c[i("Dungeon")] ?? "",
      slots: Number(c[i("Slots")] || 0),
      taming: Number(c[i("Taming")] || 0),
      class: c[i("Class")] ?? "",
      combat: c[i("Combat")] ?? "",
      hits: Number(c[i("Hits")] || 0),
      minDmg: Number(c[i("MinDmg")] || 0),
      maxDmg: Number(c[i("MaxDmg")] || 0),
      wrestling: Number(c[i("Wrestling")] || 0),
      armor: Number(c[i("Armor")] || 0),
      magicRst: c[i("MagicRst")] ?? "",
      poisonRst: c[i("PoisonRst")] ?? "",
      specialRst: c[i("SpecialRst")] ?? "",
      poison: c[i("Poison")] ?? "",
      poisoning: c[i("Poisoning")] ? Number(c[i("Poisoning")]) : null,
      stealth: c[i("Stealth")] ?? "",
      underdogScalar: Number(c[i("UnderdogScalar")] || 1),
      cooldownAbility: c[i("CooldownAbility")] ?? "",
      passiveAbility: c[i("PassiveAbility")] ?? "",
      innateAbility: c[i("InnateAbility")] ?? "",
      tags: [],
    } as TameablePet;
  });
}

const allPets = loadTameables();

// --- assertions ------------------------------------------------------------

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  if (!ok) {
    failures++;
    console.error(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
};

// 1. Every upgrade in the CSVs has metadata, and every metadata key is real.
const csvNames = new Set(
  (Object.keys(byClass) as UpgradeClass[]).flatMap((k) =>
    byClass[k].map((t) => t.name)
  )
);
for (const name of csvNames) {
  check(`metadata exists for "${name}"`, name in UPGRADE_META);
}
for (const name of Object.keys(UPGRADE_META)) {
  check(`metadata key "${name}" matches a CSV row`, csvNames.has(name));
}

// 2. Tier magnitudes parse out of every description.
for (const klass of Object.keys(byClass) as UpgradeClass[]) {
  for (const trait of byClass[klass]) {
    const { primary } = parseMagnitudes(
      trait.description,
      UPGRADE_META[trait.name]?.hasFallback
    );
    check(
      `magnitudes parsed for "${trait.name}"`,
      primary.length === 3 && primary.every((n) => Number.isFinite(n)),
      JSON.stringify(primary)
    );
    check(
      `magnitudes increase across tiers for "${trait.name}"`,
      primary[0] <= primary[1] && primary[1] <= primary[2],
      JSON.stringify(primary)
    );
  }
}

// 3. Cost table matches the 1 / 2 / 2 step rule.
check("tier costs are 0,1,3,5", JSON.stringify([...TIER_COST]) === "[0,1,3,5]");

// 4. Randomised teams: allocations must always be legal.
function randomTeam(rng: () => number): TameablePet[] {
  const team: TameablePet[] = [];
  let slots = 0;
  for (let n = 0; n < 8 && slots < 5; n++) {
    const pet = allPets[Math.floor(rng() * allPets.length)];
    if (slots + (pet.slots || 0) > 5) continue;
    team.push(pet);
    slots += pet.slots || 0;
  }
  return team;
}

let seed = 12345;
const rng = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

const playstyles: PlaystyleKey[] = ["aoe_far", "single_target", "balanced"];
const classes: UpgradeClass[] = ["Attack", "Tank", "Utility"];

let crossClassSeen = 0;
let runs = 0;

for (let trial = 0; trial < 300; trial++) {
  const team = randomTeam(rng);
  const playstyle = playstyles[trial % playstyles.length];

  for (const klass of classes) {
    if (!team.some((p) => p.class === klass)) continue;
    runs++;

    const candidates = buildCandidates(klass, byClass, team, playstyle);
    const alloc = optimiseAllocation(klass, candidates);

    check(
      `${klass}: pool budget respected`,
      alloc.pointsSpent <= POOL_POINTS,
      `${alloc.pointsSpent} pts`
    );
    check(
      `${klass}: cross-class cap respected`,
      alloc.crossClassPointsSpent <= CROSS_CLASS_CAP,
      `${alloc.crossClassPointsSpent} pts`
    );
    check(
      `${klass}: point totals reconcile`,
      alloc.entries.reduce((s, e) => s + e.points, 0) === alloc.pointsSpent
    );

    const names = new Set<string>();
    for (const e of alloc.entries) {
      check(
        `${klass}: "${e.name}" has a legal point value`,
        [1, 3, 5].includes(e.points),
        `${e.points} pts`
      );
      check(
        `${klass}: "${e.name}" tier matches cost`,
        TIER_COST[e.tier] === e.points
      );
      check(
        `${klass}: "${e.name}" not duplicated`,
        !names.has(`${e.sourceClass}:${e.name}`)
      );
      names.add(`${e.sourceClass}:${e.name}`);
      check(
        `${klass}: crossClass flag correct for "${e.name}"`,
        e.crossClass === (e.sourceClass !== klass)
      );
    }

    if (alloc.crossClassPointsSpent > 0) crossClassSeen++;

    // 5. Optimality spot-check: the DP result must beat a greedy baseline.
    const greedy = [...candidates]
      .sort((a, b) => b.tierValue[3] / 5 - a.tierValue[3] / 5)
      .reduce(
        (acc, c) => {
          const cost = TIER_COST[3];
          const crossOk = !c.crossClass || acc.cross + cost <= CROSS_CLASS_CAP;
          if (acc.spent + cost <= POOL_POINTS && crossOk) {
            acc.spent += cost;
            if (c.crossClass) acc.cross += cost;
            acc.value += c.tierValue[3];
          }
          return acc;
        },
        { spent: 0, cross: 0, value: 0 }
      );

    check(
      `${klass}: DP result is at least as good as greedy`,
      alloc.totalValue >= greedy.value - 1e-9,
      `dp=${alloc.totalValue.toFixed(2)} greedy=${greedy.value.toFixed(2)}`
    );
  }
}

// --- sample output ---------------------------------------------------------

const sample = allPets.filter((p) =>
  ["Aegis Leech", "Aegis Asp"].includes(p.name)
);
const tank = allPets.find((p) => p.class === "Tank");
if (tank) sample.push(tank);

console.log("\nSample build (balanced):", sample.map((p) => p.name).join(", "));
for (const klass of classes) {
  if (!sample.some((p) => p.class === klass)) continue;
  const alloc = optimiseAllocation(
    klass,
    buildCandidates(klass, byClass, sample, "balanced")
  );
  console.log(
    `\n  ${klass} — ${alloc.pointsSpent}/${POOL_POINTS} pts` +
      ` (${alloc.crossClassPointsSpent}/${CROSS_CLASS_CAP} cross-class)`
  );
  for (const e of alloc.entries) {
    console.log(
      `    ${e.crossClass ? "*" : " "} ${e.name.padEnd(16)} T${e.tier}  ${e.points} pts` +
        (e.crossClass ? `   [${e.sourceClass}]` : "")
    );
  }
}

console.log(
  `\n${runs} allocations checked; ${crossClassSeen} used cross-class points.`
);

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All invariant checks passed.");
