import { BREED_MAP } from '../data/breeds';
import { HOUSING_TYPE_MAP, HOUSING_UPGRADE_COST } from '../data/housing';
import { randomAnimalName } from '../data/names';
import type {
  Animal,
  AnimalBreed,
  DaySummary,
  GameAction,
  GameEvent,
  GameState,
  Housing,
  HousingType,
  IncubationBatch,
  Season,
  Species,
} from '../types';
import {
  calcHatchRate,
  createGenetics,
  dailyFertileEggChance,
  rollHatchCount,
} from './breeding';
import {
  ACTIONS_PER_DAY,
  CHEESE_MILK_RATIO,
  CSA_UNLOCK_REPUTATION,
  CSA_WEEKLY_INCOME,
  DUCK_FEED_PRICE,
  HAY_BALE_PRICE,
  INCUBATION_DAYS,
  LAYER_FEED_PRICE,
  MEDICINE_PRICE,
  VICTORY_DAYS,
  VICTORY_REPUTATION,
  VICTORY_REVENUE,
} from './constants';
import {
  calcMarketMultiplier,
  cheeseValue,
  csaWeeklyIncome,
  duckEggValue,
  eggCartonValue,
  fertileEggsValue,
  milkValue,
  recordExpense,
  recordRevenue,
  resetDailyLedger,
} from './economy';
import { createInitialState } from './initialState';

let eventCounter = 0;

