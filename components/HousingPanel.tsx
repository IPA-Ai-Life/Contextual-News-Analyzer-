import React from 'react';
import { HOUSING_TYPES, HOUSING_TYPE_MAP, HOUSING_UPGRADE_COST } from '../data/housing';
import type { GameAction, GameState } from '../types';

interface HousingPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const HousingPanel: React.FC<HousingPanelProps> = ({ state, dispatch }) => {
  const ownedTypes = new Set(state.housings.map((h) => h.typeId));
  const buildable = HOUSING_TYPES.filter((t) => t.buildCost > 0 || (t.id === 'backyard-coop' && !ownedTypes.has(t.id)));

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Housing & structures</h2>

      <ul className="space-y-2 mb-4 max-h-[200px] overflow-y-auto">
        {state.housings.map((h) => {
          const type = HOUSING_TYPE_MAP[h.typeId];
          const count = state.animals.filter((a) => a.housingId === h.id).length;
          return (
            <li key={h.id} className="rounded-xl p-2.5 bg-white/50 border border-amber-200/60 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">{type?.icon} {type?.name}</span>
                <span className="text-xs">{count}/{type?.capacity}</span>
              </div>
              <div className="flex gap-2 mt-1 text-xs text-amber-700/70">
                <span>Clean {Math.round(h.cleanliness)}%</span>
                <span>Water {Math.round(h.waterLevel)}%</span>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(['autoWaterer', 'dustBath', 'predatorFence'] as const).map((up) => {
                  if (h[up] || !type?.species.some((s) => s === 'chicken' || s === 'duck')) return null;
                  return (
                    <button
                      key={up}
                      type="button"
                      disabled={state.money < HOUSING_UPGRADE_COST[up]}
                      onClick={() => dispatch({ type: 'UPGRADE_HOUSING', housingId: h.id, upgrade: up })}
                      className="text-[10px] px-2 py-0.5 rounded bg-amber-100 disabled:opacity-40"
                    >
                      {up} ${HOUSING_UPGRADE_COST[up]}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>

      <h3 className="text-sm font-medium text-amber-950 mb-2">Build new</h3>
      <ul className="space-y-2 max-h-[180px] overflow-y-auto">
        {buildable.map((type) => (
          <li key={type.id}>
            <button
              type="button"
              disabled={state.money < type.buildCost || (type.id !== 'backyard-coop' && type.buildCost === 0)}
              onClick={() => dispatch({ type: 'BUILD_HOUSING', typeId: type.id })}
              className="upgrade-btn w-full text-left p-2.5 rounded-xl border disabled:opacity-45"
            >
              <div className="flex justify-between">
                <span className="text-sm font-medium">{type.icon} {type.name}</span>
                <span className="text-xs font-semibold">${type.buildCost}</span>
              </div>
              <p className="text-xs text-amber-700/60 mt-0.5">{type.description.slice(0, 80)}…</p>
              <span className="text-[10px] text-amber-600">Cap {type.capacity} · {type.species.join(', ') || 'utility'}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
