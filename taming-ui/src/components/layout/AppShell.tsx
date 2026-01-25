// src/components/layout/AppShell.tsx
import React from "react";
import type { Pet, ClassKey, StatKey } from "../../App";
import { PetStrip } from "../pets/PetStrip";
import { TamingScoreCard } from "../score/TamingScoreCard";
import { PlayStyleCard } from "../playstyle/PlayStyleCard";
import { QuickStatsCard } from "../stats/QuickStatsCard";
import { ClassTilesRow } from "../classes/ClassTilesRow";

type Props = {
  pets: Pet[];
  selectedPet?: Pet;
  onSelectPet: (id: string) => void;
  onChangePlayStyle: (style: Pet["playStyle"]) => void;
  onToggleAbilityPoint: (klass: ClassKey, abilityId: string) => void;
  totalPoints: { total: number; attack: number; tank: number; utility: number };
  pendingSave: boolean;
  onSave: () => void;
  onRemovePet: (id: string) => void;
  onClearTeam: () => void;
  onAddPet: () => void;
};

export const AppShell: React.FC<Props> = ({
  pets,
  selectedPet,
  onSelectPet,
  onChangePlayStyle,
  onToggleAbilityPoint,
  totalPoints,
  pendingSave,
  onSave,
  onRemovePet,
  onClearTeam,
  onAddPet
}) => {
  const statsOrder: StatKey[] = ["survivability", "damage", "control", "utility"];

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-title">
          Ultima Outlands · Taming planner
        </div>

        {/* Clear team button in header */}
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

        <section className="desktop-grid">
          <TamingScoreCard pet={selectedPet} statsOrder={statsOrder} />
          <PlayStyleCard
            pet={selectedPet}
            onChangePlayStyle={onChangePlayStyle}
          />
          <QuickStatsCard pet={selectedPet} statsOrder={statsOrder} />
        </section>

        <section>
          <ClassTilesRow
            pet={selectedPet}
            onToggleAbilityPoint={onToggleAbilityPoint}
            totals={totalPoints}
          />
        </section>

        <section className="save-build-bar">
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
