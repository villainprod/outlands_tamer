// src/components/playstyle/PlayStyleCard.tsx
import React from "react";
import type { UiPet, PlayStyleLabel } from "../../App";
import { Chip } from "../common/Chip";

type Props = {
  pet?: UiPet;
  onChangePlayStyle: (style: PlayStyleLabel) => void;
};

export const PlayStyleCard: React.FC<Props> = ({ pet, onChangePlayStyle }) => {
  const current = pet?.playStyle;

  return (
    <article className="card">
      <div className="card-title">Play style</div>
      <div className="chip-set-vertical">
        <Chip
          label="Ranged (4+ tiles away)"
          selected={current === "ranged"}
          onClick={() => onChangePlayStyle("ranged")}
        />
        <Chip
          label="Melee (1 tile)"
          selected={current === "melee"}
          onClick={() => onChangePlayStyle("melee")}
        />
        <Chip
          label="AOE team envelope"
          selected={current === "aoe"}
          onClick={() => onChangePlayStyle("aoe")}
        />
      </div>
    </article>
  );
};
