// src/components/score/TamingScoreCard.tsx
import React from "react";
import { CircularProgress } from "../common/CircularProgress";
import type { StatKey } from "../../App";

type TeamStats = {
  score: number;
  survivability: number;
  damage: number;
  control: number;
  utility: number;
};

type Props = {
  teamStats: TeamStats;
};

const ORDER: StatKey[] = [
  "survivability",
  "damage",
  "control",
  "utility"
];

export const TamingScoreCard: React.FC<Props> = ({ teamStats }) => {
  const normalized = Math.max(
    0,
    Math.min(100, (teamStats.score / 400) * 100)
  );

  return (
    <article className="card">
      <div className="card-title">Taming score</div>
      <div className="taming-score-wrapper">
        <CircularProgress value={normalized} />
        <div className="taming-score-labels">
          <div className="taming-score-main">
            {teamStats.score}
          </div>
          <div className="taming-score-sub">
            Overall synergy for this team and play style.
          </div>
        </div>
      </div>

      <div className="taming-score-metrics">
        {ORDER.map((key) => (
          <div key={key} className="metric-row">
            <span className="metric-label">
              {key.charAt(0).toUpperCase() + key.slice(1)}
            </span>
            <div className="metric-bar">
              <div
                className="metric-bar-fill"
                style={{
                  width: `${teamStats[key]}%`
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </article>
  );
};
