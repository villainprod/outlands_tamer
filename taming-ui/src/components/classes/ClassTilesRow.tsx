// src/components/classes/ClassTilesRow.tsx
import React from "react";
import type { Pet, ClassKey } from "../../App";

type Props = {
  pet?: Pet;
  onToggleAbilityPoint: (klass: ClassKey, abilityId: string) => void;
  totals: { total: number; attack: number; tank: number; utility: number };
};

const AbilityPips: React.FC<{ count: number; max?: number }> = ({
  count,
  max = 5
}) => (
  <div className="ability-pips">
    {Array.from({ length: max }).map((_, idx) => (
      <span
        key={idx}
        className={
          "ability-pip" + (idx < count ? " ability-pip--filled" : "")
        }
      />
    ))}
  </div>
);

export const ClassTilesRow: React.FC<Props> = ({
  pet,
  onToggleAbilityPoint,
  totals
}) => {
  const abilities = pet?.abilities;

  const renderCard = (klass: ClassKey, title: string) => {
    const list = abilities?.[klass] ?? [];
    return (
      <article className="card">
        <div className="class-card-title">{title}</div>
        <div className="abilities-list">
          {list.map((ab) => (
            <button
              key={ab.id}
              type="button"
              className="ability-row"
              onClick={() => onToggleAbilityPoint(klass, ab.id)}
            >
              <div className="ability-meta">
                <span className="ability-name">{ab.name}</span>
                {ab.description && (
                  <span className="ability-desc">{ab.description}</span>
                )}
              </div>
              <AbilityPips count={ab.points} max={ab.maxPoints ?? 5} />
            </button>
          ))}
        </div>
      </article>
    );
  };

  const total = totals.total || 1;
  const attackWidth = (totals.attack / total) * 100;
  const tankWidth = (totals.tank / total) * 100;
  const utilityWidth = (totals.utility / total) * 100;

  return (
    <>
      <div className="classes-row">
        {renderCard("attack", "Attack abilities")}
        {renderCard("tank", "Tank abilities")}
        {renderCard("utility", "Utility abilities")}
      </div>
      <div className="points-footer">
        <span>
          Points: {totals.total} total · Attack {totals.attack} · Tank{" "}
          {totals.tank} · Utility {totals.utility}
        </span>
        <div className="points-footer-bar">
          <div
            className="points-footer-segment"
            style={{ width: `${attackWidth}%`, background: "#f97316" }}
          />
          <div
            className="points-footer-segment"
            style={{ width: `${tankWidth}%`, background: "#3b82f6" }}
          />
          <div
            className="points-footer-segment"
            style={{ width: `${utilityWidth}%`, background: "#22c55e" }}
          />
        </div>
      </div>
    </>
  );
};
