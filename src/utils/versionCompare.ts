/**
 * Compares two version strings numerically (e.g. "2.1.0" vs "2.0.5", "v1.4" vs "1.3.9").
 * Returns > 0 if `latest` is strictly newer than `current`.
 * Returns 0 if equal or non-numeric / uncomparable.
 */
export function compareVersions(latest: string, current: string): number {
  const cleanA = latest.trim().replace(/^v/i, '');
  const cleanB = current.trim().replace(/^v/i, '');

  const matchA = cleanA.match(/^(\d+(?:\.\d+)*)/);
  const matchB = cleanB.match(/^(\d+(?:\.\d+)*)/);
  if (!matchA || !matchB) return 0;

  const partsA = matchA[1].split('.').map((n) => Number.parseInt(n, 10));
  const partsB = matchB[1].split('.').map((n) => Number.parseInt(n, 10));
  const maxLen = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < maxLen; i++) {
    const a = partsA[i] ?? 0;
    const b = partsB[i] ?? 0;
    if (a > b) return 1;
    if (a < b) return -1;
  }
  return 0;
}
