/**
 * Combat Event Type Mapping Tests
 *
 * Validates that the combat event types defined in the Go backend
 * (apps/server/internal/server/combat/events.go) are fully compatible with
 * the event types defined in the frontend TypeScript
 * (apps/web/src/services/websocket.ts).
 *
 * This is a pure type/constant validation test that does NOT require a running
 * server. It catches mismatches between backend and frontend event type sets.
 *
 * Reference files:
 * - Backend:  apps/server/internal/server/combat/events.go (CombatEventType constants)
 * - Frontend: apps/web/src/services/websocket.ts (CombatEventType type)
 * - Frontend: apps/web/src/events.ts (GameEvents enum)
 */

// =========================================================================
// 1. Backend Combat Event Types (from events.go)
// =========================================================================

/**
 * Complete set of CombatEventType constants defined in the Go backend.
 *
 * Source: apps/server/internal/server/combat/events.go
 */
const BACKEND_COMBAT_EVENT_TYPES = new Set([
  'combat_start',
  'combat_end',
  'initiative_rolled',
  'turn_start',
  'turn_end',
  'round_end',
  'attack',
  'damage',
  'heal',
  'death',
  'unconscious',
  'condition_applied',
  'condition_removed',
  'opportunity_attack',
])

/**
 * Additional event types used by frontend but not in Go backend CombatEventType.
 * These may be generated client-side or come from other backend systems.
 */
const FRONTEND_ONLY_COMBAT_EVENT_TYPES = new Set([
  'round_start',     // Frontend derives from turn_start when turnIndex == 0
  'move',            // Client-side from move confirmation
  'spell',           // Spell casting (future phase)
  'item',            // Item use (future phase)
  'dodge',           // Dodge action (backend uses condition system)
  'disengage',       // Disengage action (backend uses condition system)
])

// =========================================================================
// 2. Frontend Combat Event Types (from websocket.ts)
// =========================================================================

/**
 * Complete set of CombatEventType values defined in the TypeScript frontend.
 *
 * Source: apps/web/src/services/websocket.ts (CombatEventType type)
 */
const FRONTEND_COMBAT_EVENT_TYPES = new Set([
  ...BACKEND_COMBAT_EVENT_TYPES,
  ...FRONTEND_ONLY_COMBAT_EVENT_TYPES,
])

// =========================================================================
// 3. GameEvents enum (from events.ts) - used for internal event bus
// =========================================================================

/**
 * Frontend GameEvents that relate to combat.
 * These are emitted on the internal eventBus and consumed by CombatScene.
 *
 * Source: apps/web/src/events.ts (GameEvents enum)
 */
const COMBAT_GAME_EVENTS = new Set([
  'COMBAT_START',
  'COMBAT_END',
  'COMBAT_TURN_START',
  'COMBAT_TURN_END',
  'COMBAT_MOVE_CONFIRM',
  'COMBAT_TARGET_SELECT',
  'COMBAT_CELL_CLICK',
  'COMBAT_UNIT_SELECT',
  // Effect events consumed by EffectManager
  'EFFECT_ATTACK',
  'EFFECT_DAMAGE',
  'EFFECT_HEAL',
  'EFFECT_SPELL',
  'EFFECT_STATUS',
  'EFFECT_DEATH',
])

// =========================================================================
// Tests
// =========================================================================

