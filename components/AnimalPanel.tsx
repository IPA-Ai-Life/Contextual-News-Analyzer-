import React, { useState } from 'react';
import { BREED_MAP } from '../data/breeds';
import { HOUSING_TYPE_MAP } from '../data/housing';
import type { Animal, GameState, Species } from '../types';

interface AnimalPanelProps {
  state: GameState;
  onBreakBroodiness: (id: string) => void;
  onMoveAnimal: (animalId: string, housingId: string) => void;
}

const SPECIES_ORDER: Species[] = ['chicken', 'duck', 'goat', 'dog', 'cat'];

export const AnimalPanel: React.FC<AnimalPanelProps> = ({ state, onBreakBroodiness, onMoveAnimal }) => {
  const [filter, setFilter] = useState<Species | 'all'>('all');
  const filtered = state.animals.filter((a) => filter === 'all' || a.species === filter);

  return (
    <section className="panel rounded-2xl p-4 h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="panel-title mb-0">Livestock ({state.animals.length})</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as Species | 'all')}
          className="text-xs rounded-lg border border-amber-300 px-2 py-1 bg-white/90"
        >
          <option value="all">All</option>
          {SPECIES_ORDER.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-amber-800/70 py-4">Visit the livestock market to stock your homestead.</p>
      ) : (
        <ul className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
          {filtered.map((animal) => (
            <AnimalRow
              key={animal.id}
              animal={animal}
              state={state}
              onBreakBroodiness={onBreakBroodiness}
              onMoveAnimal={onMoveAnimal}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const AnimalRow: React.FC<{
  animal: Animal;
  state: GameState;
  onBreakBroodiness: (id: string) => void;
  onMoveAnimal: (animalId: string, housingId: string) => void;
}> = ({ animal, state, onBreakBroodiness, onMoveAnimal }) => {
  const breed = BREED_MAP[animal.breedId];
  if (!breed) return null;
  const housing = state.housings.find((h) => h.id === animal.housingId);
  const hName = housing ? HOUSING_TYPE_MAP[housing.typeId]?.name : '?';

  return (
    <li className="flock-card rounded-xl p-3">
      <div className="flex gap-3 items-start">
        <div
          className="w-10 h-10 rounded-full border-2 border-amber-300/50 shrink-0 flex items-center justify-center text-lg"
          style={{ background: `linear-gradient(135deg, ${breed.plumage}, ${breed.accent})` }}
        >
          {animal.species === 'duck' ? '🦆' : animal.species === 'goat' ? '🐐' : animal.species === 'dog' ? '🐕' : animal.species === 'cat' ? '🐈' : ''}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-amber-950">{animal.name}</span>
            <span className="text-xs text-amber-700/80">{breed.name}</span>
            <span className="text-xs px-1 rounded bg-amber-100">{animal.sex}</span>
            {animal.isBroody && <span className="text-xs px-1 rounded bg-rose-100 text-rose-800">Broody</span>}
            {animal.isMolting && <span className="text-xs px-1 rounded bg-amber-100">Molting</span>}
            {animal.isPregnant && <span className="text-xs px-1 rounded bg-purple-100 text-purple-800">Pregnant</span>}
          </div>
          <p className="text-xs text-amber-800/60 mt-0.5">
            {Math.floor(animal.ageMonths)} mo · Gen {animal.genetics.generation} · {hName}
            {breed.eggColor && ` · ${breed.eggColor} eggs`}
          </p>
          <div className="flex gap-2 mt-2">
            <MiniBar label="Health" value={animal.health} color="#6B9E78" />
            <MiniBar label="Happy" value={animal.happiness} color="#D4A84B" />
          </div>
          {animal.isBroody && state.actionsRemaining > 0 && (
            <button type="button" onClick={() => onBreakBroodiness(animal.id)} className="mt-2 text-xs px-2 py-1 rounded-lg bg-white border border-amber-300">
              Break broodiness
            </button>
          )}
          {state.housings.length > 1 && (
            <select
              className="mt-2 text-xs rounded border border-amber-200 px-1 py-0.5 w-full"
              value={animal.housingId}
              onChange={(e) => onMoveAnimal(animal.id, e.target.value)}
            >
              {state.housings.map((h) => (
                <option key={h.id} value={h.id}>{HOUSING_TYPE_MAP[h.typeId]?.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>
    </li>
  );
};

const MiniBar: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex-1">
    <div className="flex justify-between text-[10px] text-amber-700/70">
      <span>{label}</span>
      <span>{Math.round(value)}</span>
    </div>
    <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  </div>
);
