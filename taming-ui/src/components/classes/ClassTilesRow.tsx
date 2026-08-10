// src/components/classes/ClassTilesRow.tsx
import React, { useMemo } from "react";
import type { TameablePet } from "../../types/tameables";
import type { PlaystyleKey } from "../../logic/teamScoring";
import { bestiaryByClass, type BestiarySets } from "../../logic/bestiary";
import {
  recommendClassBuild,
  type ClassAllocation,
} from "../../logic/upgradeOptimizer";
import {
  CROSS_CLASS_CAP,
  POOL_POINTS,
  type UpgradeClass,
} from "../../logic/upgradeRules";

type Props = {
  selectedPets: TameablePet[];
  playstyle: PlaystyleKey;
  bestiary: BestiarySets | null;
  onAllocationsChange?: (allocations: ClassAllocation[]) => void;
};

const CLASSES: UpgradeClass[] = ["Attack", "Tank", "Utility"];

const CLASS_LABELS: Record<UpgradeClass, string> = {
  Attack: "Attack Class Upgrades",
  Tank: "Tank Class Upgrades",
  Utility: "Utility Class Upgrades",
};

const EMPTY_MESSAGE: Record<UpgradeClass, string> = {
  Attack: "No Attack creatures on team. Add one to see recommended upgrades.",
  Tank: "No Tank creatures on team. Add one to see recommended upgrades.",
  Utility: "No Utility creatures on team. Add one to see recommended upgrades.",
};

function AllocationList({ allocation }: { allocation: ClassAllocation }) {
  if (!allocation.entries.length) {
    return (
      <p className="bestiary-body">No standout upgrades yet for this team.</p>
    );
  }

  return (
    <ul className="upgrade-list">
      {allocation.entries.map((entry) => (
        <li
          key={`${entry.sourceClass}-${entry.name}`}
          className={`upgrade-row${entry.crossClass ? " upgrade-row--cross" : ""}`}
          title={entry.description}
        >
          <span className="upgrade-name">
            {entry.name}
            {entry.crossClass && (
              <span className="upgrade-cross-badge">
                {entry.sourceClass.slice(0, 1)}
              </span>
            )}
          </span>
          <span className="upgrade-tier">
            T{entry.tier} · {entry.points} pt{entry.points === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ul>
  );
}

export const ClassTilesRow: React.FC<Props> = ({
  selectedPets,
  playstyle,
  bestiary,
  onAllocationsChange,
}) => {
  const byClass = useMemo(() => bestiaryByClass(bestiary), [bestiary]);

  const allocations = useMemo(() => {
    return CLASSES.map((klass) => {
      const hasClass = selectedPets.some((p) => p.class === klass);
      if (!hasClass || !bestiary) {
        return {
          payingClass: klass,
          entries: [],
          pointsSpent: 0,
          crossClassPointsSpent: 0,
          totalValue: 0,
        } as ClassAllocation;
      }
      return recommendClassBuild(klass, byClass, selectedPets, playstyle);
    });
  }, [byClass, bestiary, selectedPets, playstyle]);

  React.useEffect(() => {
    onAllocationsChange?.(allocations);
  }, [allocations, onAllocationsChange]);

  // Rendered inside the 3-column .desktop-grid in AppShell, so we return three
  // sibling cards, one per column.
  return (
    <>
      {allocations.map((allocation) => {
        const klass = allocation.payingClass;
        const enabled = selectedPets.some((p) => p.class === klass);

        return (
          <div
            key={klass}
            className={`bestiary-card ${enabled ? "" : "bestiary-card--disabled"}`}
          >
            <div className="bestiary-header">
              <h3>{CLASS_LABELS[klass]}</h3>
              {enabled && (
                <span className="bestiary-budget">
                  {allocation.pointsSpent}/{POOL_POINTS} pts
                  {allocation.crossClassPointsSpent > 0 && (
                    <>
                      {" · "}
                      <span className="bestiary-budget--cross">
                        {allocation.crossClassPointsSpent}/{CROSS_CLASS_CAP}{" "}
                        cross
                      </span>
                    </>
                  )}
                </span>
              )}
            </div>

            {enabled ? (
              <AllocationList allocation={allocation} />
            ) : (
              <p className="bestiary-body">{EMPTY_MESSAGE[klass]}</p>
            )}
          </div>
        );
      })}
    </>
  );
};
