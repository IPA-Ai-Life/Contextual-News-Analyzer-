import type { GameState, Housing } from '../types';
import {
  ACTIONS_PER_DAY,
  STARTING_DUCK_FEED,
  STARTING_HAY,
  STARTING_LAYER_FEED,
  STARTING_MONEY,
  emptyEggs,
} from './constants';

export function createStarterHousing(): Housing {
  return {
    id: 'coop-main',
    typeId: 'backyard-coop',
    cleanliness: 85,
    waterLevel: 90,
    autoWaterer: false,
    dustBath: false,
    predatorFence: false,
  };
}

export function createInitialState(): GameState {
  return {
    day: 1,
    season: 'spring',
    money: STARTING_MONEY,
    reputation: 10,
    animals: [],
    housings: [createStarterHousing()],
    inventory: {
      layerFeedLbs: STARTING_LAYER_FEED,
      duckFeedLbs: STARTING_DUCK_FEED,
      hayBales: STARTING_HAY,
      eggs: emptyEggs(),
      duckEggs: 0,
      milkJugs: 0,
      cheeseBlocks: 0,
      medicine: 0,
      fertileEggs: [],
    },
    incubations: [],
    economy: {
      totalRevenue: 0,
      totalExpenses: 0,
      feedExpenses: 0,
      upkeepExpenses: 0,
      lastDayRevenue: 0,
      lastDayExpenses: 0,
      marketMultiplier: 1,
      csaSubscribers: 0,
    },
    events: [
      {
        id: 'welcome',
        day: 1,
        message:
          'Welcome to your small homestead! Start with a few pullets, then expand into ducks, dairy goats, and breeding. Weekend markets pay better.',
        type: 'info',
      },
    ],
    actionsRemaining: ACTIONS_PER_DAY,
    totalEggsSold: 0,
    totalRevenue: 0,
    gameOver: false,
    victory: false,
    pausedMessage: null,
  };
}
