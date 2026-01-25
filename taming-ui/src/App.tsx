// src/App.tsx
import React, { useMemo, useState } from "react";
import "./styles/global.css";
import { AppShell } from "./components/layout/AppShell";
import { AddPetModal } from "./components/pets/AddPetModal";

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

const MOCK_PETS: Pet[] = [
  {
    id: "pet-1",
    name: "Frost Wolf",
    status: "healthy",
    tamingScore: 82,
    playStyle: "ranged",
    avatarUrl: "",
    stats: {
      survivability: 70,
      damage: 85,
      control: 60,
      utility: 55
    },
    abilities: {
      attack: [
        {
          id: "fireball",
          name: "Fireball",
          description: "Long-range burst hit",
          points: 5
        },
        {
          id: "arcane-bolt",
          name: "Arcane Bolt",
          description: "Reliable single target poke",
          points: 3
        },
        {
          id: "poison-spit",
          name: "Poison Spit",
          description: "Stacks damage over time",
          points: 2
        }
      ],
      tank: [
        {
          id: "guard-stance",
          name: "Guard Stance",
          description: "Flat damage reduction",
          points: 4
        },
        {
          id: "shield-block",
          name: "Shield Block",
          description: "Chance to negate hits",
          points: 3
        },
        {
          id: "taunt",
          name: "Taunt",
          description: "Pulls threat to pet",
          points: 1
        }
      ],
      utility: [
        {
          id: "cleanse",
          name: "Cleanse",
          description: "Removes 1–2 debuffs",
          points: 3
        },
        {
          id: "mana-boost",
          name: "Mana Boost",
          description: "Restores caster mana",
          points: 2
        },
        {
          id: "swift-paws",
          name: "Swift Paws",
          description: "Short dash to ally",
          points: 1
        }
      ]
    }
  },
  {
    id: "pet-2",
    name: "Forest Wolf",
    status: "healthy",
    tamingScore: 75,
    playStyle: "melee",
    avatarUrl: "",
    stats: {
      survivability: 78,
      damage: 72,
      control: 65,
      utility: 40
    },
    abilities: {
      attack: [],
      tank: [],
      utility: []
    }
  },
  {
    id: "pet-3",
    name: "Stone Serpent",
    status: "injured",
    tamingScore: 63,
    playStyle: "aoe",
    avatarUrl: "",
    stats: {
      survivability: 88,
      damage: 64,
      control: 40,
      utility: 50
    },
    abilities: {
      attack: [],
      tank: [],
      utility: []
    }
  }
];

export const App: React.FC = () => {
  // treat MOCK_PETS as your full catalog for now
  const [allPets] = useState<Pet[]>(MOCK_PETS);
  const [pets, setPets] = useState<Pet[]>(() => MOCK_PETS.slice(0, 3));
  const [selectedPetId, setSelectedPetId] = useState<string>(pets[0]?.id ?? "");
  const [pendingSave, setPendingSave] = useState(false);

  // modal + search state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [petSearch, setPetSearch] = useState("");

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

  // open modal instead of auto-adding
  const handleAddPet = () => {
    if (pets.length >= 5) return;
    setIsAddModalOpen(true);
  };

  // called when user picks a pet in the modal
  const handleConfirmAddPet = (id: string) => {
    setPets((prev) => {
      if (prev.length >= 5) return prev;
      if (prev.find((p) => p.id === id)) return prev;

      const candidate = allPets.find((p) => p.id === id);
      if (!candidate) return prev;

      const next = [...prev, candidate];
      return next;
    });
    setPendingSave(true);
    setIsAddModalOpen(false);
    setPetSearch("");
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

      <AddPetModal
        open={isAddModalOpen}
        search={petSearch}
        onSearchChange={setPetSearch}
        allPets={allPets}
        currentTeamIds={pets.map((p) => p.id)}
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
