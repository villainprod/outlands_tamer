// src/logic/upgradeRules.ts
//
// Per-upgrade metadata driving the optimizer.
//
// Game rules this file encodes (patch: cross-class upgrades):
//   * Each Class (Attack / Tank / Utility) has its own pool of Upgrade Points.
//   * Points spent in one class do NOT count against another class's pool.
//   * Every Upgrade has 3 Tiers. Tier step costs are 1, 2, 2 points.
//     Cumulative: Tier 1 = 1, Tier 2 = 3, Tier 3 = 5.
//   * Up to 5 points of a class's pool may be spent on Upgrades belonging to
//     OTHER classes ("Cross-Class selections"). Those upgrades then apply to
//     the paying class's creatures.

import type { TameablePet } from "../types/tameables";
import type { PlaystyleKey } from "./teamScoring";

export const POOL_POINTS = 20;
export const CROSS_CLASS_CAP = 5;

/** Cumulative point cost to reach a tier. Index = tier (0..3). */
export const TIER_COST = [0, 1, 3, 5] as const;
/** Incremental cost of each tier step, for display/validation. */
export const TIER_STEP_COST = [1, 2, 2] as const;

export const MAX_TIER = 3;

export type UpgradeClass = "Attack" | "Tank" | "Utility";

export type TeamContext = {
  pets: TameablePet[];
  playstyle: PlaystyleKey;
  /** Total control slots across the whole team. */
  totalSlots: number;
  /** Number of followers on the team. */
  followerCount: number;
  /** Number of distinct creature names on the team. */
  distinctTypes: number;
  /** Control slots worth of Utility creatures that can inflict poison/disease. */
  toxicUtilitySlots: number;
  /** True if any creature on the team can apply poison or disease. */
  teamHasPoisonOrDisease: boolean;
  /** True if the team fields at least one Tank creature. */
  teamHasTank: boolean;
  /** True if the team fields at least one non-Tank follower. */
  teamHasNonTank: boolean;
};

/** How the upgrade's payoff is categorised, for playstyle weighting. */
export type Role = "damage" | "defense" | "support" | "sustain";

export type UpgradeMeta = {
  /**
   * Multiplier converting the upgrade's parsed primary magnitude into a common
   * "effective power" unit, roughly comparable to +1% damage.
   * e.g. a 30% chance at a 100% damage bonus is worth ~30 power, scale 1.0;
   * a 30% chance to ignore a debuff tick is worth much less, scale ~0.35.
   */
  scale: number;
  role: Role;
  /**
   * Probability (0..1) that this creature satisfies the upgrade's condition.
   * When the condition fails the creature instead receives the flat fallback
   * bonus (usually 4% / 8% / 12% damage).
   */
  condition: (pet: TameablePet, ctx: TeamContext) => number;
  /** Multiply the primary magnitude by a team-derived count. */
  scalesWith?: (ctx: TeamContext, pet: TameablePet) => number;
  /** Per-playstyle multiplier on the whole upgrade. */
  playstyle?: Partial<Record<PlaystyleKey, number>>;
  /**
   * Penalty applied when this upgrade is taken cross-class, for upgrades whose
   * text intrinsically references their own class's creatures.
   */
  crossClassFactor?: number;
  /** Override fallback detection (default: parsed from the description). */
  hasFallback?: boolean;
};

// ---------------------------------------------------------------------------
// Ability text helpers
// ---------------------------------------------------------------------------

function abilityText(pet: TameablePet): string {
  return `${pet.cooldownAbility ?? ""} ${pet.passiveAbility ?? ""} ${
    pet.innateAbility ?? ""
  }`.toLowerCase();
}

const has = (pet: TameablePet, ...needles: string[]): boolean => {
  const t = abilityText(pet);
  return needles.some((n) => t.includes(n.toLowerCase()));
};

const canPoison = (pet: TameablePet): boolean =>
  Boolean(pet.poison && pet.poison.trim().length > 0) ||
  Boolean(pet.poisoning && pet.poisoning > 0) ||
  has(pet, "poison", "venom");

const canDisease = (pet: TameablePet): boolean =>
  has(pet, "disease", "plague", "rot", "pestilence");

const canBleed = (pet: TameablePet): boolean =>
  has(pet, "bleed", "rend", "lacerate", "gore");

const canChill = (pet: TameablePet): boolean =>
  has(pet, "chill", "frost", "ice", "freeze");

const hasStealth = (pet: TameablePet): boolean =>
  Boolean(pet.stealth && pet.stealth.trim().length > 0) || has(pet, "stealth");

const hasCooldown = (pet: TameablePet): boolean =>
  Boolean(pet.cooldownAbility && pet.cooldownAbility.trim().length > 0);

const hasPassive = (pet: TameablePet): boolean =>
  Boolean(pet.passiveAbility && pet.passiveAbility.trim().length > 0);

const isMelee = (pet: TameablePet): boolean =>
  (pet.combat || "").toLowerCase() === "melee";

