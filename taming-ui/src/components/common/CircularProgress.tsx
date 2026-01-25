// src/components/common/CircularProgress.tsx
import React from "react";

type Props = {
  value: number; // 0-100
  size?: number;
};

export const CircularProgress: React.FC<Props> = ({ value, size = 120 }) => {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#accentGrad)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        fill="none"
      />
      <defs>
        <linearGradient id="accentGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c1c3" />
          <stop offset="100%" stopColor="#0f8a79" />
        </linearGradient>
      </defs>
      <foreignObject
        x={strokeWidth * 2}
        y={strokeWidth * 2}
        width={size - strokeWidth * 4}
        height={size - strokeWidth * 4}
        style={{ transform: "rotate(90deg)" }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 700,
            fontSize: 22,
            color: "#0f172a"
          }}
        >
          {Math.round(value)}%
        </div>
      </foreignObject>
    </svg>
  );
};
