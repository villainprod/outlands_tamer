// src/components/classes/ClassTilesRow.tsx
import React from "react";
import type { TameablePet } from "../../types/tameables";
import type { PlaystyleKey } from "../../logic/teamScoring";
import {
  type BestiarySets,
  type ScoredTrait,
  buildTwentyPointAllocation,
  recommendBestiaryAttack,
  recommendBestiaryTank,
  recommendBestiaryUtility
} from "../../logic/bestiary";

type Props = {
  selectedPets: TameablePet[];
  playstyle: PlaystyleKey;
  bestiary: BestiarySets | null;
};

type ClassKey = "Attack" | "Tank" | "Utility";

const classLabels: Record<ClassKey, string> = {
  Attack: "Attack Bestiary",
  Tank: "Tank Bestiary",
  Utility: "Utility Bestiary"
};

function hasClassOnTeam(selectedPets: TameablePet[], className: ClassKey): boolean {
  return selectedPets.some((p) => p.class === className);
}

function computeScoredTraits(
  className: ClassKey,
  selectedPets: TameablePet[],
  playstyle: PlaystyleKey,
  bestiary: BestiarySets | null
): ScoredTrait[] {
  if (!bestiary) return [];

  if (className === "Attack") {
    return recommendBestiaryAttack(selectedPets, playstyle, bestiary.attack);
  }
  if (className === "Tank") {
    return recommendBestiaryTank(selectedPets, playstyle, bestiary.tank);
  }
  return recommendBestiaryUtility(selectedPets, playstyle, bestiary.utility);
}

function TraitPointsList({ scored }: { scored: ScoredTrait[] }) {
  // First pass: base allocation from scores/ranks
  let allocation = buildTwentyPointAllocation(scored);

  // If we didn't hit 20 yet but have traits, top off by adding points
  const totalUsed = allocation.reduce((sum, a) => sum + a.points, 0);
  const maxBudget = 20;

  if (allocation.length && totalUsed < maxBudget) {
    // Work with a copy so we can tweak in place
    const byName = new Map(allocation.map(a => [a.name, { ...a }]));

    // Sort original scored list best‑first so we always top off the strongest traits
    const sorted = [...scored].sort((a, b) => b.score - a.score);

    let remaining = maxBudget - totalUsed;

    // Helper: given current points, how many points to add for next tier step
    const nextTierIncrement = (currentPoints: number): number => {
      if (currentPoints <= 0) return 1; // to 1 (Tier 1)
      if (currentPoints === 1) return 2; // to 3 (Tier 2)
      if (currentPoints === 3) return 3; // to 6 (Tier 3)
      return 0; // already at 6 or unexpected value
    };

    for (const s of sorted) {
      if (remaining <= 0) break;

      const current = byName.get(s.trait.name) || {
        name: s.trait.name,
        description: s.trait.description || "",
        points: 0
      };

      const increment = nextTierIncrement(current.points);
      if (increment > 0 && increment <= remaining) {
        current.points += increment;
        remaining -= increment;
        byName.set(s.trait.name, current);
      }
    }

    allocation = Array.from(byName.values());
  }

  if (!allocation.length) {
    return (
      <p className="bestiary-body">
        No standout traits yet for this team.
      </p>
    );
  }

  const pointsToTier = (pts: number): number => {
    if (pts >= 6) return 3;
    if (pts >= 3) return 2;
    if (pts >= 1) return 1;
    return 0;
  };

  return (
    <ul className="space-y-1">
      {allocation.map((entry) => {
        const tier = pointsToTier(entry.points);

        return (
          <li key={entry.name} className="flex items-center justify-between">
            <div className="text-xs font-semibold">
              {entry.name} - T{tier}: {entry.points} pts
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export const ClassTilesRow: React.FC<Props> = ({
  selectedPets,
  playstyle,
  bestiary
}) => {
  const classes: ClassKey[] = ["Attack", "Tank", "Utility"];

  // IMPORTANT: this component is rendered inside the 3‑column .desktop-grid
  // in AppShell, so we return three sibling cards, one per column.
  return (
    <>
      {classes.map((className) => {
        const enabled = hasClassOnTeam(selectedPets, className);
        const scoredTraits = enabled
          ? computeScoredTraits(className, selectedPets, playstyle, bestiary)
          : [];

        return (
          <div
            key={className}
            className={`bestiary-card ${enabled ? "" : "bestiary-card--disabled"}`}
          >
            <div className="bestiary-header">
              <h3>{classLabels[className]}</h3>
            </div>

            {enabled ? (
              <TraitPointsList scored={scoredTraits} />
            ) : (
              <p className="bestiary-body">
                {className === "Attack" &&
                  "No standout traits yet for this team."}
                {className === "Tank" &&
                  "No tank pets on team. Add at least one tank pet to see traits."}
                {className === "Utility" &&
                  "No standout traits yet for this team."}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
};
