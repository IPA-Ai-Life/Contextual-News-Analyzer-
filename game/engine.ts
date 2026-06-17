import { BREED_MAP, CHICKEN_NAMES } from '../data/breeds';
import type {
  Breed,
  Chicken,
  CoopUpgrades,
  DaySummary,
  EggColor,
  GameAction,
  GameEvent,
  GameState,
  Season,
} from '../types';
import {
  ACTIONS_PER_DAY,
  COOP_CLEAN_DECAY,
  EGG_PRICES,
  FEED_PRICE_PER_LB,
  MEDICINE_PRICE,
  RUN_FORAGING_BONUS,
  RUN_HAPPINESS_BONUS,
  RUN_UPGRADE_COST,
  VICTORY_DAYS,
  VICTORY_REPUTATION,
  VICTORY_REVENUE,
  WATER_DECAY,
} from './constants';
import { createInitialState } from './initialState';

let eventCounter = 0;

function uid(): string {
  return `${Date.now()}-${++eventCounter}`;
}

function seasonForDay(day: number): Season {
  const cycle = (day - 1) % 360;
  if (cycle < 90) return 'spring';
  if (cycle < 180) return 'summer';
  if (cycle < 270) return 'fall';
  return 'winter';
}

function randomName(existing: string[]): string {
  const pool = CHICKEN_NAMES.filter((n) => !existing.includes(n));
  if (pool.length === 0) return `Hen ${Math.floor(Math.random() * 900) + 100}`;
  return pool[Math.floor(Math.random() * pool.length)];
}

function addEvent(
  state: GameState,
  message: string,
  type: GameEvent['type'] = 'info'
): GameEvent[] {
  return [
    {
      id: uid(),
      day: state.day,
      message,
      type,
    },
    ...state.events.slice(0, 49),
  ];
}

function useAction(state: GameState): GameState {
  return { ...state, actionsRemaining: Math.max(0, state.actionsRemaining - 1) };
}

function ageModifier(months: number): number {
  if (months < 5) return 0;
  if (months < 18) return 1;
  if (months < 36) return 0.95;
  if (months < 48) return 0.75;
  return 0.5;
}

function seasonLayModifier(season: Season, breed: Breed): number {
  switch (season) {
    case 'spring':
      return 1.05;
    case 'summer':
      return breed.heatTolerant >= 4 ? 1 : 0.85;
    case 'fall':
      return 0.95;
    case 'winter':
      return breed.coldHardy >= 4 ? 0.8 : 0.55;
    default:
      return 1;
  }
}

function calcLayChance(chicken: Chicken, breed: Breed, state: GameState): number {
  if (chicken.isBroody || chicken.isMolting || chicken.health < 30) return 0;
  if (chicken.ageMonths < 5) return 0;

  const base = breed.eggsPerWeek / 7;
  const age = ageModifier(chicken.ageMonths);
  const season = seasonLayModifier(state.season, breed);
  const happiness = 0.5 + chicken.happiness / 200;
  const health = 0.4 + chicken.health / 170;
  const clean = 0.7 + state.coopCleanliness / 330;
  const feed = state.inventory.feedLbs > 0 ? 1 : 0.2;
  const parasite = 1 - chicken.parasiteLoad / 200;

  return Math.min(0.95, base * age * season * happiness * health * clean * feed * parasite);
}

function calcFeedNeed(chickens: Chicken[], breeds: Record<string, Breed>): number {
  return chickens.reduce((sum, c) => {
    const breed = breeds[c.breedId];
    if (!breed) return sum + 0.25;
    const efficiency = 0.22 - breed.feedEfficiency * 0.02;
    const forage = RUN_FORAGING_BONUS['none']; // applied at day end with coop
    return sum + Math.max(0.12, efficiency - forage);
  }, 0);
}

function overcrowdingPenalty(count: number, capacity: number): number {
  if (count <= capacity) return 0;
  return (count - capacity) * 12;
}

