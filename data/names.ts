export const ANIMAL_NAMES: Record<string, string[]> = {
  chicken: [
    'Henrietta', 'Cluck Norris', 'Pecky', 'Ginger', 'Dot', 'Marigold', 'Pepper', 'Sage',
    'Bramble', 'Clover', 'Maple', 'Willow', 'Daisy', 'Rosie', 'Mabel', 'Pearl',
  ],
  duck: [
    'Quackers', 'Puddles', 'Waddles', 'Mallory', 'Ripple', 'Paddle', 'Drizzle', 'Pond',
    'Splash', 'Reed', 'Marsh', 'Creek',
  ],
  goat: [
    'Biscuit', 'Nibbles', 'Clover', 'Pepper', 'Willow', 'Hazel', 'Daisy', 'Maple',
  ],
  dog: ['Bear', 'Scout', 'Shadow', 'Duke', 'Bailey', 'Ranger'],
  cat: ['Mittens', 'Whiskers', 'Shadow', 'Pumpkin', 'Smudge', 'Barnaby'],
};

export const MALE_PREFIX = ['Roo', 'Drake', 'Buck', 'Guard', 'Tom'];

export function randomAnimalName(species: string, sex: string, existing: string[]): string {
  const pool = (ANIMAL_NAMES[species] ?? ['Friend']).filter((n) => !existing.includes(n));
  const base = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : `${species} ${Math.floor(Math.random() * 90) + 10}`;
  if (sex === 'male' && species !== 'dog' && species !== 'cat') {
    const prefix = MALE_PREFIX[['chicken', 'duck', 'goat'].indexOf(species)] ?? 'Sir';
    return `${prefix} ${base}`;
  }
  return base;
}
