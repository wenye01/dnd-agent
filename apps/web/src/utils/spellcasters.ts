const SPELLCASTER_CLASSES = new Set([
  'wizard',
  'sorcerer',
  'cleric',
  'bard',
  'druid',
  'warlock',
  'paladin',
  'ranger',
])

export function isSpellcasterClass(className: string | null | undefined): boolean {
  return SPELLCASTER_CLASSES.has((className ?? '').trim().toLowerCase())
}
