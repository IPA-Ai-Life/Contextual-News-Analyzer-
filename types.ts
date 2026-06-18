export type Season = 'spring' | 'summer' | 'fall' | 'winter';
export type EggColor = 'brown' | 'cream' | 'white' | 'blue' | 'green' | 'chocolate';
export type Temperament = 'calm' | 'active' | 'flighty' | 'broody-prone';
export type Species = 'chicken' | 'duck' | 'goat' | 'dog' | 'cat';
export type Sex = 'male' | 'female';
export type AnimalRole = 'layer' | 'dairy' | 'guardian' | 'mouser' | 'breeder';

export interface AnimalGenetics {
  lineageId: string;
  generation: number;
  eggColor?: EggColor;
  productionFactor: number; // 0.8-1.2 multiplier on base production
  vitality: number; // affects hatch rate & health
}

export interface AnimalBreed {
  id: string;
  species: Species;
  name: string;
  origin: string;
  description: string;
  role: AnimalRole;
  price: number;
  plumage: string;
  accent: string;
  coldHardy: number;
  heatTolerant: number;
  feedEfficiency: number;
  foraging: number;
  // poultry
  eggColor?: EggColor;
  eggsPerWeek?: number;
  temperament?: Temperament;
  broodiness?: number;
  comb?: 'single' | 'rose' | 'pea' | 'walnut';
  incubationDays?: number;
  // dairy
  milkPerWeek?: number;
  // utility
  predatorRepel?: number; // dog
  pestControl?: number; // cat
}

export interface Animal {
  id: string;
  name: string;
  species: Species;
  breedId: string;
  sex: Sex;
  ageMonths: number;
  health: number;
  happiness: number;
  housingId: string;
  genetics: AnimalGenetics;
  isBroody: boolean;
  isMolting: boolean;
  isPregnant: boolean;
  daysSinceProduction: number;
  parasiteLoad: number;
}

export interface HousingType {
  id: string;
  name: string;
  description: string;
  species: Species[];
  capacity: number;
  buildCost: number;
  dailyUpkeep: number;
  foragingBonus: number;
  happinessBonus: number;
  cleanlinessDecay: number;
  maxAgeMonths?: number; // brooder only
  minAgeMonths?: number;
  hasPond?: boolean;
  hasIncubator?: boolean;
  icon: string;
}

export interface Housing {
  id: string;
  typeId: string;
  cleanliness: number;
  waterLevel: number;
  autoWaterer: boolean;
  dustBath: boolean;
  predatorFence: boolean;
}

export interface FertileEgg {
  id: string;
  species: Species;
  breedId: string;
  genetics: AnimalGenetics;
  eggColor?: EggColor;
}

export interface IncubationBatch {
  id: string;
  species: Species;
  breedId: string;
  genetics: AnimalGenetics[];
  daysRemaining: number;
  totalDays: number;
  method: 'incubator' | 'broody';
  broodyAnimalId?: string;
  housingId: string;
}

export interface Inventory {
  layerFeedLbs: number;
  duckFeedLbs: number;
  hayBales: number;
  eggs: Record<EggColor, number>;
  duckEggs: number;
  milkJugs: number;
  cheeseBlocks: number;
  medicine: number;
  fertileEggs: FertileEgg[];
}

export interface EconomyStats {
  totalRevenue: number;
  totalExpenses: number;
  feedExpenses: number;
  upkeepExpenses: number;
  lastDayRevenue: number;
  lastDayExpenses: number;
  marketMultiplier: number;
  csaSubscribers: number;
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
  animals: Animal[];
  housings: Housing[];
  inventory: Inventory;
  incubations: IncubationBatch[];
  economy: EconomyStats;
  events: GameEvent[];
  actionsRemaining: number;
  totalEggsSold: number;
  totalRevenue: number;
  gameOver: boolean;
  victory: boolean;
  pausedMessage: string | null;
}

export type GameAction =
  | { type: 'CLEAN_HOUSING'; housingId: string }
  | { type: 'CLEAN_ALL_HOUSINGS' }
  | { type: 'REFILL_FEED'; feedType: 'layer' | 'duck' | 'hay' }
  | { type: 'REFILL_WATER'; housingId: string }
  | { type: 'COLLECT_PRODUCTS' }
  | { type: 'HEALTH_CHECK' }
  | { type: 'TREAT_PARASITES' }
  | { type: 'BREAK_BROODINESS'; animalId: string }
  | { type: 'BUY_FEED'; feedType: 'layer' | 'duck' | 'hay'; amount: number }
  | { type: 'BUY_MEDICINE' }
  | { type: 'BUY_ANIMAL'; breedId: string; sex: Sex; name?: string; housingId?: string }
  | { type: 'SELL_AT_MARKET'; product: 'eggs' | 'duckEggs' | 'milk' | 'cheese' | 'fertileEggs' }
  | { type: 'MAKE_CHEESE' }
  | { type: 'BUILD_HOUSING'; typeId: string }
  | { type: 'UPGRADE_HOUSING'; housingId: string; upgrade: 'autoWaterer' | 'dustBath' | 'predatorFence' }
  | { type: 'MOVE_ANIMAL'; animalId: string; housingId: string }
  | { type: 'COLLECT_FERTILE_EGGS' }
  | { type: 'START_INCUBATION'; housingId: string; eggIds: string[] }
  | { type: 'ASSIGN_BROODY'; animalId: string; eggIds: string[] }
  | { type: 'CANCEL_INCUBATION'; batchId: string }
  | { type: 'SIGN_CSA' }
  | { type: 'END_DAY' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; state: GameState };

export interface DaySummary {
  eggsLaid: number;
  duckEggsLaid: number;
  milkProduced: number;
  feedConsumed: number;
  moneyEarned: number;
  moneySpent: number;
  notes: string[];
}

// Legacy save format for migration
export interface LegacyChicken {
  id: string;
  name: string;
  breedId: string;
  ageMonths: number;
  health: number;
  happiness: number;
  isBroody: boolean;
  isMolting: boolean;
  daysSinceEgg: number;
  parasiteLoad: number;
}

export interface LegacyCoop {
  capacity: number;
  runSize: string;
  nestingBoxes: number;
  autoWaterer: boolean;
  dustBath: boolean;
  predatorFence: boolean;
}

export interface LegacyGameState {
  day: number;
  season: Season;
  money: number;
  reputation: number;
  coopCleanliness?: number;
  waterLevel?: number;
  chickens?: LegacyChicken[];
  coop?: LegacyCoop;
  inventory?: Partial<Inventory> & { feedLbs?: number; eggs?: Record<EggColor, number> };
  events: GameEvent[];
  actionsRemaining: number;
  totalEggsSold: number;
  totalRevenue: number;
  gameOver: boolean;
  victory: boolean;
  pausedMessage: string | null;
}
