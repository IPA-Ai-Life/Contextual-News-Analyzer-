import React from 'react';
import { BREED_MAP } from '../data/breeds';
import type { Chicken, GameState } from '../types';

interface FlockPanelProps {
  state: GameState;
  onBreakBroodiness: (id: string) => void;
}

export const FlockPanel: React.FC<FlockPanelProps> = ({ state, onBreakBroodiness }) => {
  return (
    <section className="panel rounded-2xl p-4 h-full">
      <h2 className="panel-title">Flock ({state.chickens.length}/{state.coop.capacity})</h2>

      {state.chickens.length === 0 ? (
        <p className="text-sm text-amber-800/70 py-4">
          Visit the hatchery to buy your first pullets. Rhode Island Reds are forgiving for beginners.
        </p>
      ) : (
        <ul className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
          {state.chickens.map((chicken) => (
            <ChickenRow
              key={chicken.id}
              chicken={chicken}
              onBreakBroodiness={onBreakBroodiness}
              actionsLeft={state.actionsRemaining}
            />
          ))}
        </ul>
      )}
    </section>
  );
};

const ChickenRow: React.FC<{
  chicken: Chicken;
  onBreakBroodiness: (id: string) => void;
  actionsLeft: number;
}> = ({ chicken, onBreakBroodiness, actionsLeft }) => {
  const breed = BREED_MAP[chicken.breedId];
  if (!breed) return null;

  return (
    <li className="flock-card rounded-xl p-3 flex gap-3 items-start">
      <div
        className="w-10 h-10 rounded-full border-2 border-amber-300/50 shrink-0"
        style={{ background: `linear-gradient(135deg, ${breed.plumage}, ${breed.accent})` }}
        title={breed.name}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-amber-950">{chicken.name}</span>
          <span className="text-xs text-amber-700/80">{breed.name}</span>
          {chicken.isBroody && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Broody</span>
          )}
          {chicken.isMolting && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">Molting</span>
          )}
        </div>
        <p className="text-xs text-amber-800/60 mt-0.5">
          {breed.eggColor} eggs · {Math.floor(chicken.ageMonths)} mo · {breed.temperament}
        </p>
        <div className="flex gap-2 mt-2">
          <MiniBar label="Health" value={chicken.health} color="#6B9E78" />
          <MiniBar label="Happy" value={chicken.happiness} color="#D4A84B" />
        </div>
        {chicken.parasiteLoad > 30 && (
          <p className="text-xs text-orange-700 mt-1">Mite load rising — treat soon.</p>
        )}
        {chicken.isBroody && actionsLeft > 0 && (
          <button
            type="button"
            onClick={() => onBreakBroodiness(chicken.id)}
            className="mt-2 text-xs px-2 py-1 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-50"
          >
            Break broodiness (1 action)
          </button>
        )}
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
