// src/types/tameables.ts
export type TameablePet = {
  id: string; // stable key
  name: string;
  dungeon: string;
  slots: number;
  taming: number;
  class: "Attack" | "Tank" | "Utility" | string;
  combat: string;
  hits: number;
  minDmg: number;
  maxDmg: number;
  wrestling: number;
  armor: number;
  magicRst: string;
  poisonRst: string;
  specialRst: string;
  poison: string;
  poisoning?: number | null;
  stealth?: string;
  underdogScalar: number;
  cooldownAbility?: string;
  passiveAbility?: string;
  innateAbility?: string;
  tags: string[];
};
