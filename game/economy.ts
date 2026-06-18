import type { EggColor, EconomyStats, GameState, Inventory, Season } from '../types';
import {
  CHEESE_PRICE,
  DUCK_EGG_PRICE,
  EGG_PRICES,
  FERTILE_EGG_BASE,
  MILK_PRICE,
  SEASON_MARKET,
  WEEKEND_BONUS,
  isWeekend,
} from './constants';
import { fertileEggValue } from './breeding';

export function calcMarketMultiplier(state: GameState): number {
  let mult = SEASON_MARKET[state.season];
  if (isWeekend(state.day)) mult *= WEEKEND_BONUS;
  mult *= 1 + state.reputation / 250;
  return mult;
}

export function eggCartonValue(eggs: Inventory['eggs'], mult: number): number {
  return (
    (Object.entries(eggs) as [EggColor, number][]).reduce(
      (sum, [color, count]) => sum + count * EGG_PRICES[color],
      0
    ) * mult
  );
}

export function duckEggValue(count: number, mult: number): number {
  return count * DUCK_EGG_PRICE * mult;
}

export function milkValue(jugs: number, mult: number): number {
  return jugs * MILK_PRICE * mult;
}

export function cheeseValue(blocks: number, mult: number): number {
  return blocks * CHEESE_PRICE * mult;
}

export function fertileEggsValue(eggs: Inventory['fertileEggs'], mult: number): number {
  return eggs.reduce((sum, e) => sum + fertileEggValue(e), 0) * mult;
}

export function recordRevenue(economy: EconomyStats, amount: number): EconomyStats {
  return {
    ...economy,
    totalRevenue: economy.totalRevenue + amount,
    lastDayRevenue: economy.lastDayRevenue + amount,
  };
}

export function recordExpense(economy: EconomyStats, amount: number, kind: 'feed' | 'upkeep'): EconomyStats {
  return {
    ...economy,
    totalExpenses: economy.totalExpenses + amount,
    lastDayExpenses: economy.lastDayExpenses + amount,
    feedExpenses: kind === 'feed' ? economy.feedExpenses + amount : economy.feedExpenses,
    upkeepExpenses: kind === 'upkeep' ? economy.upkeepExpenses + amount : economy.upkeepExpenses,
  };
}

export function resetDailyLedger(economy: EconomyStats, marketMultiplier: number): EconomyStats {
  return {
    ...economy,
    lastDayRevenue: 0,
    lastDayExpenses: 0,
    marketMultiplier,
  };
}

export function csaWeeklyIncome(subscribers: number): number {
  return subscribers * 28;
}

export function seasonDemandLabel(season: Season): string {
  const labels: Record<Season, string> = {
    spring: 'Spring demand steady',
    summer: 'Summer slowdown',
    fall: 'Fall farmers market peak',
    winter: 'Winter egg premium',
  };
  return labels[season];
}

export function profitMargin(economy: EconomyStats): number {
  if (economy.totalRevenue <= 0) return 0;
  return ((economy.totalRevenue - economy.totalExpenses) / economy.totalRevenue) * 100;
}
