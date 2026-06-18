import type { EggColor, Inventory, Season, Species } from '../types';

export const ACTIONS_PER_DAY = 5;
export const STARTING_MONEY = 320;
export const STARTING_LAYER_FEED = 40;
export const STARTING_DUCK_FEED = 0;
export const STARTING_HAY = 2;

export const LAYER_FEED_PRICE = 0.45;
export const DUCK_FEED_PRICE = 0.52;
export const HAY_BALE_PRICE = 6;
export const MEDICINE_PRICE = 18;
export const CHEESE_MILK_RATIO = 2; // 2 milk -> 1 cheese

export const EGG_PRICES: Record<EggColor, number> = {
  brown: 0.35,
  cream: 0.38,
  white: 0.32,
  blue: 0.55,
  green: 0.6,
  chocolate: 0.75,
};

export const DUCK_EGG_PRICE = 0.48;
export const MILK_PRICE = 4.5;
export const CHEESE_PRICE = 9;
export const FERTILE_EGG_BASE = 1.25;

export const VICTORY_REPUTATION = 80;
export const VICTORY_DAYS = 150;
export const VICTORY_REVENUE = 900;
export const CSA_UNLOCK_REPUTATION = 25;
export const CSA_WEEKLY_INCOME = 28;
export const CSA_SIGNUP_COST = 0;

export const SAVE_KEY = 'henhouseHavenSave';

export const SEASON_MARKET: Record<Season, number> = {
  spring: 1.05,
  summer: 0.95,
  fall: 1.0,
  winter: 1.15,
};

export const WEEKEND_BONUS = 1.12;

export const INCUBATION_DAYS: Record<Species, number> = {
  chicken: 21,
  duck: 28,
  goat: 0,
  dog: 0,
  cat: 0,
};

export const BROODER_MAX_AGE = 3;

export function emptyEggs(): Inventory['eggs'] {
  return { brown: 0, cream: 0, white: 0, blue: 0, green: 0, chocolate: 0 };
}

export function isWeekend(day: number): boolean {
  return day % 7 === 6 || day % 7 === 0;
}

export function speciesFeedType(species: Species): 'layer' | 'duck' | 'hay' {
  if (species === 'duck') return 'duck';
  if (species === 'goat') return 'hay';
  return 'layer';
}
