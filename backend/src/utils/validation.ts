/**
 * Validates a sector name against the allowed GICS character set.
 * Allows letters, spaces, ampersand, comma, and hyphen.
 * Max length: 100 characters.
 */
export function validateSectorName(name: string): boolean {
  if (!name || name.length > 100) return false;
  return /^[a-zA-Z\s&,-]+$/.test(name);
}
