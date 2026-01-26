// src/logic/bestiary.ts

// Shared trait shape for Attack / Tank / Utility bestiaries
export type BestiaryTrait = {
  name: string;
  description: string;
  // Free-form tags like "damage_buff", "bleed_synergy", etc.
  tags: string[];
  // Optional structured conditions from your old logic
  conditions?: {
    minFollowers?: number;
    minSlots?: number;
    preferredRange?: "melee" | "ranged";
    requiresPoisonOrDisease?: boolean;
    requiresChill?: boolean;
  };
};

// How many points a trait should get in a 20‑point allocation
export function recommendRank(score: number): number {
  if (score >= 60) return 5;
  if (score >= 45) return 4;
  if (score >= 30) return 3;
  if (score >= 18) return 2;
  if (score >= 8) return 1;
  return 0;
}

export type ScoredTrait = {
  trait: BestiaryTrait;
  score: number;
  rank: number;
};

// Build a 20‑point allocation for a scored trait list
export function buildTwentyPointAllocation(
  scoredTraits: ScoredTrait[]
): { name: string; description: string; points: number }[] {
  const allocation: {
    name: string;
    description: string;
    points: number;
  }[] = [];
  let total = 0;

  const ranked = scoredTraits.map((s) => {
    const rank = recommendRank(s.score);
    return { ...s, rank };
  });

  ranked.sort((a, b) => b.score - a.score);

  // Helper: map rank to allowed tier points
  const tierPointsForRank = (rank: number): number => {
    // Adjust this mapping if your rank scale is different,
    // but keep outputs restricted to 1, 3, or 6.
    if (rank >= 3) return 6;   // highest ranks → Tier 3
    if (rank === 2) return 3;  // mid ranks → Tier 2
    if (rank === 1) return 1;  // low ranks → Tier 1
    return 0;
  };

  for (const s of ranked) {
    if (total >= 20) break;
    const remaining = 20 - total;

    let points = tierPointsForRank(s.rank);
    if (points <= 0) continue;

    // If we don't have enough budget for this full tier, skip it
    // so we never create illegal point values like 2 or 4.
    if (points > remaining) continue;

    allocation.push({
      name: s.trait.name,
      description: s.trait.description || "",
      points
    });
    total += points;
  }

  return allocation;
}


// ------------------------------------------------------------------
// CSV loading for attackClass.csv, tankClass.csv, utilityClass.csv
// ------------------------------------------------------------------

function parseSimpleBestiaryCsv(csvText: string): BestiaryTrait[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 2) return [];

  // first two rows are headers in your files
  const rows = lines.slice(2);

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const firstComma = line.indexOf(",");
      if (firstComma === -1) {
        return {
          name: line.trim(),
          description: "",
          tags: [],
          conditions: {}
        } as BestiaryTrait;
      }

      const name = line.slice(0, firstComma).trim();
      let desc = line.slice(firstComma + 1).trim();

      if (desc.startsWith("\"") && desc.endsWith("\"")) {
        desc = desc.slice(1, -1);
      }

      const tags: string[] = [];
      const lower = desc.toLowerCase();

      if (lower.includes("damage")) tags.push("damage_buff");
      if (lower.includes("healing")) tags.push("healing_buff");
      if (lower.includes("bleed")) tags.push("bleed_synergy");
      if (lower.includes("poison") || lower.includes("disease"))
        tags.push("poison_synergy");
      if (lower.includes("chill")) tags.push("chill_synergy");
      if (lower.includes("tank")) tags.push("tank_synergy");
      if (lower.includes("ranged")) tags.push("ranged_friendly");
      if (lower.includes("melee")) tags.push("melee_friendly");

      const conditions: BestiaryTrait["conditions"] = {};

      if (lower.includes("control slots")) {
        conditions.minSlots = 3;
      }
      if (lower.includes("followers")) {
        conditions.minFollowers = 2;
      }
      if (lower.includes("preferredrange: ranged")) {
        conditions.preferredRange = "ranged";
      }
      if (lower.includes("preferredrange: melee")) {
        conditions.preferredRange = "melee";
      }

      return {
        name,
        description: desc,
        tags,
        conditions
      };
    });
}

