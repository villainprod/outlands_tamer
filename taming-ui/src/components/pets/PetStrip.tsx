// src/components/pets/PetStrip.tsx
import React from "react";
import type { Pet } from "../../App";

type Props = {
  pets: Pet[];
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

  const statusLabel = (status: Pet["status"]) => {
    if (status === "healthy") return "Ready";
    if (status === "injured") return "Resting";
    return "Critical";
  };

  return (
    <div className="pet-strip" aria-label="Pets">
      {cappedPets.map((pet) => (
        <div
          key={pet.id}
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
            <div
              className="pet-avatar"
              style={
                pet.avatarUrl
                  ? { backgroundImage: `url(${pet.avatarUrl})` }
                  : undefined
              }
            />
            <div className="pet-meta">
              <div className="pet-name">{pet.name}</div>
              <div className="pet-status-row">
                <span
                  className={
                    "pet-status-dot " +
                    (pet.status === "healthy"
                      ? "pet-status-dot--ok"
                      : pet.status === "injured"
                      ? "pet-status-dot--warn"
                      : "pet-status-dot--danger")
                  }
                />
                <span className="pet-status-label">
                  {statusLabel(pet.status)}
                </span>
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
