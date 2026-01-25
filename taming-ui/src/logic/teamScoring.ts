// src/logic/teamScoring.ts
import type { TameablePet } from "../types/tameables";

export type PlaystyleKey = "aoe_far" | "single_target" | "balanced";

export function scoreTeam(
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey
): number {
  let score = 0;
  let slots = 0;
  const teamTags = new Set<string>();

  selectedPets.forEach((p) => {
    slots += p.slots || 0;
    (p.tags || []).forEach((t) => teamTags.add(t));
    score +=
      (p.underdogScalar || 1) *
      (((p.minDmg || 0) + (p.maxDmg || 0)) / 2);
  });

  if (slots > 5) score -= 50;

  if (playstyle === "aoe_far") {
    if (teamTags.has("aoe")) score += 40;
    if (
      teamTags.has("ranged_friendly") ||
      teamTags.has("spell")
    )
      score += 20;
  } else if (playstyle === "single_target") {
    if (teamTags.has("single_target") || teamTags.has("bleed"))
      score += 40;
  } else {
    if (teamTags.has("tank") && teamTags.has("attack"))
      score += 30;
  }

  return Math.round(score);
}
