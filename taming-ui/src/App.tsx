// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./styles/global.css";
import { AppShell } from "./components/layout/AppShell";
import { AddPetModal } from "./components/pets/AddPetModal";
import type { TameablePet } from "./types/tameables";
import { scoreTeam, type PlaystyleKey } from "./logic/teamScoring";
import { loadBestiarySets, type BestiarySets } from "./logic/bestiary";


export type StatKey = "survivability" | "damage" | "control" | "utility";

export type Ability = {
  id: string;
  name: string;
  description?: string;
  points: number;
  maxPoints?: number;
};

export type ClassKey = "attack" | "tank" | "utility";

const MAX_SLOTS = 5;

const getUsedSlots = (pets: TameablePet[]) =>
  pets.reduce((sum, p) => sum + (p.slots || 0), 0);

// CSV → tameables
function parseTameablesCsv(csvText: string): TameablePet[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(",");
  const rows = lines.slice(1);

  const idx = (name: string) => header.indexOf(name);

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line, i) => {
      const cols = line.split(",");
      const slots = Number(cols[idx("Slots")] || 0);
      const minDmg = Number(cols[idx("MinDmg")] || 0);
      const maxDmg = Number(cols[idx("MaxDmg")] || 0);
      const underdogScalar = Number(cols[idx("UnderdogScalar")] || 1);

      const cooldownAbility = cols[idx("CooldownAbility")] || "";
      const passiveAbility = cols[idx("PassiveAbility")] || "";
      const innateAbility = cols[idx("InnateAbility")] || "";

      const combat = cols[idx("Combat")] || "";
      const className = cols[idx("Class")] || "";

      const tags = deriveTagsFromTameable(
        className,
        combat,
        cooldownAbility,
        passiveAbility,
        innateAbility
      );

      const pet: TameablePet = {
        id: `tameable-${i}`,
        name: cols[idx("name")] || "Unnamed",
        dungeon: cols[idx("Dungeon")] || "",
        slots,
        taming: Number(cols[idx("Taming")] || 0),
        class: className as TameablePet["class"],
        combat,
        hits: Number(cols[idx("Hits")] || 0),
        minDmg,
        maxDmg,
        wrestling: Number(cols[idx("Wrestling")] || 0),
        armor: Number(cols[idx("Armor")] || 0),
        magicRst: cols[idx("MagicRst")] || "",
        poisonRst: cols[idx("PoisonRst")] || "",
        specialRst: cols[idx("SpecialRst")] || "",
        poison: cols[idx("Poison")] || "",
        poisoning: cols[idx("Poisoning")]
          ? Number(cols[idx("Poisoning")])
          : null,
        stealth: cols[idx("Stealth")] || "",
        underdogScalar,
        cooldownAbility,
        passiveAbility,
        innateAbility,
        tags
      };

      return pet;
    });
}

// derive tags for scoring
function deriveTagsFromTameable(
  className: string,
  combat: string,
  cooldownAbility: string,
  passiveAbility: string,
  innateAbility: string
): string[] {
  const tags = new Set<string>();
  const cls = className.toLowerCase();
  const cmb = combat.toLowerCase();
  const allAbil =
    `${cooldownAbility} ${passiveAbility} ${innateAbility}`.toLowerCase();

  if (cls === "attack") tags.add("attack");
  if (cls === "tank") tags.add("tank");
  if (cls === "utility") tags.add("utility");

  if (cmb === "spell") tags.add("spell");
  if (cmb === "melee") tags.add("melee");

  if (allAbil.includes("barrage") || allAbil.includes("breath")) {
    tags.add("aoe");
  }
  if (allAbil.includes("bleed")) {
    tags.add("bleed");
    tags.add("single_target");
  }
  if (allAbil.includes("poison") || allAbil.includes("disease")) {
    tags.add("poison");
  }

  if (allAbil.includes("ranged")) tags.add("ranged_friendly");

  return Array.from(tags);
}

// approximate UI stats from raw numbers
function computeUiStatsForPet(p: TameablePet): Record<StatKey, number> {
  const survivability = Math.max(
    0,
    Math.min(100, (p.hits / 300) * 100)
  );
  const damage = Math.max(
    0,
    Math.min(
      100,
      (((p.minDmg + p.maxDmg) / 2) / 25) * 100
    )
  );
  const control = 50;
  const utility = p.class === "Utility" ? 80 : 40;

  return {
    survivability: Math.round(survivability),
    damage: Math.round(damage),
    control: Math.round(control),
    utility: Math.round(utility)
  };
}

