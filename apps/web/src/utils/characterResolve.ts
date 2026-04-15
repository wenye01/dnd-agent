import { useGameStore } from '../stores/gameStore'

/** Resolve a characterId to a human-readable name from the current party. */
export function resolveCharacterName(characterId: string | undefined | null): string {
  if (!characterId) return 'Unknown'
  const party = useGameStore.getState().gameState?.party
  const found = party?.find((c) => c.id === characterId)
  return found?.name ?? characterId
}