function uid(): string {
  return `${Date.now()}-${++eventCounter}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function seasonForDay(day: number): Season {
  const cycle = (day - 1) % 360;
  if (cycle < 90) return 'spring';
  if (cycle < 180) return 'summer';
  if (cycle < 270) return 'fall';
  return 'winter';
}

function addEvent(state: GameState, message: string, type: GameEvent['type'] = 'info'): GameEvent[] {
  return [{ id: uid(), day: state.day, message, type }, ...state.events.slice(0, 59)];
}

function useAction(state: GameState): GameState {
  return { ...state, actionsRemaining: Math.max(0, state.actionsRemaining - 1) };
}

function getHousingType(h: Housing): HousingType {
  return HOUSING_TYPE_MAP[h.typeId] ?? HOUSING_TYPE_MAP['backyard-coop'];
}

function animalsInHousing(state: GameState, housingId: string): Animal[] {
  return state.animals.filter((a) => a.housingId === housingId);
}

function housingCapacityUsed(state: GameState, housingId: string): number {
  return animalsInHousing(state, housingId).length;
}

function canFitAnimal(state: GameState, housingId: string, species: Species, ageMonths: number): boolean {
  const housing = state.housings.find((h) => h.id === housingId);
  if (!housing) return false;
  const type = getHousingType(housing);
  if (type.species.length > 0 && !type.species.includes(species)) return false;
  if (type.maxAgeMonths !== undefined && ageMonths > type.maxAgeMonths) return false;
  if (type.minAgeMonths !== undefined && ageMonths < type.minAgeMonths) return false;
  return housingCapacityUsed(state, housingId) < type.capacity;
}

function findHousingForSpecies(state: GameState, species: Species, ageMonths = 5): string | null {
  for (const h of state.housings) {
    if (canFitAnimal(state, h.id, species, ageMonths)) return h.id;
  }
  return null;
}

function predatorDefense(state: GameState): number {
  return state.animals
    .filter((a) => a.species === 'dog')
    .reduce((sum, d) => sum + (BREED_MAP[d.breedId]?.predatorRepel ?? 0) * (d.health / 100), 0);
}

function pestReduction(state: GameState): number {
  return (
    state.animals
      .filter((a) => a.species === 'cat')
      .reduce((sum, c) => sum + (BREED_MAP[c.breedId]?.pestControl ?? 0) * (c.health / 100), 0) / 10
  );
}

function ageLayModifier(months: number): number {
  if (months < 5) return 0;
  if (months < 18) return 1;
  if (months < 36) return 0.95;
  if (months < 48) return 0.75;
  return 0.5;
}

function seasonModifier(season: Season, breed: AnimalBreed): number {
  if (season === 'spring') return 1.05;
  if (season === 'summer') return breed.heatTolerant >= 4 ? 1 : 0.85;
  if (season === 'fall') return 0.95;
  return breed.coldHardy >= 4 ? 0.8 : 0.55;
}

function calcLayChance(animal: Animal, breed: AnimalBreed, housing: Housing, state: GameState): number {
  if (animal.sex !== 'female' || animal.isBroody || animal.isMolting || animal.health < 30) return 0;
  if (animal.ageMonths < 5) return 0;
  const hType = getHousingType(housing);
  const base = (breed.eggsPerWeek ?? 0) / 7;
  const mult =
    ageLayModifier(animal.ageMonths) *
    seasonModifier(state.season, breed) *
    (0.5 + animal.happiness / 200) *
    (0.4 + animal.health / 170) *
    (0.7 + housing.cleanliness / 330) *
    (state.inventory.layerFeedLbs > 0 || state.inventory.duckFeedLbs > 0 ? 1 : 0.2) *
    (1 - animal.parasiteLoad / 200) *
    animal.genetics.productionFactor *
    (1 + hType.foragingBonus);
  return Math.min(0.95, base * mult);
}

function calcFeedPerAnimal(animal: Animal, breed: AnimalBreed, hType: HousingType): number {
  const base =
    animal.species === 'goat' ? 0.35 : animal.species === 'duck' ? 0.28 : 0.22 - breed.feedEfficiency * 0.02;
  const size = animal.species === 'dog' ? 0.45 : animal.species === 'cat' ? 0.08 : base;
  return Math.max(0.08, size - hType.foragingBonus * 0.3);
}

function updateAnimal(
  animal: Animal,
  breed: AnimalBreed,
  housing: Housing,
  state: GameState,
  feedShortage: boolean
): Animal {
  const hType = getHousingType(housing);
  let { health, happiness, parasiteLoad, isBroody, isMolting, isPregnant } = animal;
  const ageMonths = animal.ageMonths + 1 / 30;

  if (housing.cleanliness < 40) health -= 2;
  if (housing.waterLevel < 30 && animal.species !== 'cat') health -= 3;
  if (feedShortage) {
    health -= 4;
    happiness -= 5;
  }
  if (state.season === 'winter' && breed.coldHardy < 3) {
    health -= 1.5;
    happiness -= 2;
  }
  if (state.season === 'summer' && breed.heatTolerant < 3) {
    health -= 1.5;
    happiness -= 3;
  }

  const count = housingCapacityUsed(state, housing.id);
  if (count > hType.capacity) {
    happiness -= (count - hType.capacity) * 2;
    health -= count - hType.capacity;
  }

  happiness += hType.happinessBonus / 30;
  if (housing.dustBath && (animal.species === 'chicken' || animal.species === 'duck')) {
    parasiteLoad = Math.max(0, parasiteLoad - 3);
  }
  parasiteLoad = Math.max(0, parasiteLoad - pestReduction(state));

  if (
    !isBroody &&
    animal.sex === 'female' &&
    state.season === 'spring' &&
    (breed.broodiness ?? 0) > 0 &&
    Math.random() < (breed.broodiness ?? 0) * 0.004
  ) {
    isBroody = true;
  }
  if (isBroody) happiness -= 1;

  if (
    state.season === 'fall' &&
    !isMolting &&
    animal.species !== 'dog' &&
    animal.species !== 'cat' &&
    Math.random() < 0.008
  ) {
    isMolting = true;
  }
  if (isMolting && Math.random() < 0.06) isMolting = false;

  if (housing.cleanliness < 60) parasiteLoad += 1.5;
  parasiteLoad = Math.min(100, parasiteLoad);
  if (parasiteLoad > 50) {
    health -= 2;
    happiness -= 2;
  }

  if (housing.cleanliness > 70 && housing.waterLevel > 60 && !feedShortage) {
    health += 1;
    happiness += 1;
  }

  if (animal.species === 'goat' && animal.sex === 'female' && animal.ageMonths > 8) {
    const bucks = state.animals.some((a) => a.species === 'goat' && a.sex === 'male' && a.health > 30);
    if (bucks && !isPregnant && state.season === 'fall' && Math.random() < 0.02) isPregnant = true;
  }

  return {
    ...animal,
    ageMonths,
    health: clamp(health, 0, 100),
    happiness: clamp(happiness, 0, 100),
    parasiteLoad,
    isBroody,
    isMolting,
    isPregnant,
    daysSinceProduction: animal.daysSinceProduction + 1,
  };
}

function processIncubations(state: GameState): { state: GameState; notes: string[] } {
  const notes: string[] = [];
  let animals = [...state.animals];
  const incubations: IncubationBatch[] = [];

  for (const batch of state.incubations) {
    const remaining = batch.daysRemaining - 1;
    if (remaining > 0) {
      incubations.push({ ...batch, daysRemaining: remaining });
      continue;
    }

    const hatched = rollHatchCount(batch.genetics, batch.method);
    const breed = BREED_MAP[batch.breedId];
    const brooderId = state.housings.find((h) => h.typeId === 'brooder')?.id;
    const targetHousing =
      brooderId && canFitAnimal({ ...state, animals }, brooderId, batch.species, 0)
        ? brooderId
        : findHousingForSpecies({ ...state, animals }, batch.species, 1);

    if (!targetHousing || !breed) {
      notes.push(`Hatch ready but no space for ${hatched} young.`);
      continue;
    }

    const newborns: Animal[] = [];
    for (let i = 0; i < hatched; i++) {
      const genetics = batch.genetics[i] ?? batch.genetics[0];
      if (!canFitAnimal({ ...state, animals: [...animals, ...newborns] }, targetHousing, batch.species, 1)) break;
      const sex: 'male' | 'female' = Math.random() < 0.5 ? 'male' : 'female';
      newborns.push({
        id: uid(),
        name: randomAnimalName(batch.species, sex, animals.map((a) => a.name)),
        species: batch.species,
        breedId: batch.breedId,
        sex,
        ageMonths: 0.5,
        health: 85 * genetics.vitality,
        happiness: 80,
        housingId: targetHousing,
        genetics,
        isBroody: false,
        isMolting: false,
        isPregnant: false,
        daysSinceProduction: 99,
        parasiteLoad: 0,
      });
    }

    if (batch.broodyAnimalId) {
      animals = animals.map((a) =>
        a.id === batch.broodyAnimalId ? { ...a, isBroody: false, happiness: clamp(a.happiness + 5, 0, 100) } : a
      );
    }

    animals = [...animals, ...newborns];
    notes.push(`${newborns.length} ${breed.name} hatched via ${batch.method}.`);
  }

  return { state: { ...state, animals, incubations }, notes };
}

function processRandomEvent(state: GameState): { state: GameState; note?: string } {
  const roll = Math.random();
  const defense = predatorDefense(state);
  const fenced = state.housings.some((h) => h.predatorFence);

  if (!fenced && defense < 3 && roll < 0.04) {
    return {
      state: {
        ...state,
        animals: state.animals.map((a) => ({
          ...a,
          happiness: clamp(a.happiness - 18, 0, 100),
          health: clamp(a.health - 4, 0, 100),
        })),
        events: addEvent(state, 'Predator activity near the fence! Guardian dog or apron recommended.', 'warning'),
      },
      note: 'Predator scare',
    };
  }

  if (roll < 0.04) {
    return {
      state: {
        ...state,
        reputation: clamp(state.reputation + 3, 0, 100),
        events: addEvent(state, 'Neighbors praised your homestead on the community board.', 'good'),
      },
      note: 'Word of mouth',
    };
  }

  return { state };
}

function endDay(state: GameState): { state: GameState; summary: DaySummary } {
  const notes: string[] = [];
  let moneySpent = 0;
  let economy = resetDailyLedger(state.economy, calcMarketMultiplier(state));

  for (const h of state.housings) {
    const upkeep = getHousingType(h).dailyUpkeep;
    moneySpent += upkeep;
    economy = recordExpense(economy, upkeep, 'upkeep');
  }

  let layerNeed = 0;
  let duckNeed = 0;
  let hayNeed = 0;
  for (const a of state.animals) {
    const breed = BREED_MAP[a.breedId];
    if (!breed) continue;
    const housing = state.housings.find((h) => h.id === a.housingId);
    const hType = housing ? getHousingType(housing) : HOUSING_TYPE_MAP['backyard-coop'];
    const need = calcFeedPerAnimal(a, breed, hType);
    if (a.species === 'duck') duckNeed += need;
    else if (a.species === 'goat') hayNeed += need * 0.15;
    else if (a.species !== 'cat') layerNeed += need;
  }

  let inventory = { ...state.inventory };
  const feedShortage =
    inventory.layerFeedLbs < layerNeed || inventory.duckFeedLbs < duckNeed || inventory.hayBales < hayNeed;

  const layerUsed = Math.min(inventory.layerFeedLbs, layerNeed);
  const duckUsed = Math.min(inventory.duckFeedLbs, duckNeed);
  const hayUsed = Math.min(inventory.hayBales, hayNeed);
  inventory = {
    ...inventory,
    layerFeedLbs: inventory.layerFeedLbs - layerUsed,
    duckFeedLbs: inventory.duckFeedLbs - duckUsed,
    hayBales: inventory.hayBales - hayUsed,
  };
  const feedCost = layerUsed * LAYER_FEED_PRICE + duckUsed * DUCK_FEED_PRICE + hayUsed * HAY_BALE_PRICE;
  moneySpent += feedCost;
  economy = recordExpense(economy, feedCost, 'feed');

  if (feedShortage && state.animals.length > 0) notes.push('Feed ran low.');

  let animals = state.animals.map((a) => {
    const breed = BREED_MAP[a.breedId];
    const housing = state.housings.find((h) => h.id === a.housingId);
    if (!breed || !housing) return a;
    return updateAnimal(a, breed, housing, state, feedShortage);
  });

  let eggsLaid = 0;
  let duckEggsLaid = 0;
  let milkProduced = 0;
  const eggs = { ...inventory.eggs };

  animals = animals.map((a) => {
    const breed = BREED_MAP[a.breedId];
    const housing = state.housings.find((h) => h.id === a.housingId);
    if (!breed || !housing) return a;

    if (a.species === 'chicken' && a.sex === 'female') {
      const chance = calcLayChance(a, breed, housing, state);
      if (Math.random() < chance) {
        const color = a.genetics.eggColor ?? breed.eggColor ?? 'brown';
        eggs[color] += 1;
        eggsLaid += 1;
        return { ...a, daysSinceProduction: 0 };
      }
    }
    if (a.species === 'duck' && a.sex === 'female') {
      if (Math.random() < calcLayChance(a, breed, housing, state) * 0.95) {
        duckEggsLaid += 1;
        return { ...a, daysSinceProduction: 0 };
      }
    }
    if (a.species === 'goat' && a.sex === 'female' && a.ageMonths > 6 && !a.isPregnant) {
      const milkChance = ((breed.milkPerWeek ?? 0) / 7) * (a.health / 100) * (inventory.hayBales <= 0 ? 0.3 : 1);
      if (Math.random() < milkChance) {
        milkProduced += 1;
        return { ...a, daysSinceProduction: 0 };
      }
    }
    return a;
  });

  inventory = {
    ...inventory,
    eggs,
    duckEggs: inventory.duckEggs + duckEggsLaid,
    milkJugs: inventory.milkJugs + milkProduced,
  };

  const fertileEggs = [...inventory.fertileEggs];
  for (const h of state.housings) {
    const housed = animals.filter((a) => a.housingId === h.id);
    for (const species of ['chicken', 'duck'] as Species[]) {
      const females = housed.filter((a) => a.species === species && a.sex === 'female');
      const hasMale = housed.some((a) => a.species === species && a.sex === 'male' && a.health > 30);
      if (females.length > 0 && dailyFertileEggChance(species, females.length, hasMale) > Math.random()) {
        const mom = females[Math.floor(Math.random() * females.length)];
        const breed = BREED_MAP[mom.breedId];
        fertileEggs.push({
          id: uid(),
          species,
          breedId: mom.breedId,
          genetics: mom.genetics,
          eggColor: mom.genetics.eggColor ?? breed?.eggColor,
        });
      }
    }
  }
  inventory = { ...inventory, fertileEggs };

  const newKids: Animal[] = [];
  animals = animals.map((a) => {
    if (a.species === 'goat' && a.isPregnant && Math.random() < 0.03) {
      const breed = BREED_MAP[a.breedId];
      const housingId = findHousingForSpecies({ ...state, animals: [...animals, ...newKids] }, 'goat', 1);
      if (housingId && breed) {
        newKids.push({
          id: uid(),
          name: randomAnimalName('goat', 'female', animals.map((x) => x.name)),
          species: 'goat',
          breedId: a.breedId,
          sex: Math.random() < 0.5 ? 'male' : 'female',
          ageMonths: 0.5,
          health: 88,
          happiness: 85,
          housingId,
          genetics: createGenetics(a.breedId, a.genetics, a.genetics),
          isBroody: false,
          isMolting: false,
          isPregnant: false,
          daysSinceProduction: 99,
          parasiteLoad: 0,
        });
        notes.push(`${a.name} kidded!`);
      }
      return { ...a, isPregnant: false };
    }
    return a;
  });
  animals = [...animals, ...newKids];

  const dead = animals.filter((a) => a.health <= 0);
  if (dead.length > 0) {
    animals = animals.filter((a) => a.health > 0);
    notes.push(`${dead.map((d) => d.name).join(', ')} lost.`);
  }

  let housings = state.housings.map((h) => {
    const type = getHousingType(h);
    return {
      ...h,
      cleanliness: clamp(h.cleanliness - type.cleanlinessDecay, 0, 100),
      waterLevel: h.autoWaterer ? 90 : clamp(h.waterLevel - 12, 0, 100),
    };
  });

  let next: GameState = {
    ...state,
    animals,
    inventory,
    housings,
    economy,
    money: state.money - moneySpent,
  };

  const hatchResult = processIncubations(next);
  next = hatchResult.state;
  notes.push(...hatchResult.notes);

  let moneyEarned = 0;
  if (next.day % 7 === 0 && next.economy.csaSubscribers > 0) {
    const csa = csaWeeklyIncome(next.economy.csaSubscribers);
    moneyEarned += csa;
    economy = recordRevenue(next.economy, csa);
    next = {
      ...next,
      money: next.money + csa,
      economy,
      events: addEvent(next, `CSA delivery — $${csa.toFixed(0)}.`, 'good'),
    };
  }

  const newDay = state.day + 1;
  const season = seasonForDay(newDay);

  next = {
    ...next,
    day: newDay,
    season,
    actionsRemaining: ACTIONS_PER_DAY,
    economy: { ...economy, marketMultiplier: calcMarketMultiplier({ ...next, day: newDay, season }) },
  };

  const eventResult = processRandomEvent(next);
  next = eventResult.state;
  if (eventResult.note) notes.push(eventResult.note);

  if (season !== state.season) {
    const labels: Record<Season, string> = {
      spring: 'Spring — breeding season begins.',
      summer: 'Summer — heat management matters.',
      fall: 'Fall — molting and goat breeding.',
      winter: 'Winter — market premiums.',
    };
    next = { ...next, events: addEvent(next, labels[season], 'info') };
  }

  let gameOver = false;
  let victory = false;
  let pausedMessage: string | null = null;
  const producers = next.animals.filter((a) => a.species !== 'dog' && a.species !== 'cat');

  if (producers.length === 0 && next.day > 21) {
    gameOver = true;
    pausedMessage = 'The homestead fell quiet. Restock and try again.';
    next = { ...next, events: addEvent(next, 'No livestock remain. Game over.', 'bad') };
  } else if (
    next.reputation >= VICTORY_REPUTATION &&
    next.totalRevenue >= VICTORY_REVENUE &&
    next.day >= VICTORY_DAYS
  ) {
    victory = true;
    pausedMessage = 'Your small homestead thrives — diverse stock, smart breeding, sustainable books.';
    next = { ...next, events: addEvent(next, 'Victory! A model small homestead.', 'good') };
  }

  next = { ...next, gameOver, victory, pausedMessage };

  return {
    state: next,
    summary: {
      eggsLaid,
      duckEggsLaid,
      milkProduced,
      feedConsumed: layerUsed + duckUsed,
      moneyEarned,
      moneySpent,
      notes,
    },
  };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'NEW_GAME') return createInitialState();
  if (action.type === 'LOAD_GAME') return action.state;
  if ((state.gameOver || state.victory) && action.type !== 'NEW_GAME') return state;

  switch (action.type) {
    case 'CLEAN_HOUSING': {
      if (state.actionsRemaining <= 0) return state;
      const h = state.housings.find((x) => x.id === action.housingId);
      if (!h) return state;
      return useAction({
        ...state,
        housings: state.housings.map((x) => (x.id === action.housingId ? { ...x, cleanliness: 100 } : x)),
        events: addEvent(state, `${getHousingType(h).name} cleaned.`, 'good'),
      });
    }

    case 'CLEAN_ALL_HOUSINGS': {
      if (state.actionsRemaining <= 0) return state;
      return useAction({
        ...state,
        housings: state.housings.map((x) => ({ ...x, cleanliness: 100 })),
        events: addEvent(state, 'All housing cleaned.', 'good'),
      });
    }

    case 'REFILL_FEED': {
      if (state.actionsRemaining <= 0) return state;
      const inv = { ...state.inventory };
      if (action.feedType === 'layer' && inv.layerFeedLbs < 80) inv.layerFeedLbs = Math.min(80, inv.layerFeedLbs + 20);
      else if (action.feedType === 'duck' && inv.duckFeedLbs < 50) inv.duckFeedLbs = Math.min(50, inv.duckFeedLbs + 15);
      else if (action.feedType === 'hay' && inv.hayBales < 10) inv.hayBales = Math.min(10, inv.hayBales + 2);
      else return state;
      return useAction({ ...state, inventory: inv, events: addEvent(state, 'Feed topped off.', 'info') });
    }

    case 'REFILL_WATER': {
      if (state.actionsRemaining <= 0) return state;
      return useAction({
        ...state,
        housings: state.housings.map((h) => (h.id === action.housingId ? { ...h, waterLevel: 100 } : h)),
        events: addEvent(state, 'Waterers filled.', 'info'),
      });
    }

    case 'COLLECT_PRODUCTS': {
      if (state.actionsRemaining <= 0) return state;
      const total =
        Object.values(state.inventory.eggs).reduce((a, b) => a + b, 0) +
        state.inventory.duckEggs +
        state.inventory.milkJugs;
      return useAction({
        ...state,
        events: addEvent(state, total > 0 ? `Gathered ${total} products.` : 'Nothing to gather.', total > 0 ? 'good' : 'info'),
      });
    }

    case 'HEALTH_CHECK': {
      if (state.actionsRemaining <= 0) return state;
      const sick = state.animals.filter((a) => a.health < 60 || a.parasiteLoad > 40);
      return useAction({
        ...state,
        animals: state.animals.map((a) => ({
          ...a,
          health: clamp(a.health + 5, 0, 100),
          happiness: clamp(a.happiness + 3, 0, 100),
        })),
        events: addEvent(state, sick.length ? `Needs care: ${sick.map((s) => s.name).join(', ')}` : 'All stock healthy.', sick.length ? 'warning' : 'good'),
      });
    }

    case 'TREAT_PARASITES': {
      if (state.actionsRemaining <= 0 || state.inventory.medicine <= 0) return state;
      return useAction({
        ...state,
        inventory: { ...state.inventory, medicine: state.inventory.medicine - 1 },
        animals: state.animals.map((a) =>
          a.species === 'chicken' || a.species === 'duck'
            ? { ...a, parasiteLoad: Math.max(0, a.parasiteLoad - 40), health: clamp(a.health + 8, 0, 100) }
            : a
        ),
        events: addEvent(state, 'Parasite treatment applied.', 'good'),
      });
    }

    case 'BREAK_BROODINESS': {
      if (state.actionsRemaining <= 0) return state;
      const animal = state.animals.find((a) => a.id === action.animalId);
      if (!animal?.isBroody) return state;
      return useAction({
        ...state,
        animals: state.animals.map((a) =>
          a.id === action.animalId ? { ...a, isBroody: false, happiness: clamp(a.happiness - 5, 0, 100) } : a
        ),
        events: addEvent(state, `${animal.name} off the nest.`, 'info'),
      });
    }

    case 'BUY_FEED': {
      const prices = { layer: LAYER_FEED_PRICE, duck: DUCK_FEED_PRICE, hay: HAY_BALE_PRICE };
      const cost = action.amount * prices[action.feedType];
      if (state.money < cost) return state;
      const inv = { ...state.inventory };
      if (action.feedType === 'layer') inv.layerFeedLbs += action.amount;
      else if (action.feedType === 'duck') inv.duckFeedLbs += action.amount;
      else inv.hayBales += action.amount;
      return {
        ...state,
        money: state.money - cost,
        inventory: inv,
        economy: recordExpense(state.economy, cost, 'feed'),
        events: addEvent(state, `Bought feed ($${cost.toFixed(2)}).`, 'info'),
      };
    }

    case 'BUY_MEDICINE': {
      if (state.money < MEDICINE_PRICE) return state;
      return {
        ...state,
        money: state.money - MEDICINE_PRICE,
        inventory: { ...state.inventory, medicine: state.inventory.medicine + 1 },
        events: addEvent(state, `Mite powder purchased ($${MEDICINE_PRICE}).`, 'info'),
      };
    }

    case 'BUY_ANIMAL': {
      const breed = BREED_MAP[action.breedId];
      if (!breed) return state;
      const price = action.sex === 'male' ? Math.ceil(breed.price * 0.6) : breed.price;
      if (state.money < price) return state;
      const ageMonths = breed.species === 'dog' || breed.species === 'cat' ? 12 : 4;
      const housingId = action.housingId ?? findHousingForSpecies(state, breed.species, ageMonths);
      if (!housingId) {
        return { ...state, events: addEvent(state, `No housing for ${breed.name}.`, 'warning') };
      }
      const animal: Animal = {
        id: uid(),
        name: action.name ?? randomAnimalName(breed.species, action.sex, state.animals.map((a) => a.name)),
        species: breed.species,
        breedId: breed.id,
        sex: action.sex,
        ageMonths,
        health: 90,
        happiness: 80,
        housingId,
        genetics: createGenetics(breed.id),
        isBroody: false,
        isMolting: false,
        isPregnant: false,
        daysSinceProduction: 99,
        parasiteLoad: 0,
      };
      return {
        ...state,
        money: state.money - price,
        animals: [...state.animals, animal],
        events: addEvent(state, `${animal.name} (${breed.name}) joined ($${price}).`, 'good'),
      };
    }

    case 'SELL_AT_MARKET': {
      if (state.actionsRemaining <= 0) return state;
      const mult = calcMarketMultiplier(state);
      const inv = { ...state.inventory };
      let total = 0;
      let count = 0;

      if (action.product === 'eggs') {
        total = eggCartonValue(inv.eggs, mult);
        count = Object.values(inv.eggs).reduce((a, b) => a + b, 0);
        if (!count) return { ...state, events: addEvent(state, 'No chicken eggs.', 'info') };
        inv.eggs = { brown: 0, cream: 0, white: 0, blue: 0, green: 0, chocolate: 0 };
      } else if (action.product === 'duckEggs') {
        total = duckEggValue(inv.duckEggs, mult);
        count = inv.duckEggs;
        if (!count) return { ...state, events: addEvent(state, 'No duck eggs.', 'info') };
        inv.duckEggs = 0;
      } else if (action.product === 'milk') {
        total = milkValue(inv.milkJugs, mult);
        count = inv.milkJugs;
        if (!count) return { ...state, events: addEvent(state, 'No milk.', 'info') };
        inv.milkJugs = 0;
      } else if (action.product === 'cheese') {
        total = cheeseValue(inv.cheeseBlocks, mult);
        count = inv.cheeseBlocks;
        if (!count) return { ...state, events: addEvent(state, 'No cheese.', 'info') };
        inv.cheeseBlocks = 0;
      } else {
        total = fertileEggsValue(inv.fertileEggs, mult);
        count = inv.fertileEggs.length;
        if (!count) return { ...state, events: addEvent(state, 'No fertile eggs.', 'info') };
        inv.fertileEggs = [];
      }

      return useAction({
        ...state,
        money: state.money + total,
        totalEggsSold: state.totalEggsSold + (action.product === 'eggs' ? count : 0),
        totalRevenue: state.totalRevenue + total,
        reputation: clamp(state.reputation + 1, 0, 100),
        inventory: inv,
        economy: recordRevenue(state.economy, total),
        events: addEvent(state, `Sold ${action.product}: $${total.toFixed(2)} (${mult.toFixed(2)}×).`, 'good'),
      });
    }

    case 'MAKE_CHEESE': {
      if (state.actionsRemaining <= 0 || state.inventory.milkJugs < CHEESE_MILK_RATIO) return state;
      const blocks = Math.floor(state.inventory.milkJugs / CHEESE_MILK_RATIO);
      return useAction({
        ...state,
        inventory: {
          ...state.inventory,
          milkJugs: state.inventory.milkJugs - blocks * CHEESE_MILK_RATIO,
          cheeseBlocks: state.inventory.cheeseBlocks + blocks,
        },
        events: addEvent(state, `Made ${blocks} cheese block(s).`, 'good'),
      });
    }

    case 'BUILD_HOUSING': {
      const type = HOUSING_TYPE_MAP[action.typeId];
      if (!type || state.money < type.buildCost) return state;
      const housing: Housing = {
        id: uid(),
        typeId: type.id,
        cleanliness: 90,
        waterLevel: 90,
        autoWaterer: false,
        dustBath: false,
        predatorFence: false,
      };
      return {
        ...state,
        money: state.money - type.buildCost,
        housings: [...state.housings, housing],
        economy: recordExpense(state.economy, type.buildCost, 'upkeep'),
        events: addEvent(state, `Built ${type.name} ($${type.buildCost}).`, 'good'),
      };
    }

    case 'UPGRADE_HOUSING': {
      const h = state.housings.find((x) => x.id === action.housingId);
      if (!h || h[action.upgrade]) return state;
      const cost = HOUSING_UPGRADE_COST[action.upgrade];
      if (state.money < cost) return state;
      return {
        ...state,
        money: state.money - cost,
        housings: state.housings.map((x) => (x.id === action.housingId ? { ...x, [action.upgrade]: true } : x)),
        events: addEvent(state, `${getHousingType(h).name}: ${action.upgrade} installed.`, 'good'),
      };
    }

    case 'MOVE_ANIMAL': {
      const animal = state.animals.find((a) => a.id === action.animalId);
      if (!animal || !canFitAnimal(state, action.housingId, animal.species, animal.ageMonths)) return state;
      return {
        ...state,
        animals: state.animals.map((a) => (a.id === action.animalId ? { ...a, housingId: action.housingId } : a)),
        events: addEvent(state, `${animal.name} relocated.`, 'info'),
      };
    }

    case 'COLLECT_FERTILE_EGGS':
      if (state.actionsRemaining <= 0) return state;
      return useAction({
        ...state,
        events: addEvent(
          state,
          state.inventory.fertileEggs.length
            ? `${state.inventory.fertileEggs.length} fertile egg(s) stored.`
            : 'Need a male with females to breed.',
          'info'
        ),
      });

    case 'START_INCUBATION': {
      if (state.actionsRemaining <= 0) return state;
      if (!state.housings.some((h) => getHousingType(h).hasIncubator)) {
        return { ...state, events: addEvent(state, 'Build an incubator first.', 'warning') };
      }
      const eggs = state.inventory.fertileEggs.filter((e) => action.eggIds.includes(e.id));
      if (!eggs.length) return state;
      const days = INCUBATION_DAYS[eggs[0].species] ?? 21;
      const batch: IncubationBatch = {
        id: uid(),
        species: eggs[0].species,
        breedId: eggs[0].breedId,
        genetics: eggs.map((e) => e.genetics),
        daysRemaining: days,
        totalDays: days,
        method: 'incubator',
        housingId: state.housings.find((h) => getHousingType(h).hasIncubator)!.id,
      };
      return useAction({
        ...state,
        inventory: { ...state.inventory, fertileEggs: state.inventory.fertileEggs.filter((e) => !action.eggIds.includes(e.id)) },
        incubations: [...state.incubations, batch],
        events: addEvent(state, `${eggs.length} eggs incubating (${days}d).`, 'good'),
      });
    }

    case 'ASSIGN_BROODY': {
      if (state.actionsRemaining <= 0) return state;
      const broody = state.animals.find((a) => a.id === action.animalId);
      if (!broody?.isBroody) return state;
      const eggs = state.inventory.fertileEggs.filter((e) => action.eggIds.includes(e.id));
      if (!eggs.length) return state;
      const days = INCUBATION_DAYS[eggs[0].species] ?? 21;
      const batch: IncubationBatch = {
        id: uid(),
        species: eggs[0].species,
        breedId: eggs[0].breedId,
        genetics: eggs.map((e) => e.genetics),
        daysRemaining: days,
        totalDays: days,
        method: 'broody',
        broodyAnimalId: broody.id,
        housingId: broody.housingId,
      };
      return useAction({
        ...state,
        inventory: { ...state.inventory, fertileEggs: state.inventory.fertileEggs.filter((e) => !action.eggIds.includes(e.id)) },
        incubations: [...state.incubations, batch],
        events: addEvent(state, `${broody.name} sitting on ${eggs.length} eggs.`, 'good'),
      });
    }

    case 'CANCEL_INCUBATION':
      return {
        ...state,
        incubations: state.incubations.filter((b) => b.id !== action.batchId),
        events: addEvent(state, 'Incubation cancelled.', 'info'),
      };

    case 'SIGN_CSA': {
      if (state.reputation < CSA_UNLOCK_REPUTATION) {
        return { ...state, events: addEvent(state, `Need ${CSA_UNLOCK_REPUTATION} reputation.`, 'warning') };
      }
      if (state.economy.csaSubscribers >= 5) {
        return { ...state, events: addEvent(state, 'CSA at capacity.', 'info') };
      }
      return {
        ...state,
        economy: { ...state.economy, csaSubscribers: state.economy.csaSubscribers + 1 },
        events: addEvent(state, `CSA subscriber +1 ($${CSA_WEEKLY_INCOME}/wk).`, 'good'),
      };
    }

    case 'END_DAY': {
      const { state: next, summary } = endDay(state);
      return {
        ...next,
        events: addEvent(next, `Day ${state.day}: ${summary.notes.join(' ')} Expenses $${summary.moneySpent.toFixed(2)}.`, 'info'),
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
  return eggCartonValue(state.inventory.eggs, calcMarketMultiplier(state));
}

export function totalInventoryValue(state: GameState): number {
  const mult = calcMarketMultiplier(state);
  const inv = state.inventory;
  return (
    eggCartonValue(inv.eggs, mult) +
    duckEggValue(inv.duckEggs, mult) +
    milkValue(inv.milkJugs, mult) +
    cheeseValue(inv.cheeseBlocks, mult) +
    fertileEggsValue(inv.fertileEggs, mult)
  );
}

export function flockProductionEstimate(state: GameState): number {
  return state.animals.reduce((sum, a) => {
    const breed = BREED_MAP[a.breedId];
    const housing = state.housings.find((h) => h.id === a.housingId);
    if (!breed || !housing || a.sex !== 'female') return sum;
    if (a.species === 'chicken') return sum + calcLayChance(a, breed, housing, state) * 7;
    if (a.species === 'duck') return sum + calcLayChance(a, breed, housing, state) * 7 * 0.95;
    if (a.species === 'goat') return sum + (breed.milkPerWeek ?? 0) * (a.health / 100);
    return sum;
  }, 0);
}

export function getHousingLabel(h: Housing): string {
  return getHousingType(h).name;
}
