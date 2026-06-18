import React from 'react';
import type { GameAction, GameState } from '../types';
import {
  CHEESE_MILK_RATIO,
  DUCK_FEED_PRICE,
  HAY_BALE_PRICE,
  LAYER_FEED_PRICE,
  MEDICINE_PRICE,
} from '../game/constants';
import { totalEggsInInventory } from '../game/engine';

interface ActionPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ state, dispatch }) => {
  const eggs = totalEggsInInventory(state);
  const disabled = state.actionsRemaining <= 0;
  const mainHousing = state.housings[0]?.id;

  const actions = [
    { label: 'Clean all housing', desc: 'Refresh bedding everywhere', onClick: () => dispatch({ type: 'CLEAN_ALL_HOUSINGS' }), disabled },
    {
      label: 'Refill water',
      desc: 'All waterers',
      onClick: () => mainHousing && dispatch({ type: 'REFILL_WATER', housingId: mainHousing }),
      disabled: disabled || !mainHousing,
    },
    { label: 'Top layer feed', desc: 'From stores', onClick: () => dispatch({ type: 'REFILL_FEED', feedType: 'layer' }), disabled: disabled || state.inventory.layerFeedLbs >= 80 },
    { label: 'Top duck feed', desc: 'From stores', onClick: () => dispatch({ type: 'REFILL_FEED', feedType: 'duck' }), disabled: disabled || state.inventory.duckFeedLbs >= 50 },
    { label: 'Gather products', desc: 'Eggs & milk', onClick: () => dispatch({ type: 'COLLECT_PRODUCTS' }), disabled },
    { label: 'Health check', desc: 'All livestock', onClick: () => dispatch({ type: 'HEALTH_CHECK' }), disabled },
    {
      label: 'Treat parasites',
      desc: state.inventory.medicine > 0 ? 'Dust birds' : 'Buy medicine first',
      onClick: () => dispatch({ type: 'TREAT_PARASITES' }),
      disabled: disabled || state.inventory.medicine <= 0,
    },
    {
      label: 'Make cheese',
      desc: `Needs ${CHEESE_MILK_RATIO} milk/jug`,
      onClick: () => dispatch({ type: 'MAKE_CHEESE' }),
      disabled: disabled || state.inventory.milkJugs < CHEESE_MILK_RATIO,
    },
  ];

  return (
    <section className="panel rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-title mb-0">Daily chores ({state.actionsRemaining}/5)</h2>
        <button type="button" onClick={() => dispatch({ type: 'END_DAY' })} className="end-day-btn px-4 py-2 rounded-xl text-sm font-semibold shadow-sm">
          End day →
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={action.disabled}
            className="action-btn text-left p-3 rounded-xl border transition-all"
          >
            <span className="font-medium text-amber-950 block">{action.label}</span>
            <span className="text-xs text-amber-800/60">{action.desc}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-amber-200/60">
        <p className="text-xs text-amber-800/70 mb-2">Buy supplies (no action cost)</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => dispatch({ type: 'BUY_FEED', feedType: 'layer', amount: 25 })} disabled={state.money < 25 * LAYER_FEED_PRICE} className="supply-btn text-xs px-3 py-1.5 rounded-lg">
            +25 layer (${(25 * LAYER_FEED_PRICE).toFixed(2)})
          </button>
          <button type="button" onClick={() => dispatch({ type: 'BUY_FEED', feedType: 'duck', amount: 15 })} disabled={state.money < 15 * DUCK_FEED_PRICE} className="supply-btn text-xs px-3 py-1.5 rounded-lg">
            +15 duck (${(15 * DUCK_FEED_PRICE).toFixed(2)})
          </button>
          <button type="button" onClick={() => dispatch({ type: 'BUY_FEED', feedType: 'hay', amount: 3 })} disabled={state.money < 3 * HAY_BALE_PRICE} className="supply-btn text-xs px-3 py-1.5 rounded-lg">
            +3 hay (${(3 * HAY_BALE_PRICE).toFixed(2)})
          </button>
          <button type="button" onClick={() => dispatch({ type: 'BUY_MEDICINE' })} disabled={state.money < MEDICINE_PRICE} className="supply-btn text-xs px-3 py-1.5 rounded-lg">
            Medicine (${MEDICINE_PRICE})
          </button>
        </div>
        <p className="text-xs text-amber-600 mt-2">Stored: {eggs} eggs · {state.inventory.duckEggs} duck · {state.inventory.milkJugs} milk</p>
      </div>
    </section>
  );
};