export const App: React.FC = () => {
  const [allPets, setAllPets] = useState<TameablePet[]>([]);
  const [pets, setPets] = useState<TameablePet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [pendingSave, setPendingSave] = useState(false);
  const [playstyle, setPlaystyle] = useState<PlaystyleKey>("balanced");

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [petSearch, setPetSearch] = useState("");
  const [bestiary, setBestiary] = useState<BestiarySets | null>(null);

  // load tameables + bestiary once
  useEffect(() => {
    const load = async () => {
      const [tameablesRes, bestiarySets] = await Promise.all([
        fetch("/tameables.csv").then((r) => r.text()),
        loadBestiarySets()
      ]);

      const parsed = parseTameablesCsv(tameablesRes);
      setAllPets(parsed);

      const initial = parsed.slice(0, 3);
      setPets(initial);
      setSelectedPetId(initial[0]?.id ?? "");

      setBestiary(bestiarySets);
    };

    load();
  }, []);

  const selectedPet = useMemo(
    () => pets.find((p) => p.id === selectedPetId) ?? pets[0],
    [pets, selectedPetId]
  );

  const handleSelectPet = (id: string) => {
    setSelectedPetId(id);
    setPendingSave(true);
  };

  const handleRemovePet = (id: string) => {
    setPets((prev) => {
      const next = prev.filter(
        (p, idx) => !(p.id === id && idx === prev.findIndex((q) => q.id === id))
      );
      if (!next.find((p) => p.id === selectedPetId)) {
        setSelectedPetId(next[0]?.id ?? "");
      }
      return next;
    });
    setPendingSave(true);
  };

  const handleClearTeam = () => {
    setPets([]);
    setSelectedPetId("");
    setPendingSave(true);
  };

  const handleAddPet = () => {
    if (getUsedSlots(pets) >= MAX_SLOTS) return;
    setIsAddModalOpen(true);
  };

  const handleConfirmAddPet = (id: string) => {
    setPets((prev) => {
      const candidate = allPets.find((p) => p.id === id);
      if (!candidate) return prev;

      const usedSlots = getUsedSlots(prev);
      const cost = candidate.slots || 0;
      if (usedSlots + cost > MAX_SLOTS) {
        return prev;
      }

      return [...prev, candidate]; // allow duplicates
    });

    setPendingSave(true);
    setIsAddModalOpen(false);
    setPetSearch("");
  };

  const handleChangePlayStyle = (styleLabel: "ranged" | "melee" | "aoe") => {
    let key: PlaystyleKey = "balanced";
    if (styleLabel === "ranged") key = "aoe_far";
    else if (styleLabel === "melee") key = "single_target";
    else key = "balanced";

    setPlaystyle(key);
    setPendingSave(true);
  };

  const handleToggleAbilityPoint = (_klass: ClassKey, _abilityId: string) => {
    setPendingSave(true);
  };

  const teamScore = useMemo(
    () => scoreTeam(pets, playstyle),
    [pets, playstyle]
  );

  const teamStats = useMemo(() => {
    if (pets.length === 0) {
      return {
        score: 0,
        survivability: 0,
        damage: 0,
        control: 0,
        utility: 0
      };
    }

    const totals = pets.reduce(
      (acc, p) => {
        const stats = computeUiStatsForPet(p);
        acc.survivability += stats.survivability;
        acc.damage += stats.damage;
        acc.control += stats.control;
        acc.utility += stats.utility;
        return acc;
      },
      {
        survivability: 0,
        damage: 0,
        control: 0,
        utility: 0
      }
    );

    const n = pets.length;
    return {
      score: teamScore,
      survivability: Math.round(totals.survivability / n),
      damage: Math.round(totals.damage / n),
      control: Math.round(totals.control / n),
      utility: Math.round(totals.utility / n)
    };
  }, [pets, teamScore]);

  const quickStats = selectedPet
    ? computeUiStatsForPet(selectedPet)
    : {
        survivability: 0,
        damage: 0,
        control: 0,
        utility: 0
      };

  const totalPoints = { total: 0, attack: 0, tank: 0, utility: 0 };

  const handleSave = () => {
    setPendingSave(false);
  };

  return (
    <div className="app-root">
      <AppShell
        pets={pets.slice(0, 5)}
        selectedPet={
          selectedPet
            ? {
                ...selectedPet,
                stats: quickStats,
                tamingScore: teamScore
              }
            : undefined
        }
        teamStats={teamStats}
        onSelectPet={handleSelectPet}
        onChangePlayStyle={handleChangePlayStyle}
        onToggleAbilityPoint={handleToggleAbilityPoint}
        totalPoints={totalPoints}
        pendingSave={pendingSave}
        onSave={handleSave}
        onRemovePet={handleRemovePet}
        onClearTeam={handleClearTeam}
        onAddPet={handleAddPet}
        playstyle={playstyle}
        bestiary={bestiary}
      />

      {/* Bottom row: bestiary recommendations */}
      

      <AddPetModal
        open={isAddModalOpen}
        search={petSearch}
        onSearchChange={setPetSearch}
        allPets={allPets}
        currentTeamIds={pets.map((p) => p.id)}
        currentSlots={getUsedSlots(pets)}
        onClose={() => {
          setIsAddModalOpen(false);
          setPetSearch("");
        }}
        onAddPet={handleConfirmAddPet}
      />
    </div>
  );
};

export default App;
