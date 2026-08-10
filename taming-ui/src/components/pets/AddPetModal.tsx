// src/components/pets/AddPetModal.tsx
import React, { useMemo } from "react";
import type { TameablePet } from "../../types/tameables";

type Props = {
  open: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  allPets: TameablePet[];
  currentTeamIds: string[];
  currentSlots: number;
  onClose: () => void;
  onAddPet: (id: string) => void;
};

const MAX_SLOTS = 5;

export const AddPetModal: React.FC<Props> = ({
  open,
  search,
  onSearchChange,
  allPets,
  currentSlots,
  onClose,
  onAddPet
}) => {
  if (!open) return null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = allPets; // allow duplicates; do not filter by currentTeamIds
    if (term) {
      list = list.filter((p) =>
        p.name.toLowerCase().includes(term)
      );
    }
    return list.slice(0, 100);
  }, [allPets, search]);

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
            <div className="add-pet-empty">
              No pets match your search.
            </div>
          )}

          {filtered.map((pet) => {
            const cost = pet.slots || 0;
            const disabled = currentSlots + cost > MAX_SLOTS;

            return (
              <div key={`${pet.id}-${cost}-${pet.name}`} className="add-pet-row">
                <div className="add-pet-main">
                  <div className="add-pet-avatar" />
                  <div className="add-pet-meta">
                    <div className="add-pet-name">{pet.name}</div>
                    <div className="add-pet-sub">
                      Taming {pet.taming} · Slots {pet.slots} ·{" "}
                      {pet.class}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="add-pet-add-button"
                  onClick={() => !disabled && onAddPet(pet.id)}
                  disabled={disabled}
                >
                  {disabled ? "Full" : "Add"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
