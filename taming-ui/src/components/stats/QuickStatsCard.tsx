// src/components/stats/QuickStatsCard.tsx
import React from "react";
import type { Pet, StatKey } from "../../App";

type Props = {
  pet?: Pet;
  statsOrder: StatKey[];
};

export const QuickStatsCard: React.FC<Props> = ({ pet, statsOrder }) => {
  const stats = pet?.stats;

  return (
    <article className="card">
      <div className="card-title">Quick stats</div>
      <div className="quick-stats-list">
        {stats &&
          statsOrder.map((key) => (
            <div key={key} className="quick-stat-row">
              <span className="quick-stat-label">
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </span>
              <div className="metric-bar">
                <div
                  className="metric-bar-fill"
                  style={{ width: `${stats[key]}%` }}
                />
              </div>
            </div>
          ))}
      </div>
    </article>
  );
};
