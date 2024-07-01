/**
 * Splits a semver version string into its parts.
 * @param version The version string to split.
 * @returns An array containing the major, minor, and patch version numbers.
 */
export function getVersionParts(version: string): [number, number, number] {
  const parts = version.split('.').map((v) => parseInt(v, 10));
  return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
}

/**
 * Compares two versions to determine which is newer.
 * @param a The first version to compare.
 * @param b The second version to compare.
 * @returns -1 if `a` is newer than `b`, 1 if `b` is newer than `a`, and 0 if they are equal.
 */
export function compareVersions(a: string, b: string): number {
  const aParts = getVersionParts(a);
  const bParts = getVersionParts(b);

  for (let i = 0; i < 3; i++) {
    if (aParts[i] > bParts[i]) {
      return -1;
    }
    if (aParts[i] < bParts[i]) {
      return 1;
    }
  }

  return 0;
}
