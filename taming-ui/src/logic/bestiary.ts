// src/logic/bestiary.ts
//
// Loading and parsing of the three Class Upgrade bestiaries.
// Scoring and point allocation now live in upgradeRules.ts / upgradeOptimizer.ts.

import type { UpgradeClass } from "./upgradeRules";

export type BestiaryTrait = {
  name: string;
  description: string;
};

export type BestiarySets = {
  attack: BestiaryTrait[];
  tank: BestiaryTrait[];
  utility: BestiaryTrait[];
};

// ---------------------------------------------------------------------------
// CSV parsing
// ---------------------------------------------------------------------------

export function parseSimpleBestiaryCsv(csvText: string): BestiaryTrait[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 2) return [];

  // The first two rows of each file are headers.
  return lines
    .slice(2)
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const firstComma = line.indexOf(",");
      if (firstComma === -1) {
        return { name: line.trim(), description: "" };
      }

      const name = line.slice(0, firstComma).trim();
      let description = line.slice(firstComma + 1).trim();

      if (description.startsWith('"') && description.endsWith('"')) {
        description = description.slice(1, -1).replace(/""/g, '"');
      }

      return { name, description };
    });
}

function sanitizeCsvResponse(txt: string): string {
  const trimmed = txt.trim().toLowerCase();
  if (trimmed.startsWith("<!doctype") || trimmed.startsWith("<html")) {
    // Dev server returned index.html instead of the CSV.
    return "";
  }
  return txt;
}

export async function loadBestiarySets(): Promise<BestiarySets> {
  const files = ["/attackClass.csv", "/tankClass.csv", "/utilityClass.csv"];

  const [attack, tank, utility] = await Promise.all(
    files.map(async (f) => {
      const res = await fetch(f);
      return parseSimpleBestiaryCsv(sanitizeCsvResponse(await res.text()));
    })
  );

  return { attack, tank, utility };
}

/** Re-key the loaded sets by the class names used everywhere else. */
export function bestiaryByClass(
  sets: BestiarySets | null
): Record<UpgradeClass, BestiaryTrait[]> {
  return {
    Attack: sets?.attack ?? [],
    Tank: sets?.tank ?? [],
    Utility: sets?.utility ?? [],
  };
}