function updateChicken(
  chicken: Chicken,
  breed: Breed,
  state: GameState,
  feedShortage: boolean
): Chicken {
  let health = chicken.health;
  let happiness = chicken.happiness;
  let parasiteLoad = chicken.parasiteLoad;
  let isBroody = chicken.isBroody;
  let isMolting = chicken.isMolting;
  const ageMonths = chicken.ageMonths + 1 / 30;

  // Cleanliness & water
  if (state.coopCleanliness < 40) health -= 2;
  if (state.waterLevel < 30) health -= 3;
  if (feedShortage) {
    health -= 4;
    happiness -= 5;
  }

  // Season stress
  if (state.season === 'winter' && breed.coldHardy < 3) {
    health -= 1.5;
    happiness -= 2;
  }
  if (state.season === 'summer' && breed.heatTolerant < 3) {
    health -= 1.5;
    happiness -= 3;
  }

  // Overcrowding
  const crowd = overcrowdingPenalty(state.chickens.length, state.coop.capacity);
  happiness -= crowd / 10;
  health -= crowd / 20;

  // Run bonus
  happiness += RUN_HAPPINESS_BONUS[state.coop.runSize] / 30;
  if (state.coop.dustBath) parasiteLoad = Math.max(0, parasiteLoad - 3);

  // Broodiness roll
  if (!isBroody && state.season === 'spring' && Math.random() < breed.broodiness * 0.004) {
    isBroody = true;
  }
  if (isBroody) happiness -= 1;

  // Molting in fall
  if (state.season === 'fall' && !isMolting && Math.random() < 0.008) {
    isMolting = true;
  }
  if (isMolting && Math.random() < 0.06) isMolting = false;

  // Parasite creep
  if (state.coopCleanliness < 60) parasiteLoad += 1.5;
  parasiteLoad = Math.min(100, parasiteLoad);

  if (parasiteLoad > 50) {
    health -= 2;
    happiness -= 2;
  }

  // Recovery when well cared for
  if (state.coopCleanliness > 70 && state.waterLevel > 60 && !feedShortage) {
    health += 1;
    happiness += 1;
  }

  return {
    ...chicken,
    ageMonths,
    health: clamp(health, 0, 100),
    happiness: clamp(happiness, 0, 100),
    parasiteLoad,
    isBroody,
    isMolting,
    daysSinceEgg: chicken.daysSinceEgg + 1,
  };
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function processRandomEvent(state: GameState): { state: GameState; note?: string } {
  const roll = Math.random();
  let s = state;

  if (!state.coop.predatorFence && roll < 0.04) {
    s = {
      ...s,
      chickens: s.chickens.map((c) => ({
        ...c,
        happiness: clamp(c.happiness - 20, 0, 100),
        health: clamp(c.health - 5, 0, 100),
      })),
      events: addEvent(
        s,
        'A fox prowled near the fence at dusk! The flock is shaken — consider a predator apron.',
        'warning'
      ),
    };
    return { state: s, note: 'Predator scare' };
  }

  if (roll < 0.03 && s.chickens.length > 0) {
    const idx = Math.floor(Math.random() * s.chickens.length);
    const target = s.chickens[idx];
    const breed = BREED_MAP[target.breedId];
    s = {
      ...s,
      chickens: s.chickens.map((c, i) =>
        i === idx ? { ...c, health: clamp(c.health - 15, 0, 100) } : c
      ),
      events: addEvent(
        s,
        `${target.name} (${breed?.name ?? 'hen'}) seems eggbound. A warm bath and calcium helped — keep an eye on her.`,
        'warning'
      ),
    };
    return { state: s, note: 'Eggbound hen' };
  }

  if (roll < 0.05) {
    s = {
      ...s,
      reputation: clamp(s.reputation + 3, 0, 100),
      events: addEvent(
        s,
        'A neighbor raved about your eggs to the community board. Reputation +3.',
        'good'
      ),
    };
    return { state: s, note: 'Word of mouth' };
  }

  if (state.season === 'summer' && roll < 0.06) {
    s = {
      ...s,
      chickens: s.chickens.map((c) => {
        const breed = BREED_MAP[c.breedId];
        const penalty = breed && breed.heatTolerant < 4 ? 8 : 3;
        return { ...c, happiness: clamp(c.happiness - penalty, 0, 100) };
      }),
      events: addEvent(s, 'Heat wave today — extra shade and fresh water kept everyone alive.', 'warning'),
    };
    return { state: s, note: 'Heat wave' };
  }

  return { state: s };
}

function endDay(state: GameState): { state: GameState; summary: DaySummary } {
  const notes: string[] = [];
  let moneySpent = 0;
  let moneyEarned = 0;

  const feedPerBird = calcFeedNeed(state.chickens, BREED_MAP);
  const forageReduction =
    state.chickens.length *
    feedPerBird *
    RUN_FORAGING_BONUS[state.coop.runSize];
  const feedNeeded = Math.max(0, state.chickens.length * feedPerBird - forageReduction);
  const feedShortage = state.inventory.feedLbs < feedNeeded;

  let feedConsumed = Math.min(state.inventory.feedLbs, feedNeeded);
  let inventory = {
    ...state.inventory,
    feedLbs: state.inventory.feedLbs - feedConsumed,
  };

  if (feedShortage && state.chickens.length > 0) {
    notes.push('Ran low on feed — production and health suffered.');
  }

  let chickens = state.chickens.map((c) =>
    updateChicken(c, BREED_MAP[c.breedId], state, feedShortage)
  );

  // Laying
  let eggsLaid = 0;
  const eggs = { ...inventory.eggs };
  chickens = chickens.map((c) => {
    const breed = BREED_MAP[c.breedId];
    if (!breed) return c;
    const chance = calcLayChance(c, breed, state);
    if (Math.random() < chance) {
      eggs[breed.eggColor] += 1;
      eggsLaid += 1;
      return { ...c, daysSinceEgg: 0 };
    }
    return c;
  });
  inventory = { ...inventory, eggs };

  if (eggsLaid > 0) notes.push(`${eggsLaid} egg${eggsLaid === 1 ? '' : 's'} laid overnight.`);

  // Death check
  const dead = chickens.filter((c) => c.health <= 0);
  if (dead.length > 0) {
    chickens = chickens.filter((c) => c.health > 0);
    notes.push(`${dead.map((d) => d.name).join(', ')} succumbed to poor conditions.`);
  }

  let coopCleanliness = clamp(state.coopCleanliness - COOP_CLEAN_DECAY, 0, 100);
  let waterLevel = state.coop.autoWaterer
    ? 90
    : clamp(state.waterLevel - WATER_DECAY, 0, 100);

  const newDay = state.day + 1;
  const season = seasonForDay(newDay);

  let next: GameState = {
    ...state,
    day: newDay,
    season,
    chickens,
    inventory,
    coopCleanliness,
    waterLevel,
    actionsRemaining: ACTIONS_PER_DAY,
  };

  const eventResult = processRandomEvent(next);
  next = eventResult.state;
  if (eventResult.note) notes.push(eventResult.note);

  // Season change notice
  if (season !== state.season) {
    const labels: Record<Season, string> = {
      spring: 'Spring arrives — broodiness and laying pick up.',
      summer: 'Summer heat — shade and water are critical.',
      fall: 'Autumn leaves fall — molting season begins.',
      winter: 'Winter settles in — shorter days slow production.',
    };
    next = { ...next, events: addEvent(next, labels[season], 'info') };
  }

  // Game over / victory
  let gameOver = false;
  let victory = false;
  let pausedMessage: string | null = null;

  if (next.chickens.length === 0 && next.day > 14) {
    gameOver = true;
    pausedMessage = 'Your flock is gone. Small operations live and die by daily care. Try again?';
    next = {
      ...next,
      events: addEvent(next, 'Without hens, the coop stands quiet. Game over.', 'bad'),
    };
  } else if (
    next.reputation >= VICTORY_REPUTATION &&
    next.totalRevenue >= VICTORY_REVENUE &&
    next.day >= VICTORY_DAYS
  ) {
    victory = true;
    pausedMessage =
      'Your small egg stand is thriving — loyal customers, healthy hens, and a reputation built one dozen at a time.';
    next = {
      ...next,
      events: addEvent(next, 'Victory! Henhouse Haven is a sustainable small operation.', 'good'),
    };
  }

  next = { ...next, gameOver, victory, pausedMessage };

  return {
    state: next,
    summary: { eggsLaid, feedConsumed, moneyEarned, moneySpent, notes },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'NEW_GAME') return createInitialState();
  if (action.type === 'LOAD_GAME') return action.state;

  if (state.gameOver || state.victory) {
    if (action.type === 'NEW_GAME') return createInitialState();
    return state;
  }

  switch (action.type) {
    case 'CLEAN_COOP': {
      if (state.actionsRemaining <= 0) return state;
      return useAction({
        ...state,
        coopCleanliness: 100,
        events: addEvent(state, 'You mucked the coop and refreshed bedding. The air smells like cedar shavings.', 'good'),
      });
    }

    case 'REFILL_FEED': {
      if (state.actionsRemaining <= 0 || state.inventory.feedLbs >= 80) return state;
      const added = Math.min(20, 80 - state.inventory.feedLbs);
      return useAction({
        ...state,
        inventory: { ...state.inventory, feedLbs: state.inventory.feedLbs + added },
        events: addEvent(state, `Topped off feeders (+${added} lbs from stores).`, 'info'),
      });
    }

    case 'REFILL_WATER': {
      if (state.actionsRemaining <= 0) return state;
      return useAction({
        ...state,
        waterLevel: 100,
        events: addEvent(state, 'Clean waterers filled — cool and clear.', 'info'),
      });
    }

    case 'COLLECT_EGGS': {
      if (state.actionsRemaining <= 0) return state;
      const total = Object.values(state.inventory.eggs).reduce((a, b) => a + b, 0);
      if (total === 0) {
        return {
          ...state,
          events: addEvent(state, 'Nesting boxes are empty for now.', 'info'),
        };
      }
      return useAction({
        ...state,
        events: addEvent(state, `Gathered ${total} egg${total === 1 ? '' : 's'} into cartons.`, 'good'),
      });
    }

    case 'HEALTH_CHECK': {
      if (state.actionsRemaining <= 0) return state;
      const sick = state.chickens.filter((c) => c.health < 60 || c.parasiteLoad > 40);
      const healed = state.chickens.map((c) => ({
        ...c,
        health: clamp(c.health + 5, 0, 100),
        happiness: clamp(c.happiness + 3, 0, 100),
      }));
      const msg =
        sick.length > 0
          ? `Health round: ${sick.map((s) => s.name).join(', ')} need extra attention.`
          : 'Flock check — everyone looks bright-eyed and busy.';
      return useAction({
        ...state,
        chickens: healed,
        events: addEvent(state, msg, sick.length > 0 ? 'warning' : 'good'),
      });
    }

    case 'TREAT_PARASITES': {
      if (state.actionsRemaining <= 0 || state.inventory.medicine <= 0) return state;
      return useAction({
        ...state,
        inventory: { ...state.inventory, medicine: state.inventory.medicine - 1 },
        chickens: state.chickens.map((c) => ({
          ...c,
          parasiteLoad: Math.max(0, c.parasiteLoad - 40),
          health: clamp(c.health + 8, 0, 100),
        })),
        events: addEvent(state, 'Dusting treatment applied — mites routed for now.', 'good'),
      });
    }

    case 'BREAK_BROODINESS': {
      if (state.actionsRemaining <= 0) return state;
      const chicken = state.chickens.find((c) => c.id === action.chickenId);
      if (!chicken?.isBroody) return state;
      return useAction({
        ...state,
        chickens: state.chickens.map((c) =>
          c.id === action.chickenId
            ? { ...c, isBroody: false, happiness: clamp(c.happiness - 5, 0, 100) }
            : c
        ),
        events: addEvent(
          state,
          `${chicken.name} was gently moved off the nest — broodiness broken.`,
          'info'
        ),
      });
    }

    case 'BUY_FEED': {
      const lbs = action.lbs;
      const cost = lbs * FEED_PRICE_PER_LB;
      if (state.money < cost) return state;
      return {
        ...state,
        money: state.money - cost,
        inventory: { ...state.inventory, feedLbs: state.inventory.feedLbs + lbs },
        events: addEvent(state, `Purchased ${lbs} lbs layer feed for $${cost.toFixed(2)}.`, 'info'),
      };
    }

    case 'BUY_MEDICINE': {
      if (state.money < MEDICINE_PRICE) return state;
      return {
        ...state,
        money: state.money - MEDICINE_PRICE,
        inventory: { ...state.inventory, medicine: state.inventory.medicine + 1 },
        events: addEvent(state, `Bought poultry dusting powder ($${MEDICINE_PRICE}).`, 'info'),
      };
    }

    case 'BUY_CHICKEN': {
      const breed = BREED_MAP[action.breedId];
      if (!breed) return state;
      if (state.chickens.length >= state.coop.capacity) {
        return {
          ...state,
          events: addEvent(state, 'Coop is at capacity — expand before adding more hens.', 'warning'),
        };
      }
      if (state.money < breed.chickPrice) return state;

      const name = action.name ?? randomName(state.chickens.map((c) => c.name));
      const pullet: Chicken = {
        id: uid(),
        name,
        breedId: breed.id,
        ageMonths: 4 + Math.floor(Math.random() * 2),
        health: 90,
        happiness: 80,
        isBroody: false,
        isMolting: false,
        daysSinceEgg: 99,
        parasiteLoad: 0,
      };

      return {
        ...state,
        money: state.money - breed.chickPrice,
        chickens: [...state.chickens, pullet],
        events: addEvent(
          state,
          `${name}, a ${breed.name} pullet, joined the flock ($${breed.chickPrice}).`,
          'good'
        ),
      };
    }

    case 'SELL_EGGS': {
      if (state.actionsRemaining <= 0) return state;
      const eggs = state.inventory.eggs;
      let revenue = 0;
      let count = 0;
      (Object.keys(eggs) as EggColor[]).forEach((color) => {
        revenue += eggs[color] * EGG_PRICES[color];
        count += eggs[color];
      });
      if (count === 0) {
        return {
          ...state,
          events: addEvent(state, 'No eggs in inventory to sell.', 'info'),
        };
      }

      const repBonus = 1 + state.reputation / 200;
      const total = revenue * repBonus;
      const cleared = { brown: 0, cream: 0, white: 0, blue: 0, green: 0, chocolate: 0 };

      return useAction({
        ...state,
        money: state.money + total,
        totalEggsSold: state.totalEggsSold + count,
        totalRevenue: state.totalRevenue + total,
        reputation: clamp(state.reputation + 1, 0, 100),
        inventory: { ...state.inventory, eggs: cleared },
        events: addEvent(
          state,
          `Farm stand sales: ${count} eggs for $${total.toFixed(2)}.`,
          'good'
        ),
      });
    }

    case 'UPGRADE_RUN': {
      const cost = RUN_UPGRADE_COST[action.size];
      if (!cost || state.money < cost) return state;
      const order: CoopUpgrades['runSize'][] = ['none', 'small', 'medium', 'large'];
      const currentIdx = order.indexOf(state.coop.runSize);
      const newIdx = order.indexOf(action.size);
      if (newIdx <= currentIdx) return state;

      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, runSize: action.size },
        events: addEvent(
          state,
          `Run expanded to ${action.size} — hens have more room to scratch.`,
          'good'
        ),
      };
    }

    case 'UPGRADE_NESTING': {
      const cost = 35;
      if (state.money < cost || state.coop.nestingBoxes >= 6) return state;
      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, nestingBoxes: state.coop.nestingBoxes + 1 },
        events: addEvent(state, 'Added a nesting box — less queueing at lay time.', 'good'),
      };
    }

    case 'BUY_DUST_BATH': {
      const cost = 45;
      if (state.money < cost || state.coop.dustBath) return state;
      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, dustBath: true },
        events: addEvent(state, 'Dust bath station installed in the run.', 'good'),
      };
    }

    case 'BUY_PREDATOR_FENCE': {
      const cost = 120;
      if (state.money < cost || state.coop.predatorFence) return state;
      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, predatorFence: true },
        events: addEvent(state, 'Hardware cloth apron secured — sleep easier tonight.', 'good'),
      };
    }

    case 'BUY_AUTO_WATERER': {
      const cost = 65;
      if (state.money < cost || state.coop.autoWaterer) return state;
      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, autoWaterer: true },
        events: addEvent(state, 'Automatic waterer installed.', 'good'),
      };
    }

    case 'EXPAND_COOP': {
      const cost = 200;
      if (state.money < cost || state.coop.capacity >= 20) return state;
      return {
        ...state,
        money: state.money - cost,
        coop: { ...state.coop, capacity: state.coop.capacity + 4 },
        events: addEvent(state, 'Coop expansion complete — 4 more roost spaces.', 'good'),
      };
    }

    case 'END_DAY': {
      const { state: next, summary } = endDay(state);
      const summaryMsg = [
        `Day ${state.day} complete.`,
        ...summary.notes,
        summary.feedConsumed > 0
          ? `Feed used: ${summary.feedConsumed.toFixed(1)} lbs.`
          : null,
      ]
        .filter(Boolean)
        .join(' ');

      return {
        ...next,
        events: addEvent(next, summaryMsg, 'info'),
      };
    }

    default:
      return state;
  }
}

export function totalEggsInInventory(state: GameState): number {
  return Object.values(state.inventory.eggs).reduce((a, b) => a + b, 0);
}

export function eggInventoryValue(state: GameState): number {
  return (Object.entries(state.inventory.eggs) as [EggColor, number][]).reduce(
    (sum, [color, count]) => sum + count * EGG_PRICES[color],
    0
  );
}

export function flockProductionEstimate(state: GameState): number {
  return state.chickens.reduce((sum, c) => {
    const breed = BREED_MAP[c.breedId];
    if (!breed) return sum;
    return sum + calcLayChance(c, breed, state) * 7;
  }, 0);
}
