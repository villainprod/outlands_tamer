// src/components/score/TamingScoreCard.tsx
import React from "react";
import type { Pet, StatKey } from "../../App";
import { CircularProgress } from "../common/CircularProgress";

type Props = {
  pet?: Pet;
  statsOrder: StatKey[];
};

export const TamingScoreCard: React.FC<Props> = ({ pet, statsOrder }) => {
  const value = pet?.tamingScore ?? 0;
  const stats = pet?.stats;

  return (
    <article className="card">
      <div className="card-title">Taming score</div>
      <div className="taming-score-wrapper">
        <CircularProgress value={value} />
        <div className="taming-score-labels">
          <div className="taming-score-main">{value}%</div>
          <div className="taming-score-sub">
            Overall taming efficiency for this pet.
          </div>
        </div>
      </div>

      {stats && (
        <div className="taming-score-metrics">
          {statsOrder.map((key) => (
            <div key={key} className="metric-row">
              <span className="metric-label">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
              <div className="metric-bar" aria-hidden>
                <div
                  className="metric-bar-fill"
                  style={{ width: `${stats[key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
};
