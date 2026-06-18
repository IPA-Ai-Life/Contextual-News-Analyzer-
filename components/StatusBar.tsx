import React from 'react';
import { isWeekend } from '../game/constants';
import type { GameState } from '../types';

interface StatusBarProps {
  state: GameState;
  inventoryValue: number;
  productionEstimate: number;
}

const SEASON_LABELS = {
  spring: '🌱 Spring',
  summer: '☀️ Summer',
  fall: '🍂 Fall',
  winter: '❄️ Winter',
};

export const StatusBar: React.FC<StatusBarProps> = ({ state, inventoryValue, productionEstimate }) => {
  const avgClean =
    state.housings.reduce((s, h) => s + h.cleanliness, 0) / Math.max(1, state.housings.length);
  const avgWater =
    state.housings.reduce((s, h) => s + h.waterLevel, 0) / Math.max(1, state.housings.length);

  return (
    <header className="status-bar rounded-2xl px-4 py-3 sm:px-6 flex flex-wrap gap-3 items-center justify-between">
      <div>
        <h1 className="text-xl sm:text-2xl font-serif text-amber-950 tracking-tight">Henhouse Haven</h1>
        <p className="text-xs text-amber-800/70">Small homestead strategy</p>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3 text-sm">
        <StatPill label="Day" value={String(state.day)} />
        <StatPill label="Season" value={SEASON_LABELS[state.season]} />
        <StatPill label="Funds" value={`$${state.money.toFixed(0)}`} accent />
        <StatPill label="Actions" value={`${state.actionsRemaining}/5`} />
        <StatPill label="Market" value={`${state.economy.marketMultiplier.toFixed(2)}×`} />
        {isWeekend(state.day) && <StatPill label="Weekend" value="🛒" accent />}
      </div>

      <div className="w-full sm:w-auto flex flex-wrap gap-2 text-xs text-amber-900/80">
        <Meter label="Clean" value={avgClean} color="#7A9E5E" />
        <Meter label="Water" value={avgWater} color="#5B9BD5" />
        <Meter label="Layer feed" value={Math.min(100, (state.inventory.layerFeedLbs / 80) * 100)} color="#C9A227" />
        <span className="px-2 py-1 rounded-lg bg-amber-100/80 border border-amber-200">
          ~{productionEstimate.toFixed(1)} prod/wk · Stock ${inventoryValue.toFixed(0)}
        </span>
      </div>
    </header>
  );
};

const StatPill: React.FC<{ label: string; value: string; accent?: boolean }> = ({ label, value, accent }) => (
  <div className={`px-3 py-1.5 rounded-xl border ${accent ? 'bg-amber-200/90 border-amber-300' : 'bg-white/70 border-amber-200/80'}`}>
    <span className="text-amber-700/70 text-xs block">{label}</span>
    <span className="font-semibold text-amber-950">{value}</span>
  </div>
);

const Meter: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/60 border border-amber-200/60 min-w-[100px]">
    <span className="w-12 text-amber-800/70">{label}</span>
    <div className="flex-1 h-2 rounded-full bg-amber-100 overflow-hidden">
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
    </div>
  </div>
);
