/**
 * Calculate ability modifier from a score (D&D 5e formula).
 */
export function getModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

/**
 * Format a modifier as a signed string (e.g. "+3", "-1", "+0").
 */
export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : mod.toString()
}
