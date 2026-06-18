import type {
  Animal,
  GameState,
  Housing,
  LegacyGameState,
  LegacyChicken,
} from '../types';
import { createGenetics } from './breeding';
import { emptyEggs } from './constants';

function isLegacySave(raw: unknown): raw is LegacyGameState {
  const s = raw as LegacyGameState;
  return Boolean(s && s.chickens && !('animals' in (s as object)));
}

export function migrateSave(raw: unknown): GameState | null {
  if (!raw || typeof raw !== 'object') return null;

  if (!isLegacySave(raw)) {
    return raw as GameState;
  }

  const legacy = raw;
  const coopId = 'coop-main';

  const housings: Housing[] = [
    {
      id: coopId,
      typeId: 'backyard-coop',
      cleanliness: legacy.coopCleanliness ?? 85,
      waterLevel: legacy.waterLevel ?? 90,
      autoWaterer: legacy.coop?.autoWaterer ?? false,
      dustBath: legacy.coop?.dustBath ?? false,
      predatorFence: legacy.coop?.predatorFence ?? false,
    },
  ];

  const animals: Animal[] = (legacy.chickens ?? []).map((c: LegacyChicken) => ({
    id: c.id,
    name: c.name,
    species: 'chicken' as const,
    breedId: c.breedId,
    sex: 'female' as const,
    ageMonths: c.ageMonths,
    health: c.health,
    happiness: c.happiness,
    housingId: coopId,
    genetics: createGenetics(c.breedId),
    isBroody: c.isBroody,
    isMolting: c.isMolting,
    isPregnant: false,
    daysSinceProduction: c.daysSinceEgg,
    parasiteLoad: c.parasiteLoad,
  }));

  const inv = legacy.inventory ?? {};
  return {
    day: legacy.day,
    season: legacy.season,
    money: legacy.money,
    reputation: legacy.reputation,
    animals,
    housings,
    inventory: {
      layerFeedLbs: inv.feedLbs ?? inv.layerFeedLbs ?? 40,
      duckFeedLbs: inv.duckFeedLbs ?? 0,
      hayBales: inv.hayBales ?? 0,
      eggs: inv.eggs ?? emptyEggs(),
      duckEggs: inv.duckEggs ?? 0,
      milkJugs: inv.milkJugs ?? 0,
      cheeseBlocks: inv.cheeseBlocks ?? 0,
      medicine: inv.medicine ?? 0,
      fertileEggs: inv.fertileEggs ?? [],
    },
    incubations: [],
    economy: {
      totalRevenue: legacy.totalRevenue,
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
        id: 'migrate',
        day: legacy.day,
        message: 'Save migrated to homestead format — explore housing, breeding, and new livestock!',
        type: 'info',
      },
      ...legacy.events.slice(0, 20),
    ],
    actionsRemaining: legacy.actionsRemaining,
    totalEggsSold: legacy.totalEggsSold,
    totalRevenue: legacy.totalRevenue,
    gameOver: legacy.gameOver,
    victory: legacy.victory,
    pausedMessage: legacy.pausedMessage,
  };
}

export function validateState(state: GameState): GameState {
  if (state.housings?.length && state.animals) return state;
  return migrateSave(state) ?? state;
}
