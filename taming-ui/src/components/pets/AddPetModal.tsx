// src/components/pets/AddPetModal.tsx
import React, { useMemo } from "react";
import type { Pet } from "../../App";

type Props = {
  open: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  allPets: Pet[];
  currentTeamIds: string[];
  onClose: () => void;
  onAddPet: (id: string) => void;
};

export const AddPetModal: React.FC<Props> = ({
  open,
  search,
  onSearchChange,
  allPets,
  currentTeamIds,
  onClose,
  onAddPet
}) => {
  if (!open) return null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = allPets.filter((p) => !currentTeamIds.includes(p.id));
    if (term) {
      list = list.filter((p) => p.name.toLowerCase().includes(term));
    }
    return list.slice(0, 50); // basic cap for now
  }, [allPets, currentTeamIds, search]);

  return (
    <div className="add-pet-backdrop" onClick={onClose}>
      <div
        className="add-pet-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-pet-title"
      >
        <div className="add-pet-header">
          <h2 id="add-pet-title">Add pet to team</h2>
          <button
            type="button"
            className="add-pet-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="add-pet-search">
          <input
            type="text"
            placeholder="Search pets by name…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="add-pet-list">
          {filtered.length === 0 && (
            <div className="add-pet-empty">No pets match your search.</div>
          )}

          {filtered.map((pet) => (
            <div key={pet.id} className="add-pet-row">
              <div className="add-pet-main">
                <div className="add-pet-avatar" />
                <div className="add-pet-meta">
                  <div className="add-pet-name">{pet.name}</div>
                  <div className="add-pet-sub">
                    Taming score {pet.tamingScore} ·{" "}
                    {pet.playStyle === "ranged"
                      ? "Ranged"
                      : pet.playStyle === "melee"
                      ? "Melee"
                      : "AOE"}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="add-pet-add-button"
                onClick={() => onAddPet(pet.id)}
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
