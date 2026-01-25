// src/components/common/Chip.tsx
import React from "react";

type Props = {
  label: string;
  selected?: boolean;
  onClick?: () => void;
};

export const Chip: React.FC<Props> = ({ label, selected, onClick }) => (
  <button
    type="button"
    className={"chip" + (selected ? " chip--selected" : "")}
    onClick={onClick}
  >
    <span>{label}</span>
  </button>
);