const bool = (b: boolean): number => (b ? 1 : 0);

// Positional / temporal conditions can't be known statically. These are
// uptime estimates, kept in one place so they're easy to retune per patch.
const UPTIME = {
  /** "has taken damage in the last 10s" — near-constant in sustained fights. */
  recentlyDamaged: 0.85,
  /** "above 75% Health" — most of a fight for a healthy tank. */
  aboveThreeQuarters: 0.65,
  /** Tamer and creature both within 1 tile of target. */
  stackedMelee: 0.6,
  stackedRanged: 0.15,
  /** Target 4+ tiles away. */
  farMelee: 0.15,
  farRanged: 0.75,
  /** Enemies aggroed within 2 tiles. */
  aggroAdjacent: 0.7,
  /** Resurrection actually mattering in a given fight. */
  resurrection: 0.25,
} as const;

// ---------------------------------------------------------------------------
// Upgrade metadata, keyed by upgrade name (must match the CSV "Ability Name")
// ---------------------------------------------------------------------------

const always = () => 1;

export const UPGRADE_META: Record<string, UpgradeMeta> = {
  // ---- Attack -------------------------------------------------------------
  Ambush: {
    scale: 1.0,
    role: "damage",
    condition: (p) => bool(hasStealth(p)),
  },
  Cornered: {
    scale: 1.0,
    role: "damage",
    condition: () => UPTIME.recentlyDamaged,
  },
  Feed: {
    scale: 0.45, // chance at a 10% max-health heal, capped once per 15s
    role: "sustain",
    condition: (p) => bool(canBleed(p)),
  },
  Feral: {
    scale: 0.28, // huge multiplier, but only one attack every 15s
    role: "damage",
    condition: (p) => bool(has(p, "frenzy", "frenzied", "enrage", "enraged")),
  },
  "Hunting Party": {
    scale: 1.0,
    role: "damage",
    condition: (p) => (isMelee(p) ? UPTIME.stackedMelee : UPTIME.stackedRanged),
    playstyle: { single_target: 1.1, aoe_far: 0.8 },
  },
  Immolate: {
    scale: 0.5, // boosts two specific abilities, not all damage
    role: "damage",
    condition: (p) => bool(has(p, "flamestrike", "spellburn")),
  },
  Lethality: {
    scale: 1.0, // 30% chance of +100% damage ≈ +30% damage
    role: "damage",
    condition: always,
  },
  Menagerie: {
    scale: 1.0,
    role: "damage",
    condition: always,
    scalesWith: (ctx) => ctx.distinctTypes,
  },
  Mutation: {
    scale: 2.2, // 6s off cooldowns is strong for cooldown-heavy creatures
    role: "damage",
    condition: (p) => bool(hasCooldown(p)),
  },
  Pelt: {
    scale: 1.0,
    role: "damage",
    condition: (p) => (isMelee(p) ? UPTIME.farMelee : UPTIME.farRanged),
    playstyle: { aoe_far: 1.2, single_target: 0.85 },
  },
  Primal: {
    scale: 0.4, // more passive procs, value depends on the passive
    role: "damage",
    condition: (p) => bool(hasPassive(p)),
  },
  Swarm: {
    scale: 1.0,
    role: "damage",
    condition: always,
    scalesWith: (ctx) => ctx.followerCount,
  },

  // ---- Tank ---------------------------------------------------------------
  Adrenaline: {
    scale: 0.8, // death save; enormous when it fires, rare per fight
    role: "defense",
    condition: always,
    hasFallback: false,
  },
  Aggression: {
    scale: 1.8, // stacks up to 3 targets
    role: "damage",
    condition: (p) => (isMelee(p) ? UPTIME.aggroAdjacent : 0.2),
    playstyle: { aoe_far: 1.15 },
  },
  Behemoth: {
    scale: 1.0,
    role: "damage",
    condition: (p) => bool((p.slots || 0) >= 3),
  },
  "Critical Care": {
    scale: 0.35,
    role: "sustain",
    condition: () => UPTIME.resurrection,
    hasFallback: false,
  },
  Deflection: {
    scale: 1.1, // party-wide mitigation, scales with control slots
    role: "defense",
    condition: (_p, ctx) => bool(ctx.teamHasNonTank),
    scalesWith: (_ctx, p) => p.slots || 1,
    crossClassFactor: 0.45, // text keys off Tank followers
    hasFallback: false,
  },
  Guardian: {
    scale: 1.0,
    role: "defense",
    condition: (_p, ctx) => bool(ctx.teamHasNonTank && ctx.teamHasTank),
    scalesWith: (_ctx, p) => p.slots || 1,
    crossClassFactor: 0.4, // redirects onto Tank Class followers specifically
    hasFallback: false,
  },
  Hearty: {
    scale: 1.0,
    role: "damage",
    condition: () => UPTIME.aboveThreeQuarters,
  },
  Mending: {
    scale: 0.7,
    role: "sustain",
    condition: always,
  },
  Stalwart: {
    scale: 1.3, // flat mitigation plus broad debuff immunity
    role: "defense",
    condition: always,
    hasFallback: false,
  },
  Survival: {
    scale: 1.4, // unconditional flat damage resistance
    role: "defense",
    condition: always,
    hasFallback: false,
  },
  Tolerance: {
    scale: 0.5,
    role: "defense",
    condition: always,
  },
  Trample: {
    scale: 0.9, // cleave onto 2 extra targets
    role: "damage",
    condition: (p) => bool(isMelee(p)),
    playstyle: { aoe_far: 1.5, single_target: 0.5 },
    hasFallback: false,
  },

  // ---- Utility ------------------------------------------------------------
  "Beast Sting": {
    scale: 1.0,
    role: "damage",
    condition: (p, ctx) =>
      bool(ctx.teamHasPoisonOrDisease && (canPoison(p) || canDisease(p))),
  },
  Breaker: {
    scale: 0.75, // armour/resist penetration, roughly sub-linear on damage
    role: "damage",
    condition: always,
    hasFallback: false,
  },
  Carrion: {
    scale: 0.5,
    role: "sustain",
    condition: (p) => bool(canDisease(p)),
  },
  Contagion: {
    scale: 0.45, // only boosts the disease DoT component
    role: "damage",
    condition: (p) => bool(canDisease(p)),
  },
  Debilitate: {
    scale: 1.0,
    role: "defense",
    condition: (_p, ctx) => bool(ctx.teamHasPoisonOrDisease),
    scalesWith: (ctx) => ctx.toxicUtilitySlots,
    crossClassFactor: 0.5, // counts Utility-class slots specifically
  },
  Frostbite: {
    scale: 0.6,
    role: "damage",
    condition: (p) => bool(canChill(p)),
  },
  Metabolism: {
    scale: 1.6, // small per-hit heal, but every successful melee attack
    role: "sustain",
    condition: (p) => bool(isMelee(p)),
  },
  Opportunity: {
    scale: 1.0,
    role: "damage",
    condition: (p) => bool(has(p, "entangle", "hinder", "web", "root")),
  },
  Punishment: {
    scale: 12, // parsed magnitude is a DamageMax multiplier, not a percent
    role: "damage",
    condition: (p) => bool(has(p, "pierce", "hex")),
  },
  Scour: {
    scale: 0.9, // buffs the Tamer rather than the creature
    role: "damage",
    condition: (p) => bool(has(p, "weaken", "cripple")),
    scalesWith: (_ctx, p) => p.slots || 1,
  },
  Swoop: {
    scale: 0.35, // one boosted hit per cooldown use
    role: "damage",
    condition: (p) => bool(hasCooldown(p)),
  },
  Toxic: {
    scale: 1.0,
    role: "damage",
    condition: (_p, ctx) => bool(ctx.teamHasPoisonOrDisease),
    scalesWith: (ctx) => ctx.toxicUtilitySlots,
    crossClassFactor: 0.5,
  },
};

