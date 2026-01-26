// src/components/layout/AppShell.tsx
import React from "react";
import type { StatKey } from "../../App";
import type { TameablePet } from "../../types/tameables";
import type { ClassKey } from "../../App";
import { PetStrip } from "../pets/PetStrip";
import { TamingScoreCard } from "../score/TamingScoreCard";
import { PlayStyleCard } from "../playstyle/PlayStyleCard";
import { QuickStatsCard } from "../stats/QuickStatsCard";
import { ClassTilesRow } from "../classes/ClassTilesRow";
import type { PlaystyleKey } from "../../logic/teamScoring";
import type { BestiarySets } from "../../logic/bestiary";

type TeamStats = {
  score: number;
  survivability: number;
  damage: number;
  control: number;
  utility: number;
};

type UiPet = TameablePet & {
  stats: Record<StatKey, number>;
  tamingScore: number;
};

type Props = {
  pets: TameablePet[];
  selectedPet?: UiPet;
  teamStats: TeamStats;
  onSelectPet: (id: string) => void;
  onChangePlayStyle: (style: "ranged" | "melee" | "aoe") => void;
  onToggleAbilityPoint: (klass: ClassKey, abilityId: string) => void;
  totalPoints: { total: number; attack: number; tank: number; utility: number };
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
  onToggleAbilityPoint,
  totalPoints,
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
          />
        </section>

        <section className="save-build-bar">
          <div className="points-summary">
            Points: {totalPoints.total} total · Attack {totalPoints.attack} · Tank{" "}
            {totalPoints.tank} · Utility {totalPoints.utility}
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
