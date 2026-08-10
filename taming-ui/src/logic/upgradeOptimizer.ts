// src/logic/upgradeOptimizer.ts
//
// Optimal Upgrade Point allocation for a single class pool.
//
// Solves: maximise total value subject to
//     sum(cost) <= POOL_POINTS            (20)
//     sum(cost of cross-class picks) <= CROSS_CLASS_CAP   (5)
// where each upgrade may be taken at tier 0/1/2/3 costing 0/1/3/5 points.
//
// This is a two-constraint bounded knapsack. With ~36 candidate upgrades and a
// 21 x 6 state space it is solved exactly by dynamic programming in well under
// a millisecond, so there is no need for the old greedy heuristic.

import type { TameablePet } from "../types/tameables";
import type { BestiaryTrait } from "./bestiary";
import type { PlaystyleKey } from "./teamScoring";
import {
  CROSS_CLASS_CAP,
  DEFAULT_META,
  MAX_TIER,
  POOL_POINTS,
  TIER_COST,
  UPGRADE_META,
  buildTeamContext,
  roleWeight,
  type TeamContext,
  type UpgradeClass,
} from "./upgradeRules";

// ---------------------------------------------------------------------------
// Parsing tier magnitudes out of the CSV description text
// ---------------------------------------------------------------------------

const TRIPLE_RE =
  /\(\s*(-?[\d.]+)\s*%?\s*[/,]\s*(-?[\d.]+)\s*%?\s*[/,]\s*(-?[\d.]+)\s*%?\s*\)/g;

/** The flat consolation bonus most upgrades grant when their condition fails. */
const STANDARD_FALLBACK = [4, 8, 12];

const FALLBACK_MARKER = /4\s*%?\s*[/,]\s*8\s*%?\s*[/,]\s*12\s*%?/;

export type ParsedMagnitudes = {
  /** Magnitude at tier 1, 2, 3 when the upgrade's condition is satisfied. */
  primary: number[];
  /** Magnitude at tier 1, 2, 3 when it is not. */
  fallback: number[];
};

export function parseMagnitudes(
  description: string,
  hasFallbackOverride?: boolean
): ParsedMagnitudes {
  TRIPLE_RE.lastIndex = 0;
  const triples: number[][] = [];
  let m: RegExpExecArray | null;
  while ((m = TRIPLE_RE.exec(description)) !== null) {
    triples.push([Number(m[1]), Number(m[2]), Number(m[3])]);
  }

  const primary = triples[0] ?? [10, 20, 30];

  const hasFallback =
    hasFallbackOverride ?? FALLBACK_MARKER.test(description);

  return {
    primary,
    fallback: hasFallback ? STANDARD_FALLBACK : [0, 0, 0],
  };
}

// ---------------------------------------------------------------------------
// Valuing one upgrade at one tier, for one class's creatures
// ---------------------------------------------------------------------------

export type UpgradeCandidate = {
  name: string;
  description: string;
  /** Which class's bestiary this upgrade comes from. */
  sourceClass: UpgradeClass;
  /** True when it is being bought out of a different class's pool. */
  crossClass: boolean;
  /** Value at tier 0..3 (index 0 is always 0). */
  tierValue: number[];
};

/**
 * Expected value of an upgrade at a given tier, averaged over the creatures it
 * will actually apply to. Creatures that satisfy the upgrade's condition get
 * the primary magnitude; the rest get the flat fallback.
 */
function valueAtTier(
  trait: BestiaryTrait,
  tier: number,
  appliesTo: TameablePet[],
  ctx: TeamContext,
  crossClass: boolean
): number {
  if (tier <= 0 || appliesTo.length === 0) return 0;

  const meta = UPGRADE_META[trait.name] ?? DEFAULT_META;
  const { primary, fallback } = parseMagnitudes(
    trait.description,
    meta.hasFallback
  );

  const t = tier - 1;
  const primaryMag = primary[t] ?? 0;
  const fallbackMag = fallback[t] ?? 0;

  let total = 0;
  for (const pet of appliesTo) {
    const p = Math.max(0, Math.min(1, meta.condition(pet, ctx)));
    const multiplier = meta.scalesWith ? meta.scalesWith(ctx, pet) : 1;

    const met = primaryMag * meta.scale * multiplier;
    const unmet = fallbackMag;

    total += p * met + (1 - p) * unmet;
  }

  let value = total / appliesTo.length;

  value *= roleWeight(meta.role, ctx);
  value *= meta.playstyle?.[ctx.playstyle] ?? 1;
  if (crossClass) value *= meta.crossClassFactor ?? 1;

  return value;
}

