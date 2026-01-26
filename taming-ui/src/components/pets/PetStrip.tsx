// src/components/pets/PetStrip.tsx
import React from "react";
import type { TameablePet } from "../../types/tameables";

type Props = {
  pets: TameablePet[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onRemovePet: (id: string) => void;
  onAddPet: () => void;
};

export const PetStrip: React.FC<Props> = ({
  pets,
  selectedId,
  onSelect,
  onRemovePet,
  onAddPet
}) => {
  const maxTiles = 5;
  const cappedPets = pets.slice(0, maxTiles);
  const remaining = Math.max(0, maxTiles - cappedPets.length);

  const classDotClass = (cls: string) => {
    const c = cls.toLowerCase();
    if (c === "attack") return "pet-status-dot--attack";
    if (c === "tank") return "pet-status-dot--tank";
    if (c === "utility") return "pet-status-dot--utility";
    return "pet-status-dot--ok";
  };

  return (
    <div className="pet-strip" aria-label="Pets">
      {cappedPets.map((pet, index) => (
        <div
          key={`${pet.id}-${index}`}
          className={
            "pet-tile" + (pet.id === selectedId ? " pet-tile--selected" : "")
          }
        >
          <button
            type="button"
            onClick={() => onSelect(pet.id)}
            style={{
              all: "unset",
              display: "flex",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              flex: 1
            }}
          >
            <div className="pet-avatar" />
            <div className="pet-meta">
              <div className="pet-name">{pet.name}</div>
              <div className="pet-status-row">
                <span
                  className={"pet-status-dot " + classDotClass(pet.class)}
                />
                <span className="pet-status-label">{pet.class}</span>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onRemovePet(pet.id)}
            style={{
              border: "none",
              background: "transparent",
              color: "var(--text-subtle)",
              cursor: "pointer",
              padding: "0 4px 0 2px",
              fontSize: 16,
              lineHeight: 1
            }}
            aria-label={`Remove ${pet.name} from team`}
          >
            ×
          </button>
        </div>
      ))}

      {Array.from({ length: remaining }).map((_, idx) => (
        <button
          key={`ghost-${idx}`}
          className="pet-tile pet-tile--ghost"
          type="button"
          onClick={onAddPet}
        >
          + Add pet
        </button>
      ))}
    </div>
  );
};
