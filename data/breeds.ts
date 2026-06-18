import { CHICKEN_BREEDS } from './chickenBreeds';
import { CAT_BREEDS, DOG_BREEDS, DUCK_BREEDS, GOAT_BREEDS } from './otherBreeds';
import type { AnimalBreed, Species } from '../types';

export const ALL_BREEDS: AnimalBreed[] = [
  ...CHICKEN_BREEDS,
  ...DUCK_BREEDS,
  ...GOAT_BREEDS,
  ...DOG_BREEDS,
  ...CAT_BREEDS,
];

export const BREED_MAP = Object.fromEntries(ALL_BREEDS.map((b) => [b.id, b])) as Record<
  string,
  AnimalBreed
>;

export const BREEDS_BY_SPECIES: Record<Species, AnimalBreed[]> = {
  chicken: CHICKEN_BREEDS,
  duck: DUCK_BREEDS,
  goat: GOAT_BREEDS,
  dog: DOG_BREEDS,
  cat: CAT_BREEDS,
};

// Backward compat for ChickenSprite
export { CHICKEN_BREEDS as BREEDS };