/** Fallback metadata for an upgrade the table doesn't know about yet. */
export const DEFAULT_META: UpgradeMeta = {
  scale: 0.8,
  role: "damage",
  condition: () => 0.5,
};

// ---------------------------------------------------------------------------
// Role weighting
// ---------------------------------------------------------------------------

export function roleWeight(role: Role, ctx: TeamContext): number {
  const base: Record<Role, number> = {
    damage: 1.0,
    defense: 0.85,
    support: 0.8,
    sustain: 0.7,
  };

  let w = base[role];

  // A team with no tank leans harder on raw damage; a tanky team can convert
  // extra mitigation into uptime.
  if (role === "defense" && ctx.teamHasTank) w *= 1.15;
  if (role === "defense" && !ctx.teamHasTank) w *= 0.9;

  if (ctx.playstyle === "single_target" && role === "damage") w *= 1.05;
  if (ctx.playstyle === "aoe_far" && role === "damage") w *= 1.02;

  return w;
}

// ---------------------------------------------------------------------------
// Team context
// ---------------------------------------------------------------------------

export function buildTeamContext(
  pets: TameablePet[],
  playstyle: PlaystyleKey
): TeamContext {
  const totalSlots = pets.reduce((s, p) => s + (p.slots || 0), 0);
  const distinctTypes = new Set(pets.map((p) => p.name)).size;

  const toxicUtilitySlots = pets
    .filter((p) => p.class === "Utility" && (canPoison(p) || canDisease(p)))
    .reduce((s, p) => s + (p.slots || 0), 0);

  return {
    pets,
    playstyle,
    totalSlots,
    followerCount: pets.length,
    distinctTypes,
    toxicUtilitySlots,
    teamHasPoisonOrDisease: pets.some((p) => canPoison(p) || canDisease(p)),
    teamHasTank: pets.some((p) => p.class === "Tank"),
    teamHasNonTank: pets.some((p) => p.class !== "Tank"),
  };
}
