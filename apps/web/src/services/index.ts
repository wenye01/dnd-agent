// Services
export { WebSocketClient, isNarrationPayload, isStateUpdatePayload, isDiceResultPayload, isErrorPayload, isCombatEventPayload } from './websocket'
export type { WebSocketOptions, MessageHandler, ConnectionHandler, StateUpdatePayload, CombatEventPayload } from './websocket'

export { characterApi } from './api'
export type { ApiResponse, ServerCharacter, CreateCharacterRequest, ListCharactersResponse } from './api'
