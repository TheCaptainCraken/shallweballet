/**
 * Returns a new array with elements in a random order (Fisher-Yates shuffle).
 * Does not mutate the input.
 */
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Returns a random float in [min, max). */
export function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}
