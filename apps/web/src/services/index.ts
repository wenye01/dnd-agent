// Services
export { WebSocketClient, isNarrationPayload, isStateUpdatePayload, isDiceResultPayload, isErrorPayload, isCombatEventPayload } from './websocket'
export type { WebSocketOptions, MessageHandler, ConnectionHandler, StateUpdatePayload, CombatEventPayload } from './websocket'

// Type guards and related types (canonical location)
export {
  isPartialGameState,
  isCharacterArray,
  isCombatState,
  isUserInputPayload,
  isGameStateData,
  isPartyData,
  isCombatData,
} from './typeGuards'
export type { CombatEventType, UserInputPayload } from './typeGuards'

export { characterApi, ApiHttpError } from './api'
export type { ApiResponse, ServerCharacter, CreateCharacterRequest, ListCharactersResponse, ApiRequestOptions } from './api'