export function buildCandidates(
  payingClass: UpgradeClass,
  bestiaryByClass: Record<UpgradeClass, BestiaryTrait[]>,
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey
): UpgradeCandidate[] {
  const ctx = buildTeamContext(selectedPets, playstyle);
  const appliesTo = selectedPets.filter((p) => p.class === payingClass);

  const classes: UpgradeClass[] = ["Attack", "Tank", "Utility"];
  const candidates: UpgradeCandidate[] = [];

  for (const sourceClass of classes) {
    const crossClass = sourceClass !== payingClass;
    for (const trait of bestiaryByClass[sourceClass] ?? []) {
      const tierValue = [0, 1, 2, 3].map((tier) =>
        valueAtTier(trait, tier, appliesTo, ctx, crossClass)
      );
      // An upgrade worth nothing at max tier can never enter an optimal plan.
      if (tierValue[MAX_TIER] <= 0) continue;
      candidates.push({
        name: trait.name,
        description: trait.description,
        sourceClass,
        crossClass,
        tierValue,
      });
    }
  }

  return candidates;
}

// ---------------------------------------------------------------------------
// The knapsack
// ---------------------------------------------------------------------------

export type AllocationEntry = {
  name: string;
  description: string;
  sourceClass: UpgradeClass;
  crossClass: boolean;
  tier: number;
  points: number;
  value: number;
};

export type ClassAllocation = {
  payingClass: UpgradeClass;
  entries: AllocationEntry[];
  pointsSpent: number;
  crossClassPointsSpent: number;
  totalValue: number;
};

const NEG = Number.NEGATIVE_INFINITY;

/**
 * Exact DP over (points spent, cross-class points spent).
 * Returns the highest-value legal allocation.
 */
export function optimiseAllocation(
  payingClass: UpgradeClass,
  candidates: UpgradeCandidate[],
  poolPoints: number = POOL_POINTS,
  crossCap: number = CROSS_CLASS_CAP
): ClassAllocation {
  const W = poolPoints;
  const X = Math.min(crossCap, poolPoints);

  const size = (W + 1) * (X + 1);
  const at = (w: number, x: number) => w * (X + 1) + x;

  let best = new Float64Array(size).fill(NEG);
  best[at(0, 0)] = 0;

  // choice[item][state] = tier picked for that item to reach that state
  const choices: Int8Array[] = [];

  for (const cand of candidates) {
    const next = new Float64Array(size).fill(NEG);
    const choice = new Int8Array(size).fill(-1);

    for (let w = 0; w <= W; w++) {
      for (let x = 0; x <= X; x++) {
        const cur = best[at(w, x)];
        if (cur === NEG) continue;

        for (let tier = 0; tier <= MAX_TIER; tier++) {
          const cost = TIER_COST[tier];
          const nw = w + cost;
          if (nw > W) break;
          const nx = cand.crossClass ? x + cost : x;
          if (nx > X) break;

          const val = cur + cand.tierValue[tier];
          const idx = at(nw, nx);
          if (val > next[idx]) {
            next[idx] = val;
            choice[idx] = tier;
          }
        }
      }
    }

    choices.push(choice);
    best = next;
  }

  // Find the best reachable state.
  let bestW = 0;
  let bestX = 0;
  let bestVal = NEG;
  for (let w = 0; w <= W; w++) {
    for (let x = 0; x <= X; x++) {
      const v = best[at(w, x)];
      if (v > bestVal) {
        bestVal = v;
        bestW = w;
        bestX = x;
      }
    }
  }

  // Walk the choice tables backwards to recover the picks.
  const entries: AllocationEntry[] = [];
  let w = bestW;
  let x = bestX;

  for (let i = candidates.length - 1; i >= 0; i--) {
    const tier = choices[i][at(w, x)];
    if (tier === undefined || tier < 0) continue;
    const cand = candidates[i];
    const cost = TIER_COST[tier];

    if (tier > 0) {
      entries.push({
        name: cand.name,
        description: cand.description,
        sourceClass: cand.sourceClass,
        crossClass: cand.crossClass,
        tier,
        points: cost,
        value: cand.tierValue[tier],
      });
    }

    w -= cost;
    if (cand.crossClass) x -= cost;
  }

  entries.sort((a, b) => b.value - a.value);

  return {
    payingClass,
    entries,
    pointsSpent: entries.reduce((s, e) => s + e.points, 0),
    crossClassPointsSpent: entries
      .filter((e) => e.crossClass)
      .reduce((s, e) => s + e.points, 0),
    totalValue: bestVal === NEG ? 0 : bestVal,
  };
}

/** Convenience: build candidates and optimise in one call. */
export function recommendClassBuild(
  payingClass: UpgradeClass,
  bestiaryByClass: Record<UpgradeClass, BestiaryTrait[]>,
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey,
  opts?: { poolPoints?: number; crossCap?: number }
): ClassAllocation {
  const candidates = buildCandidates(
    payingClass,
    bestiaryByClass,
    selectedPets,
    playstyle
  );
  return optimiseAllocation(
    payingClass,
    candidates,
    opts?.poolPoints ?? POOL_POINTS,
    opts?.crossCap ?? CROSS_CLASS_CAP
  );
}
