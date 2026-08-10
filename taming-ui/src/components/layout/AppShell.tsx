// src/components/layout/AppShell.tsx
import React from "react";
import type { TameablePet } from "../../types/tameables";
import type { StatKey, ClassKey, UiPet } from "../../App";
import { PetStrip } from "../pets/PetStrip";
import { TamingScoreCard } from "../score/TamingScoreCard";
import { PlayStyleCard } from "../playstyle/PlayStyleCard";
import { QuickStatsCard } from "../stats/QuickStatsCard";
import { ClassTilesRow } from "../classes/ClassTilesRow";
import type { PlaystyleKey } from "../../logic/teamScoring";
import type { BestiarySets } from "../../logic/bestiary";
import type { ClassAllocation } from "../../logic/upgradeOptimizer";
import { CROSS_CLASS_CAP, POOL_POINTS } from "../../logic/upgradeRules";

type TeamStats = {
  score: number;
  survivability: number;
  damage: number;
  control: number;
  utility: number;
};

type Props = {
  pets: TameablePet[];
  selectedPet?: UiPet;
  teamStats: TeamStats;
  onSelectPet: (id: string) => void;
  onChangePlayStyle: (style: "ranged" | "melee" | "aoe") => void;
  onToggleAbilityPoint: (klass: ClassKey, abilityId: string) => void;
  allocations: ClassAllocation[];
  onAllocationsChange: (allocations: ClassAllocation[]) => void;
  pendingSave: boolean;
  onSave: () => void;
  onRemovePet: (id: string) => void;
  onClearTeam: () => void;
  onAddPet: () => void;
  playstyle: PlaystyleKey;
  bestiary: BestiarySets | null;
};

export const AppShell: React.FC<Props> = ({
  pets,
  selectedPet,
  teamStats,
  onSelectPet,
  onChangePlayStyle,
  allocations,
  onAllocationsChange,
  pendingSave,
  onSave,
  onRemovePet,
  onClearTeam,
  onAddPet,
  playstyle,
  bestiary
}) => {
  const statsOrder: StatKey[] = ["survivability", "damage", "control", "utility"];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          Ultima Outlands · Taming planner
        </div>

        <button
          type="button"
          className="chip"
          style={{ maxWidth: 130 }}
          onClick={onClearTeam}
        >
          Clear team
        </button>
      </header>

      <main className="app-content">
        <PetStrip
          pets={pets.slice(0, 5)}
          selectedId={selectedPet?.id}
          onSelect={onSelectPet}
          onRemovePet={onRemovePet}
          onAddPet={onAddPet}
        />

        {/* Middle area: 2 rows x 3 columns */}
        <section className="desktop-grid">
          {/* Row 1: team score, play style, quick stats */}
          <TamingScoreCard teamStats={teamStats} />

          <PlayStyleCard
            pet={selectedPet}
            onChangePlayStyle={onChangePlayStyle}
          />

          <QuickStatsCard pet={selectedPet} statsOrder={statsOrder} />

          {/* Row 2: three bestiary tiles (Attack/Tank/Utility) */}
          <ClassTilesRow
            selectedPets={pets}
            playstyle={playstyle}
            bestiary={bestiary}
            onAllocationsChange={onAllocationsChange}
          />
        </section>

        <section className="save-build-bar">
          <div className="points-summary">
            {allocations.map((a) => (
              <span key={a.payingClass} className="points-summary-item">
                {a.payingClass} {a.pointsSpent}/{POOL_POINTS}
                {a.crossClassPointsSpent > 0 &&
                  ` (${a.crossClassPointsSpent}/${CROSS_CLASS_CAP} cross)`}
              </span>
            ))}
          </div>

          <button
            className="save-build-button"
            disabled={!pendingSave}
            onClick={onSave}
          >
            {pendingSave ? "Save build" : "Build saved"}
          </button>
        </section>
      </main>
    </div>
  );
};
