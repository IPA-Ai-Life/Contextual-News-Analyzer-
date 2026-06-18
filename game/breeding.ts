import type { AnimalGenetics, EggColor, FertileEgg, Sex, Species } from '../types';
import { BREED_MAP } from '../data/breeds';

let lineageCounter = 0;

export function newLineageId(): string {
  return `lin-${++lineageCounter}-${Date.now().toString(36)}`;
}

export function createGenetics(
  breedId: string,
  parentA?: AnimalGenetics,
  parentB?: AnimalGenetics
): AnimalGenetics {
  const breed = BREED_MAP[breedId];
  const generation = parentA && parentB ? Math.max(parentA.generation, parentB.generation) + 1 : 0;
  const sameLineage = parentA && parentB && parentA.lineageId === parentB.lineageId;
  const inbreedPenalty = sameLineage && generation > 1 ? 0.15 : 0;

  let eggColor = breed?.eggColor;
  if (parentA?.eggColor && parentB?.eggColor) {
    eggColor = inheritEggColor(parentA.eggColor, parentB.eggColor);
  }

  const prodA = parentA?.productionFactor ?? 1;
  const prodB = parentB?.productionFactor ?? 1;
  const productionFactor = clamp(
    (prodA + prodB) / 2 + (Math.random() - 0.5) * 0.12,
    0.75,
    1.25
  );

  const vitA = parentA?.vitality ?? 0.9;
  const vitB = parentB?.vitality ?? 0.9;
  const vitality = clamp((vitA + vitB) / 2 - inbreedPenalty + (Math.random() - 0.5) * 0.08, 0.5, 1);

  return {
    lineageId: parentA?.lineageId ?? newLineageId(),
    generation,
    eggColor,
    productionFactor,
    vitality,
  };
}

function inheritEggColor(a: EggColor, b: EggColor): EggColor {
  if (a === b) return a;
  const pool: EggColor[] = [a, b];
  if ((a === 'blue' && b === 'brown') || (a === 'brown' && b === 'blue')) return 'green';
  if (a === 'chocolate' || b === 'chocolate') return Math.random() < 0.6 ? 'chocolate' : pool[Math.floor(Math.random() * 2)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function canBreed(species: Species, sex: Sex): boolean {
  return species === 'chicken' || species === 'duck' || species === 'goat';
}

export function hasBreedingPair(
  animals: { species: Species; sex: Sex; housingId: string; health: number }[],
  species: Species,
  housingId?: string
): boolean {
  const pool = housingId
    ? animals.filter((a) => a.species === species && a.housingId === housingId && a.health > 20)
    : animals.filter((a) => a.species === species && a.health > 20);
  const males = pool.filter((a) => a.sex === 'male').length;
  const females = pool.filter((a) => a.sex === 'female').length;
  return males > 0 && females > 0;
}

export function calcHatchRate(genetics: AnimalGenetics[], method: 'incubator' | 'broody'): number {
  const base = method === 'broody' ? 0.72 : 0.65;
  const avgVitality = genetics.reduce((s, g) => s + g.vitality, 0) / genetics.length;
  const genPenalty = genetics.some((g) => g.generation > 2) ? 0.08 : 0;
  return clamp(base * avgVitality - genPenalty, 0.35, 0.9);
}

export function rollHatchCount(genetics: AnimalGenetics[], method: 'incubator' | 'broody'): number {
  const rate = calcHatchRate(genetics, method);
  return genetics.filter(() => Math.random() < rate).length;
}

export function fertileEggValue(egg: FertileEgg): number {
  const breed = BREED_MAP[egg.breedId];
  const colorBonus = egg.eggColor ? (egg.eggColor === 'chocolate' || egg.eggColor === 'blue' ? 0.5 : 0.25) : 0;
  const genBonus = egg.genetics.generation === 0 ? 0 : 0.15;
  return 1.25 + colorBonus + genBonus + (breed?.price ?? 0) * 0.05;
}

export function dailyFertileEggChance(
  species: Species,
  femaleCount: number,
  hasMale: boolean
): number {
  if (!hasMale || femaleCount === 0) return 0;
  const perHen = species === 'duck' ? 0.18 : 0.22;
  return 1 - Math.pow(1 - perHen, femaleCount);
}