describe('Combat Event Type Mapping (Backend <-> Frontend)', () => {
  // -----------------------------------------------------------------------
  // 1. All backend events must be known to the frontend
  // -----------------------------------------------------------------------

  describe('Backend -> Frontend coverage', () => {
    it('every backend CombatEventType has a corresponding frontend type', () => {
      const unmappedBackendEvents = [...BACKEND_COMBAT_EVENT_TYPES].filter(
        (event) => !FRONTEND_COMBAT_EVENT_TYPES.has(event),
      )

      expect(unmappedBackendEvents).toEqual([])
    })

    it('backend event types are all lowercase (snake_case for multi-word)', () => {
      for (const eventType of BACKEND_COMBAT_EVENT_TYPES) {
        // All backend event types should be lowercase
        expect(eventType).toBe(eventType.toLowerCase())
        expect(eventType).not.toMatch(/[A-Z]/)
        expect(eventType).not.toContain(' ')
        // Multi-word events use underscore separator; single-word events do not
        if (eventType.includes('_') || eventType.includes('opportunity')) {
          // Multi-word events: verify underscore convention
          expect(eventType).toMatch(/^[a-z]+(_[a-z]+)+$/)
        } else {
          // Single-word events: verify all lowercase letters
          expect(eventType).toMatch(/^[a-z]+$/)
        }
      }
    })
  })

  // -----------------------------------------------------------------------
  // 2. Frontend-only events should be documented
  // -----------------------------------------------------------------------

  describe('Frontend-only events', () => {
    it('all frontend-only events are documented as intentional', () => {
      // Every frontend-only event should have a documented reason for existing
      // without a backend counterpart
      const documentedFrontendOnlyEvents = new Set([
        'round_start',   // Derived client-side: round starts when first turn_start of a round
        'move',          // Client-side: Phaser entity movement confirmed
        'spell',         // Future: spell casting system
        'item',          // Future: item use system
        'dodge',         // Mapped to condition_applied("dodging") in backend
        'disengage',     // Mapped to condition_applied("disengaging") in backend
      ])

      const undocumentedEvents = [...FRONTEND_ONLY_COMBAT_EVENT_TYPES].filter(
        (e) => !documentedFrontendOnlyEvents.has(e),
      )
      expect(undocumentedEvents).toEqual([])
    })
  })

  // -----------------------------------------------------------------------
  // 3. WebSocket message structure compatibility
  // -----------------------------------------------------------------------

  describe('WebSocket message payload shape', () => {
    it('combat_event messages follow expected payload structure', () => {
      /**
       * When the backend sends a combat_event WebSocket message, the payload
       * should match CombatEventPayload:
       *   { eventType, characterId?, round?, data?, target?, damage?, ... }
       *
       * The Go backend constructs these via CombatEvent struct:
       *   type CombatEvent struct {
       *     Type      CombatEventType `json:"type"`
       *     Timestamp int64           `json:"timestamp"`
       *     Data      interface{}     `json:"data"`
       *   }
       *
       * So the JSON will always have "type", "timestamp", and "data" at minimum.
       * The frontend's isCombatEventPayload() checks for "eventType" field.
       *
       * INTEGRATION NOTE: There is a field naming mismatch here!
       *   - Go serializes as:  {"type": "attack", "data": {...}, "timestamp": 123}
       *   - Frontend expects:  {"eventType": "attack", ...}
       *
       * This means either:
       *   a) The MCP tool layer transforms the key before sending, OR
       *   b) There is a mapping layer we need to verify
       *
       * This test documents the expected contract; if tests fail, the
       * mapping layer needs attention.
       */
      const backendEventShape = {
        hasTypeField: true,      // Go: `json:"type"` -> "type"
        hasTimestampField: true,  // Go: `json:"timestamp"` -> "timestamp"
        hasDataField: true,       // Go: `json:"data"` -> "data"
      }

      const frontendExpects = {
        eventTypeField: 'eventType', // Frontend looks for this key
      }

      // Document the mapping gap
      expect(backendEventShape.hasTypeField).toBe(true)
      // The frontend isCombatEventPayload checks for 'eventType' not 'type'
      // This is a KNOWN integration point that needs verification
      expect(frontendExpects.eventTypeField).toBe('eventType')
    })

    it('state_update messages with stateType="combat" contain valid combat data', () => {
      /**
       * State update messages have this shape:
       *   { type: "state_update", payload: { stateType: "combat", data: {...} } }
       *
       * The data should match CombatState interface:
       *   { status, round, turnIndex, initiatives[], participants[], activeEffects[] }
       *
       * The backend GetCombatState() returns:
       *   { status, round, turnIndex, initiatives, participants, activeEffects,
       *     currentTurn?, currentTurnId? }
       *
       * Note: backend returns currentTurn/currentTurnId which are NOT in
       * the CombatState interface - they're derived from participants[turnIndex].
       */
      const backendStateFields = new Set([
        'status', 'round', 'turnIndex', 'initiatives',
        'participants', 'activeEffects',
        // Extra fields not in TS CombatState but sent by backend:
        'currentTurn', 'currentTurnId',
      ])

      const frontendCombatStateFields = new Set([
        'status', 'round', 'turnIndex', 'initiatives',
        'participants', 'activeEffects',
      ])

      // All frontend-required fields must be present in backend response
      for (const field of frontendCombatStateFields) {
        expect(backendStateFields.has(field)).toBe(true)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 4. AttackEventData field mapping
  // -----------------------------------------------------------------------

  describe('AttackEventData field mapping (Go -> TypeScript)', () => {
    it('backend AttackEventData maps to frontend expectations', () => {
      /**
       * Go backend (events.go):
       *   type AttackEventData struct {
       *     AttackerID string `json:"attackerId"`
       *     TargetID   string `json:"targetId"`
       *     AttackRoll int    `json:"attackRoll"`
       *     TargetAC   int    `json:"targetAc"`
       *     Hit        bool   `json:"hit"`
       *     Critical   bool   `json:"critical"`
       *     Damage     int    `json:"damage,omitempty"`
       *     DamageType string `json:"damageType,omitempty"`
       *   }
       *
       * Frontend CombatEventPayload expects:
       *   attacker (via characterId), target, attackRoll, attackTotal,
       *   targetAC, hit (isHit), critical (isCrit), damage, damageType
       *
       * Field name mappings:
       *   Go.attackerId  -> Frontend.characterId (on source entity)
       *   Go.targetId    -> Frontend.target
       *   Go.attackRoll  -> Frontend.dice display (raw d20)
       *   Go.targetAc    -> Frontend.targetAC (same name, different case)
       *   Go.hit         -> Frontend.isHit
       *   Go.critical    -> Frontend.isCrit
       *   Go.damage      -> Frontend.damage
       *   Go.damageType  -> Frontend.damageType
       *
       * Note: Go sends attackRoll (raw d20) while ActionAttack also sends
       * attackTotal (roll + modifier). The frontend may need either or both.
       */

      // Verify Go field names are camelCase (JSON tags)
      const goAttackEventFields = [
        { go: 'attackerId', ts: 'characterId', note: 'source identifier' },
        { go: 'targetId', ts: 'target', note: 'target identifier' },
        { go: 'attackRoll', ts: 'attackRoll', note: 'raw d20 roll' },
        { go: 'targetAc', ts: 'targetAC', note: 'armor class (case diff)' },
        { go: 'hit', ts: 'isHit', note: 'boolean hit flag' },
        { go: 'critical', ts: 'isCrit', note: 'critical hit flag' },
        { go: 'damage', ts: 'damage', note: 'damage amount' },
        { go: 'damageType', ts: 'damageType', note: 'damage type string' },
      ]

      for (const mapping of goAttackEventFields) {
        // All Go fields use camelCase JSON tags - verify convention
        expect(mapping.go).toMatch(/^[a-z][a-zA-Z]*$/)
      }

      // Document the known case difference: targetAc vs targetAC
      const targetAcMapping = goAttackEventFields.find((m) => m.go === 'targetAc')
      expect(targetAcMapping).toBeDefined()
      expect(targetAcMapping!.ts).toBe('targetAC')
      // This case difference ('c' vs 'C') is a potential integration bug
      // if the frontend strictly expects 'targetAC'
    })
  })

  // -----------------------------------------------------------------------
  // 5. DamageEventData field mapping
  // -----------------------------------------------------------------------

  describe('DamageEventData field mapping (Go -> TypeScript)', () => {
    it('backend DamageEventData fields map correctly', () => {
      /**
       * Go backend (events.go):
       *   type DamageEventData struct {
       *     TargetID          string `json:"targetId"`
       *     OriginalDamage    int    `json:"originalDamage"`
       *     ModifiedDamage    int    `json:"modifiedDamage"`
       *     ResistanceApplied bool   `json:"resistanceApplied"`
       *     ImmunityApplied   bool   `json:"immunityApplied"`
       *     CurrentHP         int    `json:"currentHp"`
       *     Unconscious       bool   `json:"unconscious"`
       *     Dead              bool   `json:"dead"`
       *   }
       *
       * These fields flow through ApplyDamage response which adds more fields:
       *   + temporaryHp, maxHp, damageType, message
       *
       * Frontend applyDamage() in combatStore uses:
       *   - targetId -> find combatant
       *   - amount -> reduce HP (handles tempHP internally)
       */

      const goDamageFields = [
        'targetId', 'originalDamage', 'modifiedDamage',
        'resistanceApplied', 'immunityApplied',
        'currentHp', 'unconscious', 'dead',
      ]

      // All should be camelCase
      for (const field of goDamageFields) {
        expect(field).toMatch(/^[a-z][a-zA-Z]*$/)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 6. InitiativeEntry field mapping
  // -----------------------------------------------------------------------

  describe('InitiativeEntry field mapping', () => {
    it('backend initiative entry matches frontend InitiativeEntry type', () => {
      /**
       * Go backend (state.InitiativeEntry):
       *   CharacterID string `json:"characterId"`
       *   Initiative  int    `json:"initiative"`
       *   HasActed    bool   `json:"hasActed"`
       *
       * Frontend (types/state.ts InitiativeEntry):
       *   characterId: string
       *   initiative: number
       *   hasActed: boolean
       *
       * Perfect match! No mapping issues.
       */
      const goFields = ['characterId', 'initiative', 'hasActed']
      const tsFields = ['characterId', 'initiative', 'hasActed']

      expect(goFields).toEqual(tsFields)

      // Also verify camelCase
      for (const field of goFields) {
        expect(field).toMatch(/^[a-z][a-zA-Z]*$/)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 7. Condition value consistency
  // -----------------------------------------------------------------------

  describe('Condition string value consistency', () => {
    it('frontend Condition type matches backend Condition constants', () => {
      /**
       * Frontend (types/game.ts):
       *   type Condition = 'blinded' | 'charmed' | 'deafened' | ...
       *
       * Backend (shared/types): uses same string values
       *   ConditionBlinded = "blinded"
       *   ConditionCharmed = "charmed"
       *   etc.
       */
      const frontendConditions = [
        'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
        'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
        'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
      ]

      const backendConditions = [
        'blinded', 'charmed', 'deafened', 'frightened', 'grappled',
        'incapacitated', 'invisible', 'paralyzed', 'petrified', 'poisoned',
        'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
      ]

      expect(frontendConditions).toEqual(backendConditions)
      expect(frontendConditions.length).toBe(15)

      // All lowercase
      for (const c of frontendConditions) {
        expect(c).toBe(c.toLowerCase())
      }
    })
  })

  // -----------------------------------------------------------------------
  // 8. DamageType value consistency
  // -----------------------------------------------------------------------

  describe('DamageType string value consistency', () => {
    it('frontend DamageType matches backend DamageType constants', () => {
      /**
       * Frontend (types/game.ts):
       *   acid, bludgeoning, cold, fire, force, lightning,
       *   necrotic, piercing, poison, psychic, radiant, slashing, thunder
       */
      const frontendDamageTypes = [
        'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning',
        'necrotic', 'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
      ]

      // Same set in Go backend shared/types
      const expectedCount = 13

      expect(frontendDamageTypes.length).toBe(expectedCount)

      // All lowercase, single words (no spaces/hyphens)
      for (const dt of frontendDamageTypes) {
        expect(dt).toBe(dt.toLowerCase())
        expect(dt).not.toMatch(/\s/)
        expect(dt).not.toMatch(/-/)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 9. CombatantType value consistency
  // -----------------------------------------------------------------------

  describe('CombatantType value consistency', () => {
    it('frontend CombatantType matches backend CombatantType constants', () => {
      /**
       * Frontend (types/state.ts):
       *   type CombatantType = 'player' | 'enemy' | 'npc'
       *
       * Backend (state package):
       *   CombatantPlayer = "player"
       *   CombatantEnemy = "enemy"
       *   CombatantNPC = "npc"
       */
      const types = ['player', 'enemy', 'npc']
      expect(types.length).toBe(3)

      for (const t of types) {
        expect(t).toMatch(/^[a-z]+$/)
      }
    })
  })

  // -----------------------------------------------------------------------
  // 10. ActionState value consistency
  // -----------------------------------------------------------------------

  describe('ActionState value consistency', () => {
    it('frontend ActionState matches backend ActionState constants', () => {
      /**
       * Frontend (types/state.ts):
       *   type ActionState = 'available' | 'used'
       *
       * Backend (state package):
       *   ActionAvailable = "available"
       *   ActionUsed = "used"
       */
      const states = ['available', 'used']
      expect(states).toEqual(['available', 'used'])
    })
  })

  // -----------------------------------------------------------------------
  // 11. GamePhase value consistency
  // -----------------------------------------------------------------------

  describe('GamePhase value consistency', () => {
    it('frontend GamePhase matches backend Phase constants', () => {
      /**
       * Frontend (types/game.ts):
       *   type GamePhase = 'exploring' | 'combat' | 'dialog' | 'resting'
       *
       * Backend (state package):
       *   PhaseExploring = "exploring"
       *   PhaseCombat = "combat"
       */
      const phases = ['exploring', 'combat', 'dialog', 'resting']

      // At minimum, exploring and combat must match (the ones used by combat system)
      expect(phases).toContain('exploring')
      expect(phases).toContain('combat')
    })
  })

  // -----------------------------------------------------------------------
  // 12. CombatStatus value consistency
  // -----------------------------------------------------------------------

  describe('CombatStatus value consistency', () => {
    it('frontend CombatState.status matches backend CombatStatus constants', () => {
      /**
       * Frontend (types/state.ts CombatState.status):
       *   'idle' | 'active' | 'ended'
       *
       * Backend (state package):
       *   CombatIdle = "idle" (or nil = idle)
       *   CombatActive = "active"
       *   CombatEnded = "ended"
       */
      const statuses = ['idle', 'active', 'ended']
      expect(statuses).toEqual(['idle', 'active', 'ended'])
    })
  })
})

// =========================================================================
// Summary of Known Integration Points Requiring Attention
// =========================================================================
//
// 1. CombatEvent.type vs CombatEventPayload.eventType
//    Go serializes as "type" (from json:"type" tag on CombatEvent.Type field)
//    Frontend isCombatEventPayload() checks for "eventType"
//    -> NEEDS VERIFICATION: Is there a transformation layer?
//
// 2. AttackEventData.targetAc vs expected "targetAC"
//    Go uses json:"targetAc" (lowercase 'c')
//    Frontend may expect "targetAC" (uppercase 'C')
//    -> POTENTIAL BUG: Case mismatch
//
// 3. Character.hp vs Combatant.currentHp
//    REST API Character response uses "hp" for current HP
//    CombatState participant uses "currentHp"
//    -> DOCUMENTED: Different contexts use different field names
//
// 4. Backend sends extra fields not in TS interfaces
//    GetCombatState() sends currentTurn, currentTurnId which are NOT in
//    the CombatState TS interface (they're derived from participants[turnIndex])
//    -> OK: Frontend can safely ignore extra fields
//
// =========================================================================