// Hold loaded bestiary data in memory
export type BestiarySets = {
  attack: BestiaryTrait[];
  tank: BestiaryTrait[];
  utility: BestiaryTrait[];
};

// Load all three bestiary CSVs from /public
function sanitizeCsvResponse(txt: string): string {
  const trimmed = txt.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    // dev server returned index.html instead of the CSV
    return "";
  }
  return txt;
}


export async function loadBestiarySets(): Promise<BestiarySets> {
  const [attackRes, tankRes, utilityRes] = await Promise.all([
    fetch("/attackClass.csv"),
    fetch("/tankClass.csv"),
    fetch("/utilityClass.csv")
  ]);

  const [attackTextRaw, tankTextRaw, utilityTextRaw] = await Promise.all([
    attackRes.text(),
    tankRes.text(),
    utilityRes.text()
  ]);

  const attackText = sanitizeCsvResponse(attackTextRaw);
  const tankText = sanitizeCsvResponse(tankTextRaw);
  const utilityText = sanitizeCsvResponse(utilityTextRaw);

  return {
    attack: parseSimpleBestiaryCsv(attackText),
    tank: parseSimpleBestiaryCsv(tankText),
    utility: parseSimpleBestiaryCsv(utilityText)
  };
}

import type { TameablePet } from "../types/tameables";
import type { PlaystyleKey } from "./teamScoring";

// Helpers to build team tag set
function collectTeamTags(pets: TameablePet[]): {
  tags: Set<string>;
  followers: number;
  tankSlots: number;
} {
  const tags = new Set<string>();
  let followers = pets.length;
  let tankSlots = 0;

  pets.forEach((p) => {
    (p.tags || []).forEach((t) => tags.add(t));
    if (p.class === "Tank") tankSlots += p.slots || 0;
  });

  return { tags, followers, tankSlots };
}

// Generic scoring for a trait given team & playstyle,
// using tags + conditions. This mirrors your old rules
// in a data-driven way.
function scoreTraitForTeam(
  trait: BestiaryTrait,
  playstyle: PlaystyleKey,
  teamTags: Set<string>,
  followers: number,
  tankSlots: number
): number {
  let s = 0;
  const tags = trait.tags || [];
  const c = trait.conditions || {};

  // Generic buffs
  if (tags.includes("damage_buff")) s += 10;
  if (tags.includes("healing_buff")) s += 5;

  // Synergies
  if (tags.includes("bleed_synergy") && teamTags.has("bleed")) s += 25;
  if (tags.includes("poison_synergy") && teamTags.has("poison")) s += 15;
  if (tags.includes("chill_synergy") && teamTags.has("chill")) s += 12;
  if (tags.includes("tank_synergy") && teamTags.has("tank")) s += 10;

  // Followers & slots
  if (
    tags.includes("follower_count_scaling") &&
    followers >= (c.minFollowers || 2)
  )
    s += 20;
  if (
    tags.includes("big_pet_synergy") &&
    tankSlots >= (c.minSlots || 3)
  )
    s += 8;
  if (followers >= (c.minFollowers || 0)) s += 2;

  // Playstyle interaction
  if (playstyle === "aoe_far") {
    if (tags.includes("ranged_friendly")) s += 20;
    if (teamTags.has("aoe")) s += 15;
    if (c.preferredRange === "ranged") s += 8;
  } else if (playstyle === "single_target") {
    if (tags.includes("single_target_synergy")) s += 15;
    if (c.preferredRange === "melee") s += 5;
  } else {
    if (tags.includes("tank_synergy") && teamTags.has("tank")) s += 10;
    if (c.preferredRange === "melee") s += 5;
  }

  return s;
}

// Attack bestiary recommendations

