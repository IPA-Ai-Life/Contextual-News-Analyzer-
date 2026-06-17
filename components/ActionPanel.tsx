import React from 'react';
import type { GameAction, GameState } from '../types';
import { FEED_PRICE_PER_LB, MEDICINE_PRICE } from '../game/constants';
import { totalEggsInInventory } from '../game/engine';

interface ActionPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const ActionPanel: React.FC<ActionPanelProps> = ({ state, dispatch }) => {
  const eggs = totalEggsInInventory(state);
  const disabled = state.actionsRemaining <= 0;

  const actions = [
    {
      label: 'Clean coop',
      desc: 'Fresh bedding, better health',
      onClick: () => dispatch({ type: 'CLEAN_COOP' }),
      disabled,
    },
    {
      label: 'Refill water',
      desc: 'Critical in heat',
      onClick: () => dispatch({ type: 'REFILL_WATER' }),
      disabled,
    },
    {
      label: 'Top feeders',
      desc: 'Move feed from stores',
      onClick: () => dispatch({ type: 'REFILL_FEED' }),
      disabled: disabled || state.inventory.feedLbs >= 80,
    },
    {
      label: 'Collect eggs',
      desc: eggs > 0 ? `${eggs} in boxes` : 'Check nesting boxes',
      onClick: () => dispatch({ type: 'COLLECT_EGGS' }),
      disabled,
    },
    {
      label: 'Health check',
      desc: 'Spot issues early',
      onClick: () => dispatch({ type: 'HEALTH_CHECK' }),
      disabled,
    },
    {
      label: 'Treat parasites',
      desc: state.inventory.medicine > 0 ? 'Use dusting powder' : 'Buy medicine first',
      onClick: () => dispatch({ type: 'TREAT_PARASITES' }),
      disabled: disabled || state.inventory.medicine <= 0,
    },
    {
      label: 'Sell at stand',
      desc: eggs > 0 ? `Sell ${eggs} eggs` : 'No eggs to sell',
      onClick: () => dispatch({ type: 'SELL_EGGS' }),
      disabled: disabled || eggs === 0,
      highlight: eggs > 0,
    },
  ];

  return (
    <section className="panel rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="panel-title mb-0">Daily chores</h2>
        <button
          type="button"
          onClick={() => dispatch({ type: 'END_DAY' })}
          className="end-day-btn px-4 py-2 rounded-xl text-sm font-semibold shadow-sm"
        >
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
            className={`action-btn text-left p-3 rounded-xl border transition-all ${
              action.highlight ? 'ring-2 ring-amber-400/50' : ''
            }`}
          >
            <span className="font-medium text-amber-950 block">{action.label}</span>
            <span className="text-xs text-amber-800/60">{action.desc}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-amber-200/60">
        <p className="text-xs text-amber-800/70 mb-2">Supplies (no action cost)</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dispatch({ type: 'BUY_FEED', lbs: 25 })}
            disabled={state.money < 25 * FEED_PRICE_PER_LB}
            className="supply-btn text-xs px-3 py-1.5 rounded-lg"
          >
            +25 lbs feed (${(25 * FEED_PRICE_PER_LB).toFixed(2)})
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'BUY_FEED', lbs: 50 })}
            disabled={state.money < 50 * FEED_PRICE_PER_LB}
            className="supply-btn text-xs px-3 py-1.5 rounded-lg"
          >
            +50 lbs feed (${(50 * FEED_PRICE_PER_LB).toFixed(2)})
          </button>
          <button
            type="button"
            onClick={() => dispatch({ type: 'BUY_MEDICINE' })}
            disabled={state.money < MEDICINE_PRICE}
            className="supply-btn text-xs px-3 py-1.5 rounded-lg"
          >
            +Mite treatment (${MEDICINE_PRICE})
          </button>
        </div>
      </div>
    </section>
  );
};
