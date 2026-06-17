import React, { useState } from 'react';
import { BREEDS } from '../data/breeds';
import type { GameAction, GameState } from '../types';

interface HatcheryPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const HatcheryPanel: React.FC<HatcheryPanelProps> = ({ state, dispatch }) => {
  const [selected, setSelected] = useState(BREEDS[0].id);
  const breed = BREEDS.find((b) => b.id === selected)!;
  const atCapacity = state.chickens.length >= state.coop.capacity;
  const canAfford = state.money >= breed.chickPrice;

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Hatchery catalog</h2>
      <p className="text-xs text-amber-800/70 mb-3">
        Real breeds with distinct temperaments, climate tolerance, and egg colors.
      </p>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-xl border border-amber-300 bg-white/90 px-3 py-2 text-sm text-amber-950 mb-3"
      >
        {BREEDS.map((b) => (
          <option key={b.id} value={b.id}>
            {b.name} — ${b.chickPrice}
          </option>
        ))}
      </select>

      <div className="breed-detail rounded-xl p-3 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-full border-2 border-amber-300/60"
            style={{ background: `linear-gradient(135deg, ${breed.plumage}, ${breed.accent})` }}
          />
          <div>
            <h3 className="font-semibold text-amber-950">{breed.name}</h3>
            <p className="text-xs text-amber-700/70">{breed.origin}</p>
          </div>
        </div>
        <p className="text-sm text-amber-900/80 leading-relaxed">{breed.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-xs">
          <Stat label="Eggs/week" value={String(breed.eggsPerWeek)} />
          <Stat label="Egg color" value={breed.eggColor} />
          <Stat label="Cold hardy" value={'★'.repeat(breed.coldHardy)} />
          <Stat label="Heat tolerant" value={'★'.repeat(breed.heatTolerant)} />
          <Stat label="Broodiness" value={'★'.repeat(breed.broodiness) || '—'} />
          <Stat label="Foraging" value={'★'.repeat(breed.foraging)} />
        </dl>
      </div>

      <button
        type="button"
        disabled={atCapacity || !canAfford}
        onClick={() => dispatch({ type: 'BUY_CHICKEN', breedId: breed.id })}
        className="w-full py-2.5 rounded-xl font-semibold text-sm buy-btn disabled:opacity-40"
      >
        {atCapacity
          ? 'Coop full — expand first'
          : !canAfford
            ? `Need $${breed.chickPrice}`
            : `Order pullet — $${breed.chickPrice}`}
      </button>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <>
    <dt className="text-amber-700/60">{label}</dt>
    <dd className="text-amber-950 font-medium">{value}</dd>
  </>
);