export function recommendBestiaryAttack(
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey,
  attackTraits: BestiaryTrait[]
): ScoredTrait[] {
  const { tags: teamTags, followers, tankSlots } =
    collectTeamTags(selectedPets);

  const scored = attackTraits.map((trait) => {
    let s = 0;
    const tTags = trait.tags || [];
    const c = trait.conditions || {};

    // Core role: raw damage first
    if (tTags.includes("damage_buff")) s += 30;
    if (tTags.includes("single_target_synergy")) s += 10;
    if (tTags.includes("aoe_synergy")) s += 10;

    // Bleed / poison / chill synergies
    if (tTags.includes("bleed_synergy") && teamTags.has("bleed")) s += 25;
    if (tTags.includes("poison_synergy") && teamTags.has("poison")) s += 15;
    if (tTags.includes("chill_synergy") && teamTags.has("chill")) s += 12;

    // Followers / big‑pet stuff
    if (followers >= (c.minFollowers || 0)) s += 4;
    if (tTags.includes("big_pet_synergy") && tankSlots >= (c.minSlots || 3))
      s += 6;

    // Playstyle weighting
    if (playstyle === "aoe_far") {
      if (tTags.includes("ranged_friendly")) s += 18;
      if (tTags.includes("aoe_synergy")) s += 12;
    } else if (playstyle === "single_target") {
      if (tTags.includes("single_target_synergy")) s += 15;
      if (c.preferredRange === "melee") s += 6;
    } else {
      // balanced
      if (tTags.includes("damage_buff")) s += 5;
    }

    // Generic team fit
    s += scoreTraitForTeam(trait, playstyle, teamTags, followers, tankSlots);

    const rank = recommendRank(s);
    return { trait, score: s, rank };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function recommendBestiaryTank(
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey,
  tankTraits: BestiaryTrait[]
): ScoredTrait[] {
  const { tags: teamTags, followers, tankSlots } =
    collectTeamTags(selectedPets);

  const scored = tankTraits.map((trait) => {
    let s = 0;
    const tTags = trait.tags || [];
    const c = trait.conditions || {};

    // Core role: survivability / mitigation first
    if (tTags.includes("defense_buff")) s += 30;
    if (tTags.includes("damage_redirect")) s += 20;
    if (tTags.includes("party_shield")) s += 15;
    if (tTags.includes("debuff_resist")) s += 12;

    // Big‑tank scaling
    if (tTags.includes("big_pet_synergy") && tankSlots >= (c.minSlots || 3))
      s += 15;

    // Team has actual tanks
    if (teamTags.has("tank")) s += 8;

    // Playstyle: melee / front‑line teams want sturdier tanks
    if (playstyle === "single_target") s += 8;
    if (playstyle === "balanced") s += 4;

    s += scoreTraitForTeam(trait, playstyle, teamTags, followers, tankSlots);

    const rank = recommendRank(s);
    return { trait, score: s, rank };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}

export function recommendBestiaryUtility(
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey,
  utilityTraits: BestiaryTrait[]
): ScoredTrait[] {
  const { tags: teamTags, followers, tankSlots } =
    collectTeamTags(selectedPets);

  const scored = utilityTraits.map((trait) => {
    let s = 0;
    const tTags = trait.tags || [];
    const c = trait.conditions || {};

    // Core role: support / sustain / enabling synergies
    if (tTags.includes("healing_buff")) s += 18;
    if (tTags.includes("tamer_damage_buff")) s += 18;
    if (tTags.includes("lifesteal")) s += 10;

    // Condition‑based synergies
    if (tTags.includes("poison_synergy") && teamTags.has("poison"))
      s += 18;
    if (tTags.includes("chill_synergy") && teamTags.has("chill"))
      s += 15;
    if (tTags.includes("bleed_synergy") && teamTags.has("bleed"))
      s += 12;

    // Followers scaling (utility books often scale off team size)
    if (followers >= (c.minFollowers || 0)) s += 6;

    // Playstyle: ranged / aoe teams love extra control / debuffs
    if (playstyle === "aoe_far") {
      if (tTags.includes("ranged_friendly")) s += 10;
      if (tTags.includes("aoe_synergy")) s += 8;
    }

    s += scoreTraitForTeam(trait, playstyle, teamTags, followers, tankSlots);

    const rank = recommendRank(s);
    return { trait, score: s, rank };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
}
