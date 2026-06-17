import type { EggColor } from '../types';

export const ACTIONS_PER_DAY = 4;
export const STARTING_MONEY = 280;
export const STARTING_FEED_LBS = 40;
export const FEED_PRICE_PER_LB = 0.45;
export const MEDICINE_PRICE = 18;
export const COOP_CLEAN_DECAY = 8;
export const WATER_DECAY = 12;

export const EGG_PRICES: Record<EggColor, number> = {
  brown: 0.35,
  cream: 0.38,
  white: 0.32,
  blue: 0.55,
  green: 0.6,
  chocolate: 0.75,
};

export const RUN_UPGRADE_COST: Record<string, number> = {
  small: 85,
  medium: 160,
  large: 280,
};

export const RUN_FORAGING_BONUS: Record<string, number> = {
  none: 0,
  small: 0.08,
  medium: 0.15,
  large: 0.22,
};

export const RUN_HAPPINESS_BONUS: Record<string, number> = {
  none: 0,
  small: 5,
  medium: 10,
  large: 15,
};

export const VICTORY_REPUTATION = 75;
export const VICTORY_DAYS = 120;
export const VICTORY_REVENUE = 400;

export const SAVE_KEY = 'henhouseHavenSave';
