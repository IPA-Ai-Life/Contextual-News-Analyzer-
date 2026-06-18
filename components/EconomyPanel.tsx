import React from 'react';
import { CSA_UNLOCK_REPUTATION, isWeekend } from '../game/constants';
import { profitMargin, seasonDemandLabel } from '../game/economy';
import { totalInventoryValue } from '../game/engine';
import type { GameAction, GameState } from '../types';

interface EconomyPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const EconomyPanel: React.FC<EconomyPanelProps> = ({ state, dispatch }) => {
  const invValue = totalInventoryValue(state);
  const margin = profitMargin(state.economy);
  const mult = state.economy.marketMultiplier;

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Farm economics</h2>

      <dl className="grid grid-cols-2 gap-2 text-sm mb-3">
        <Stat label="Market demand" value={`${mult.toFixed(2)}×`} />
        <Stat label="Inventory value" value={`$${invValue.toFixed(2)}`} />
        <Stat label="Total revenue" value={`$${state.economy.totalRevenue.toFixed(0)}`} />
        <Stat label="Total expenses" value={`$${state.economy.totalExpenses.toFixed(0)}`} />
        <Stat label="Profit margin" value={`${margin.toFixed(0)}%`} />
        <Stat label="Yesterday P&L" value={`$${(state.economy.lastDayRevenue - state.economy.lastDayExpenses).toFixed(2)}`} />
      </dl>

      <p className="text-xs text-amber-700/70 mb-3">
        {seasonDemandLabel(state.season)}
        {isWeekend(state.day) ? ' · Weekend market bonus active' : ' · Weekend sales pay more'}
      </p>

      <div className="space-y-2 mb-3">
        <SellBtn label="Chicken eggs" count={Object.values(state.inventory.eggs).reduce((a, b) => a + b, 0)} onClick={() => dispatch({ type: 'SELL_AT_MARKET', product: 'eggs' })} disabled={state.actionsRemaining <= 0} />
        <SellBtn label="Duck eggs" count={state.inventory.duckEggs} onClick={() => dispatch({ type: 'SELL_AT_MARKET', product: 'duckEggs' })} disabled={state.actionsRemaining <= 0} />
        <SellBtn label="Goat milk" count={state.inventory.milkJugs} onClick={() => dispatch({ type: 'SELL_AT_MARKET', product: 'milk' })} disabled={state.actionsRemaining <= 0} />
        <SellBtn label="Cheese" count={state.inventory.cheeseBlocks} onClick={() => dispatch({ type: 'SELL_AT_MARKET', product: 'cheese' })} disabled={state.actionsRemaining <= 0} />
        <SellBtn label="Fertile eggs" count={state.inventory.fertileEggs.length} onClick={() => dispatch({ type: 'SELL_AT_MARKET', product: 'fertileEggs' })} disabled={state.actionsRemaining <= 0} />
      </div>

      <div className="border-t border-amber-200/60 pt-3">
        <p className="text-xs text-amber-800/70 mb-2">
          CSA subscribers: {state.economy.csaSubscribers}/5 (${state.economy.csaSubscribers * 28}/week)
        </p>
        <button
          type="button"
          disabled={state.reputation < CSA_UNLOCK_REPUTATION || state.economy.csaSubscribers >= 5}
          onClick={() => dispatch({ type: 'SIGN_CSA' })}
          className="supply-btn text-xs px-3 py-1.5 rounded-lg w-full disabled:opacity-40"
        >
          {state.reputation < CSA_UNLOCK_REPUTATION
            ? `Unlock CSA at ${CSA_UNLOCK_REPUTATION} rep`
            : 'Sign CSA subscriber (+$28/wk)'}
        </button>
      </div>
    </section>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <>
    <dt className="text-amber-700/60 text-xs">{label}</dt>
    <dd className="font-semibold text-amber-950">{value}</dd>
  </>
);

const SellBtn: React.FC<{ label: string; count: number; onClick: () => void; disabled: boolean }> = ({
  label,
  count,
  onClick,
  disabled,
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || count === 0}
    className="action-btn w-full text-left p-2 rounded-lg border text-sm disabled:opacity-40"
  >
    Sell {label} {count > 0 ? `(${count})` : ''}
  </button>
);
