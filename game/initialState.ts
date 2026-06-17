import type { GameState, Inventory } from '../types';
import { ACTIONS_PER_DAY, STARTING_FEED_LBS, STARTING_MONEY } from './constants';

const emptyEggs = (): Inventory['eggs'] => ({
  brown: 0,
  cream: 0,
  white: 0,
  blue: 0,
  green: 0,
  chocolate: 0,
});

export function createInitialState(): GameState {
  return {
    day: 1,
    season: 'spring',
    money: STARTING_MONEY,
    reputation: 10,
    coopCleanliness: 85,
    waterLevel: 90,
    chickens: [],
    coop: {
      capacity: 8,
      runSize: 'small',
      nestingBoxes: 3,
      autoWaterer: false,
      dustBath: false,
      predatorFence: false,
    },
    inventory: {
      feedLbs: STARTING_FEED_LBS,
      eggs: emptyEggs(),
      medicine: 0,
    },
    events: [
      {
        id: 'welcome',
        day: 1,
        message:
          'Welcome to Henhouse Haven — a small backyard operation. Start with a few pullets, keep the coop tidy, and build a loyal egg stand.',
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
