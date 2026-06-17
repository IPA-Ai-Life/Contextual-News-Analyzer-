import React, { useCallback, useEffect, useReducer, useState } from 'react';
import { ActionPanel } from './components/ActionPanel';
import { CoopScene } from './components/CoopScene';
import { EventsLog } from './components/EventsLog';
import { FlockPanel } from './components/FlockPanel';
import { HatcheryPanel } from './components/HatcheryPanel';
import { StatusBar } from './components/StatusBar';
import { UpgradesPanel } from './components/UpgradesPanel';
import { SAVE_KEY } from './game/constants';
import { eggInventoryValue, flockProductionEstimate, gameReducer } from './game/engine';
import { createInitialState } from './game/initialState';
import type { GameAction, GameState } from './types';

function loadSavedGame(): GameState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as GameState;
  } catch {
    return null;
  }
}

const App: React.FC = () => {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => loadSavedGame() ?? createInitialState());
  const [activeTab, setActiveTab] = useState<'chores' | 'hatchery' | 'upgrades'>('chores');

  useEffect(() => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }, [state]);

  const handleDispatch = useCallback((action: GameAction) => {
    dispatch(action);
  }, []);

  const eggValue = eggInventoryValue(state);
  const production = flockProductionEstimate(state);

  return (
    <div className="game-shell min-h-screen p-3 sm:p-5 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <StatusBar state={state} eggValue={eggValue} productionEstimate={production} />

        {(state.gameOver || state.victory) && (
          <div
            className={`rounded-2xl p-6 text-center border-2 ${
              state.victory ? 'bg-green-50 border-green-300' : 'bg-rose-50 border-rose-300'
            }`}
          >
            <h2 className="text-2xl font-serif text-amber-950 mb-2">
              {state.victory ? 'A thriving homestead' : 'The coop stands quiet'}
            </h2>
            <p className="text-amber-900/80 mb-4">{state.pausedMessage}</p>
            <p className="text-sm text-amber-700/70 mb-4">
              {state.day} days · ${state.totalRevenue.toFixed(0)} revenue · {state.totalEggsSold} eggs sold
            </p>
            <button
              type="button"
              onClick={() => dispatch({ type: 'NEW_GAME' })}
              className="end-day-btn px-6 py-2.5 rounded-xl font-semibold"
            >
              Start a new flock
            </button>
          </div>
        )}

        <CoopScene state={state} />

        {/* Mobile tabs */}
        <div className="flex gap-1 lg:hidden bg-white/50 p-1 rounded-xl border border-amber-200/80">
          {(['chores', 'hatchery', 'upgrades'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm capitalize ${
                activeTab === tab ? 'bg-amber-200/90 font-semibold' : 'text-amber-800/70'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-1">
            <FlockPanel
              state={state}
              onBreakBroodiness={(id) => handleDispatch({ type: 'BREAK_BROODINESS', chickenId: id })}
            />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className={activeTab === 'chores' ? 'block' : 'hidden lg:block'}>
              <ActionPanel state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'hatchery' ? 'block' : 'hidden lg:block'}>
              <HatcheryPanel state={state} dispatch={handleDispatch} />
            </div>
            <div className={activeTab === 'upgrades' ? 'block' : 'hidden lg:block'}>
              <UpgradesPanel state={state} dispatch={handleDispatch} />
            </div>
          </div>

          <div className="lg:col-span-1 space-y-4">
            <GoalsCard state={state} />
            <EventsLog events={state.events} />
          </div>
        </div>

        <footer className="text-center text-xs text-amber-800/50 py-4">
          Henhouse Haven — a cozy small-flock simulator. Progress saves automatically.
        </footer>
      </div>
    </div>
  );
};

const GoalsCard: React.FC<{ state: GameState }> = ({ state }) => (
  <section className="panel rounded-2xl p-4">
    <h2 className="panel-title">Season goals</h2>
    <ul className="text-sm space-y-2 text-amber-900/80">
      <Goal label="Reputation" current={state.reputation} target={75} />
      <Goal label="Revenue" current={state.totalRevenue} target={400} prefix="$" />
      <Goal label="Days tended" current={state.day} target={120} />
    </ul>
    <p className="text-xs text-amber-700/60 mt-3">
      Tip: Blue, green, and chocolate eggs fetch premium prices at the farm stand.
    </p>
  </section>
);

const Goal: React.FC<{
  label: string;
  current: number;
  target: number;
  prefix?: string;
}> = ({ label, current, target, prefix = '' }) => {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <li>
      <div className="flex justify-between text-xs mb-1">
        <span>{label}</span>
        <span>
          {prefix}
          {Math.floor(current)} / {prefix}
          {target}
        </span>
      </div>
      <div className="h-2 rounded-full bg-amber-100 overflow-hidden">
        <div className="h-full rounded-full bg-amber-500/80" style={{ width: `${pct}%` }} />
      </div>
    </li>
  );
};

export default App;
