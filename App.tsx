import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { AnimalPanel } from './components/AnimalPanel';
import { BreedingPanel } from './components/BreedingPanel';
import { EconomyPanel } from './components/EconomyPanel';
import { EventsLog } from './components/EventsLog';
import { HomesteadScene } from './components/HomesteadScene';
import { HousingPanel } from './components/HousingPanel';
import { LivestockMarket } from './components/LivestockMarket';
import { StatusBar } from './components/StatusBar';
import { SAVE_KEY, VICTORY_DAYS, VICTORY_REPUTATION, VICTORY_REVENUE } from './game/constants';
import { flockProductionEstimate, gameReducer, totalInventoryValue } from './game/engine';
import { createInitialState } from './game/initialState';
import { migrateSave } from './game/migration';
import type { GameAction, GameState } from './types';

function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return migrateSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

type Tab = 'chores' | 'market' | 'housing' | 'breeding' | 'economy';

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadSavedGame() ?? createInitialState());
  const [activeTab, setActiveTab] = useState<Tab>('chores');

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [state]);

  const handleDispatch = useCallback((action: GameAction) => dispatch(action), []);

  const inventoryValue = totalInventoryValue(state);
  const production = flockProductionEstimate(state);

  return (
    <div className="game-shell min-h-screen p-3 sm:p-5 lg:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <StatusBar state={state} inventoryValue={inventoryValue} productionEstimate={production} />

        {(state.gameOver || state.victory) && (
          <div className={`rounded-2xl p-6 text-center border-2 ${state.victory ? 'bg-green-50 border-green-300' : 'bg-rose-50 border-rose-300'}`}>
            <h2 className="text-2xl font-serif text-amber-950 mb-2">
              {state.victory ? 'A thriving homestead' : 'The farm stands quiet'}
            </h2>
            <p className="text-amber-900/80 mb-4">{state.pausedMessage}</p>
            <p className="text-sm text-amber-700/70 mb-4">
              {state.day} days · ${state.totalRevenue.toFixed(0)} revenue · {state.animals.length} animals · margin{' '}
              {state.economy.totalRevenue > 0
                ? (((state.economy.totalRevenue - state.economy.totalExpenses) / state.economy.totalRevenue) * 100).toFixed(0)
                : 0}
              %
            </p>
            <button type="button" onClick={() => dispatch({ type: 'NEW_GAME' })} className="end-day-btn px-6 py-2.5 rounded-xl font-semibold">
              Start fresh
            </button>
          </div>
        )}

        <HomesteadScene state={state} />

        <div className="flex gap-1 lg:hidden bg-white/50 p-1 rounded-xl border border-amber-200/80 overflow-x-auto">
          {(['chores', 'market', 'housing', 'breeding', 'economy'] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[70px] py-2 rounded-lg text-xs capitalize ${activeTab === tab ? 'bg-amber-200/90 font-semibold' : 'text-amber-800/70'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4">
            <AnimalPanel
              state={state}
              onBreakBroodiness={(id) => handleDispatch({ type: 'BREAK_BROODINESS', animalId: id })}
              onMoveAnimal={(animalId, housingId) => handleDispatch({ type: 'MOVE_ANIMAL', animalId, housingId })}
            />
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className={activeTab === 'chores' ? 'block' : 'hidden lg:block'}>
              <ActionPanel state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'market' ? 'block' : 'hidden lg:block'}>
              <LivestockMarket state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'housing' ? 'block' : 'hidden lg:block'}>
              <HousingPanel state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'breeding' ? 'block' : 'hidden lg:block'}>
              <BreedingPanel state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'economy' ? 'block' : 'hidden lg:block'}>
              <EconomyPanel state={state} dispatch={handleDispatch} />
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <GoalsCard state={state} />
            <EventsLog events={state.events} />
          </div>
        </div>

        <footer className="text-center text-xs text-amber-800/50 py-4">
          Henhouse Haven — chickens, ducks, goats, breeding & farm economics. Auto-saves.
        </footer>
      </div>
    </div>
  );
};

const GoalsCard: React.FC<{ state: GameState }> = ({ state }) => (
  <section className="panel rounded-2xl p-4">
    <h2 className="panel-title">Homestead goals</h2>
    <ul className="text-sm space-y-2 text-amber-900/80">
      <Goal label="Reputation" current={state.reputation} target={VICTORY_REPUTATION} />
      <Goal label="Revenue" current={state.totalRevenue} target={VICTORY_REVENUE} prefix="$" />
      <Goal label="Days tended" current={state.day} target={VICTORY_DAYS} />
      <Goal label="Species kept" current={new Set(state.animals.map((a) => a.species)).size} target={3} />
    </ul>
    <p className="text-xs text-amber-700/60 mt-3">
      Breed for premium egg colors, diversify into ducks and goats, and sign CSA subscribers for steady income.
    </p>
  </section>
);

const Goal: React.FC<{ label: string; current: number; target: number; prefix?: string }> = ({
  label,
  current,
  target,
  prefix = '',
}) => {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <li>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>{prefix}{Math.floor(current)} / {prefix}{target}</span>
      </div>
      <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
};

export default App;
