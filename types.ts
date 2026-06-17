export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type EggColor = 'brown' | 'cream' | 'white' | 'blue' | 'green' | 'chocolate';
export type Temperament = 'calm' | 'active' | 'flighty' | 'broody-prone';

export interface Breed {
  id: string;
  name: string;
  origin: string;
  description: string;
  eggColor: EggColor;
  eggsPerWeek: number;
  temperament: Temperament;
  coldHardy: number; // 1-5
  heatTolerant: number; // 1-5
  broodiness: number; // 0-5
  feedEfficiency: number; // 1-5, higher = less feed
  foraging: number; // 1-5
  chickPrice: number;
  plumage: string;
  accent: string;
  comb: 'single' | 'rose' | 'pea' | 'walnut';
}

export interface Chicken {
  id: string;
  name: string;
  breedId: string;
  ageMonths: number;
  health: number; // 0-100
  happiness: number; // 0-100
  isBroody: boolean;
  isMolting: boolean;
  daysSinceEgg: number;
  parasiteLoad: number; // 0-100
}

export interface CoopUpgrades {
  capacity: number;
  runSize: 'none' | 'small' | 'medium' | 'large';
  nestingBoxes: number;
  autoWaterer: boolean;
  dustBath: boolean;
  predatorFence: boolean;
}

export interface Inventory {
  feedLbs: number;
  eggs: Record<EggColor, number>;
  medicine: number;
}

export interface GameEvent {
  id: string;
  day: number;
  message: string;
  type: 'info' | 'good' | 'warning' | 'bad';
}

export interface GameState {
  day: number;
  season: Season;
  money: number;
  reputation: number;
  coopCleanliness: number; // 0-100
  waterLevel: number; // 0-100
  chickens: Chicken[];
  coop: CoopUpgrades;
  inventory: Inventory;
  events: GameEvent[];
  actionsRemaining: number;
  totalEggsSold: number;
  totalRevenue: number;
  gameOver: boolean;
  victory: boolean;
  pausedMessage: string | null;
}

export type GameAction =
  | { type: 'CLEAN_COOP' }
  | { type: 'REFILL_FEED' }
  | { type: 'REFILL_WATER' }
  | { type: 'COLLECT_EGGS' }
  | { type: 'HEALTH_CHECK' }
  | { type: 'TREAT_PARASITES' }
  | { type: 'BREAK_BROODINESS'; chickenId: string }
  | { type: 'BUY_FEED'; lbs: number }
  | { type: 'BUY_MEDICINE' }
  | { type: 'BUY_CHICKEN'; breedId: string; name?: string }
  | { type: 'SELL_EGGS' }
  | { type: 'UPGRADE_RUN'; size: CoopUpgrades['runSize'] }
  | { type: 'UPGRADE_NESTING' }
  | { type: 'BUY_DUST_BATH' }
  | { type: 'BUY_PREDATOR_FENCE' }
  | { type: 'BUY_AUTO_WATERER' }
  | { type: 'EXPAND_COOP' }
  | { type: 'END_DAY' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; state: GameState };

export interface ActionCost {
  money?: number;
  actions?: number;
  feedLbs?: number;
  medicine?: number;
}

export interface DaySummary {
  eggsLaid: number;
  feedConsumed: number;
  moneyEarned: number;
  moneySpent: number;
  notes: string[];
}
