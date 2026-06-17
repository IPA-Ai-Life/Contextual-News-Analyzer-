import React from 'react';
import type { GameAction, GameState } from '../types';
import { MEDICINE_PRICE, RUN_UPGRADE_COST } from '../game/constants';

interface UpgradesPanelProps {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

export const UpgradesPanel: React.FC<UpgradesPanelProps> = ({ state, dispatch }) => {
  const { coop } = state;

  const upgrades = [
    {
      label: 'Expand coop (+4 spaces)',
      cost: 200,
      done: coop.capacity >= 20,
      onClick: () => dispatch({ type: 'EXPAND_COOP' }),
      note: `Current: ${coop.capacity} hens`,
    },
    {
      label: 'Medium run',
      cost: RUN_UPGRADE_COST.medium,
      done: ['medium', 'large'].includes(coop.runSize),
      onClick: () => dispatch({ type: 'UPGRADE_RUN', size: 'medium' }),
      note: 'More foraging, happier hens',
    },
    {
      label: 'Large run',
      cost: RUN_UPGRADE_COST.large,
      done: coop.runSize === 'large',
      onClick: () => dispatch({ type: 'UPGRADE_RUN', size: 'large' }),
      note: 'Best for active breeds',
    },
    {
      label: 'Extra nesting box',
      cost: 35,
      done: coop.nestingBoxes >= 6,
      onClick: () => dispatch({ type: 'UPGRADE_NESTING' }),
      note: `${coop.nestingBoxes} boxes`,
    },
    {
      label: 'Dust bath station',
      cost: 45,
      done: coop.dustBath,
      onClick: () => dispatch({ type: 'BUY_DUST_BATH' }),
      note: 'Cuts mite load',
    },
    {
      label: 'Predator apron',
      cost: 120,
      done: coop.predatorFence,
      onClick: () => dispatch({ type: 'BUY_PREDATOR_FENCE' }),
      note: 'Stops fox scares',
    },
    {
      label: 'Auto waterer',
      cost: 65,
      done: coop.autoWaterer,
      onClick: () => dispatch({ type: 'BUY_AUTO_WATERER' }),
      note: 'Steady water levels',
    },
    {
      label: 'Mite treatment',
      cost: MEDICINE_PRICE,
      done: false,
      onClick: () => dispatch({ type: 'BUY_MEDICINE' }),
      note: `In stock: ${state.inventory.medicine}`,
    },
  ];

  return (
    <section className="panel rounded-2xl p-4">
      <h2 className="panel-title">Farm improvements</h2>
      <ul className="space-y-2 max-h-[280px] overflow-y-auto">
        {upgrades.map((u) => (
          <li key={u.label}>
            <button
              type="button"
              disabled={u.done || state.money < u.cost}
              onClick={u.onClick}
              className="upgrade-btn w-full text-left p-2.5 rounded-xl border disabled:opacity-45"
            >
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-amber-950">
                  {u.done && u.label !== 'Mite treatment' ? '✓ ' : ''}
                  {u.label}
                </span>
                <span className="text-xs font-semibold text-amber-800">${u.cost}</span>
              </div>
              <span className="text-xs text-amber-700/60">{u.note}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
};
