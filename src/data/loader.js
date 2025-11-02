// SAFE STUB (always returns sample)
import { samplePuzzle } from './puzzles';
import { validatePuzzle } from './puzzleSchema';

const cache = new Map();

export async function getPuzzleByDate(date) {
  if (cache.has(date)) return cache.get(date);
  validatePuzzle(samplePuzzle, { coerce: true });
  const payload = { meta: { date, title: 'Mini Crossword' }, puzzle: samplePuzzle };
  cache.set(date, payload);
  return payload;
}

export async function getRandomPuzzle() {
  return getPuzzleByDate('0000-00-00');
}
