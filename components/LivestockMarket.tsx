import React, { useState } from 'react';
import { BREEDS_BY_SPECIES } from '../data/breeds';
import type { GameAction, GameState, Sex, Species } from '../types';

interface LivestockMarketProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

const TABS: { id: Species; label: string }[] = [
  { id: 'chicken', label: 'Chickens' },
  { id: 'duck', label: 'Ducks' },
  { id: 'goat', label: 'Goats' },
  { id: 'dog', label: 'Dogs' },
  { id: 'cat', label: 'Cats' },
];

export const LivestockMarket: React.FC<LivestockMarketProps> = ({ state, dispatch }) => {
  const [species, setSpecies] = useState<Species>('chicken');
  const [sex, setSex] = useState<Sex>('female');
  const breeds = BREEDS_BY_SPECIES[species];
  const [selected, setSelected] = useState(breeds[0]?.id ?? '');
  const breed = breeds.find((b) => b.id === selected) ?? breeds[0];
  if (!breed) return null;

  const price = sex === 'male' ? Math.ceil(breed.price * 0.6) : breed.price;

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Livestock market</h2>

      <div className="flex flex-wrap gap-1 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setSpecies(t.id); setSelected(BREEDS_BY_SPECIES[t.id][0]?.id ?? ''); }}
            className={`text-xs px-2 py-1 rounded-lg ${species === t.id ? 'bg-amber-200 font-semibold' : 'bg-white/60'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-2">
        {(['female', 'male'] as Sex[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSex(s)}
            className={`text-xs px-3 py-1 rounded-lg capitalize ${sex === s ? 'bg-amber-200' : 'bg-white/60'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="w-full rounded-xl border border-amber-300 bg-white/90 px-3 py-2 text-sm mb-3"
      >
        {breeds.map((b) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>

      <div className="breed-detail rounded-xl p-3 mb-3">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 rounded-full border-2 border-amber-300/60" style={{ background: `linear-gradient(135deg, ${breed.plumage}, ${breed.accent})` }} />
          <div>
            <h3 className="font-semibold text-amber-950">{breed.name}</h3>
            <p className="text-xs text-amber-700/70">{breed.origin} · {breed.role}</p>
          </div>
        </div>
        <p className="text-sm text-amber-900/80 leading-relaxed">{breed.description}</p>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
          {breed.eggsPerWeek != null && <><dt className="text-amber-700/60">Eggs/wk</dt><dd>{breed.eggsPerWeek}</dd></>}
          {breed.milkPerWeek != null && <><dt className="text-amber-700/60">Milk/wk</dt><dd>{breed.milkPerWeek} jugs</dd></>}
          {breed.predatorRepel != null && <><dt className="text-amber-700/60">Guard rating</dt><dd>{'★'.repeat(breed.predatorRepel)}</dd></>}
          {breed.pestControl != null && <><dt className="text-amber-700/60">Mousing</dt><dd>{'★'.repeat(breed.pestControl)}</dd></>}
          {breed.eggColor && <><dt className="text-amber-700/60">Egg color</dt><dd>{breed.eggColor}</dd></>}
        </dl>
      </div>

      <button
        type="button"
        disabled={state.money < price}
        onClick={() => dispatch({ type: 'BUY_ANIMAL', breedId: breed.id, sex })}
        className="w-full py-2.5 rounded-xl font-semibold text-sm buy-btn disabled:opacity-40"
      >
        {state.money < price ? `Need $${price}` : `Purchase ${sex} — $${price}`}
      </button>
    </section>
  );
};
