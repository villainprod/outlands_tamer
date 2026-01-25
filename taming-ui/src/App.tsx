// src/App.tsx
import React, { useEffect, useMemo, useState } from "react";
import "./styles/global.css";
import { AppShell } from "./components/layout/AppShell";

export type StatKey = "survivability" | "damage" | "control" | "utility";

export type Ability = {
  id: string;
  name: string;
  description?: string;
  points: number; // 0-5
  maxPoints?: number;
};

export type ClassKey = "attack" | "tank" | "utility";

export type Pet = {
  id: string;
  name: string;
  avatarUrl?: string;
  status: "healthy" | "injured" | "danger";
  tamingScore: number; // 0-100
  stats: Record<StatKey, number>; // 0-100
  playStyle: "ranged" | "melee" | "aoe";
  abilities: Record<ClassKey, Ability[]>;
};

// Small CSV parser for header + comma-separated rows
function parsePetsCsv(csvText: string): Pet[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length <= 1) return [];

  const header = lines[0].split(",");
  const rows = lines.slice(1);

  const idx = (name: string) => header.indexOf(name);

  return rows
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const cols = line.split(",");
      const status = (cols[idx("status")] || "healthy") as Pet["status"];
      const playStyle = (cols[idx("playStyle")] || "ranged") as Pet["playStyle"];

      const pet: Pet = {
        id: cols[idx("id")] || `pet-${Math.random().toString(36).slice(2)}`,
        name: cols[idx("name")] || "Unnamed pet",
        status,
        tamingScore: Number(cols[idx("tamingScore")] || 0),
        playStyle,
        avatarUrl: "",
        stats: {
          survivability: Number(cols[idx("survivability")] || 0),
          damage: Number(cols[idx("damage")] || 0),
          control: Number(cols[idx("control")] || 0),
          utility: Number(cols[idx("utility")] || 0)
        },
        // abilities can be fleshed out later
        abilities: {
          attack: [],
          tank: [],
          utility: []
        }
      };

      return pet;
    });
}

export const App: React.FC = () => {
  // full list from CSV
  const [allPets, setAllPets] = useState<Pet[]>([]);
  // current team (max 5)
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPetId, setSelectedPetId] = useState<string>("");
  const [pendingSave, setPendingSave] = useState(false);

  // load CSV once
  useEffect(() => {
    const load = async () => {
      const res = await fetch("./public/pets.csv"); 
      const text = await res.text();
      const parsed = parsePetsCsv(text);
      setAllPets(parsed);

      const initial = parsed.slice(0, 5);
      setPets(initial);
      setSelectedPetId(initial[0]?.id ?? "");
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
      const next = prev.filter((p) => p.id !== id);
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

  // add a pet from CSV that is not already on the team
  const handleAddPet = () => {
    setPets((prev) => {
      if (prev.length >= 5) return prev;
      const existingIds = new Set(prev.map((p) => p.id));
      const candidate = allPets.find((p) => !existingIds.has(p.id));
      if (!candidate) return prev;
      const next = [...prev, candidate];
      if (!selectedPetId) setSelectedPetId(candidate.id);
      return next;
    });
    setPendingSave(true);
  };

  const handleChangePlayStyle = (style: Pet["playStyle"]) => {
    if (!selectedPet) return;
    selectedPet.playStyle = style;
    setPendingSave(true);
  };

  const handleToggleAbilityPoint = (klass: ClassKey, abilityId: string) => {
    if (!selectedPet) return;
    const list = selectedPet.abilities[klass];
    const ability = list.find((a) => a.id === abilityId);
    if (!ability) return;
    const max = ability.maxPoints ?? 5;
    ability.points = ability.points >= max ? 0 : ability.points + 1;
    setPendingSave(true);
  };

  const totalPoints = useMemo(() => {
    if (!selectedPet) return { total: 0, attack: 0, tank: 0, utility: 0 };
    const sumClass = (klass: ClassKey) =>
      selectedPet.abilities[klass].reduce((acc, a) => acc + a.points, 0);
    const attack = sumClass("attack");
    const tank = sumClass("tank");
    const utility = sumClass("utility");
    return { total: attack + tank + utility, attack, tank, utility };
  }, [selectedPet]);

  const handleSave = () => {
    setPendingSave(false);
  };

  return (
    <div className="app-root">
      <AppShell
        pets={pets.slice(0, 5)}
        selectedPet={selectedPet}
        onSelectPet={handleSelectPet}
        onChangePlayStyle={handleChangePlayStyle}
        onToggleAbilityPoint={handleToggleAbilityPoint}
        totalPoints={totalPoints}
        pendingSave={pendingSave}
        onSave={handleSave}
        onRemovePet={handleRemovePet}
        onClearTeam={handleClearTeam}
        onAddPet={handleAddPet}
      />
    </div>
  );
};

export default App;
