import React, { useState } from 'react';
import { BREED_MAP } from '../data/breeds';
import { calcHatchRate } from '../game/breeding';
import type { GameAction, GameState } from '../types';

interface BreedingPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const BreedingPanel: React.FC<BreedingPanelProps> = ({ state, dispatch }) => {
  const [selectedEggs, setSelectedEggs] = useState<string[]>([]);
  const broodies = state.animals.filter((a) => a.isBroody);
  const hasIncubator = state.housings.some((h) => h.typeId === 'incubator');

  const toggleEgg = (id: string) => {
    setSelectedEggs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(0, 12)));
  };

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Breeding program</h2>
      <p className="text-xs text-amber-800/70 mb-3">
        Keep males with females for fertile eggs. Hatch in a brooder or assign to broody hens. Genetics affect egg color and production.
      </p>

      <div className="mb-3">
        <h3 className="text-sm font-medium text-amber-950 mb-1">Fertile eggs ({state.inventory.fertileEggs.length})</h3>
        {state.inventory.fertileEggs.length === 0 ? (
          <p className="text-xs text-amber-700/60">None yet — add a rooster or drake to your flock.</p>
        ) : (
          <ul className="space-y-1 max-h-[100px] overflow-y-auto">
            {state.inventory.fertileEggs.map((egg) => {
              const breed = BREED_MAP[egg.breedId];
              return (
                <li key={egg.id}>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={selectedEggs.includes(egg.id)} onChange={() => toggleEgg(egg.id)} />
                    {breed?.name} {egg.eggColor ?? ''} · Gen {egg.genetics.generation} · Vit {Math.round(egg.genetics.vitality * 100)}%
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <button
          type="button"
          disabled={!selectedEggs.length || !hasIncubator || state.actionsRemaining <= 0}
          onClick={() => { dispatch({ type: 'START_INCUBATION', housingId: '', eggIds: selectedEggs }); setSelectedEggs([]); }}
          className="supply-btn text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
        >
          Incubate selected
        </button>
        {broodies.map((b) => (
          <button
            key={b.id}
            type="button"
            disabled={!selectedEggs.length || state.actionsRemaining <= 0}
            onClick={() => { dispatch({ type: 'ASSIGN_BROODY', animalId: b.id, eggIds: selectedEggs }); setSelectedEggs([]); }}
            className="supply-btn text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
          >
            {b.name} sits
          </button>
        ))}
      </div>

      {state.incubations.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-amber-950 mb-1">Active hatches</h3>
          <ul className="space-y-2">
            {state.incubations.map((batch) => {
              const breed = BREED_MAP[batch.breedId];
              const pct = ((batch.totalDays - batch.daysRemaining) / batch.totalDays) * 100;
              const rate = Math.round(calcHatchRate(batch.genetics, batch.method) * 100);
              return (
                <li key={batch.id} className="text-xs rounded-lg p-2 bg-white/50 border border-amber-200/60">
                  <div className="flex justify-between">
                    <span>{batch.genetics.length} {breed?.name} eggs · {batch.method}</span>
                    <span>{batch.daysRemaining}d left</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-amber-100 mt-1 overflow-hidden">
                    <div className="h-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-amber-700/60">Est. hatch rate {rate}%</span>
                  <button type="button" onClick={() => dispatch({ type: 'CANCEL_INCUBATION', batchId: batch.id })} className="ml-2 text-rose-700 underline">
                    cancel
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
};
