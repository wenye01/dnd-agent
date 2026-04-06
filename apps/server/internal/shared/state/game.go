// Package state manages the game state for D&D sessions.
package state

import (
	"fmt"
	"time"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// GamePhase represents the current phase of the game.
type GamePhase string

const (
	// PhaseExploring is the default exploration phase.
	PhaseExploring GamePhase = "exploring"
	// PhaseCombat is when the party is in combat.
	PhaseCombat GamePhase = "combat"
	// PhaseDialog is when the party is in a dialog/conversation.
	PhaseDialog GamePhase = "dialog"
	// PhaseResting is when the party is resting.
	PhaseResting GamePhase = "resting"
)

// GameState represents the complete state of a D&D game session.
type GameState struct {
	SessionID    string              `json:"sessionId"`
	Phase        GamePhase           `json:"phase"`
	Party        []*models.Character `json:"party"`
	CurrentMapID string              `json:"currentMapId"`
	Combat       *CombatState        `json:"combat,omitempty"`
	Scenario     *ScenarioState      `json:"scenario,omitempty"`
	Metadata     *GameMetadata       `json:"metadata"`
}

// CombatStatus represents the current status of a combat encounter.
type CombatStatus string

const (
	// CombatIdle means no combat is active.
	CombatIdle CombatStatus = "idle"
	// CombatActive means combat is in progress.
	CombatActive CombatStatus = "active"
	// CombatEnded means combat has concluded.
	CombatEnded CombatStatus = "ended"
)

// CombatState represents the state of combat.
type CombatState struct {
	Status        CombatStatus       `json:"status"`
	Round         int                `json:"round"`
	TurnIndex     int                `json:"turnIndex"`
	Initiatives   []*InitiativeEntry `json:"initiatives"`
	Participants  []*Combatant       `json:"participants"`
	ActiveEffects []*ActiveEffect    `json:"activeEffects"`
}

// CombatantType distinguishes players from enemies and NPCs.
type CombatantType string

const (
	// CombatantPlayer is a player-controlled character.
	CombatantPlayer CombatantType = "player"
	// CombatantNPC is a non-player character (friendly/neutral).
	CombatantNPC CombatantType = "npc"
	// CombatantEnemy is a hostile creature.
	CombatantEnemy CombatantType = "enemy"
)

// Combatant represents a participant in combat.
type Combatant struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Type        CombatantType `json:"type"`
	MaxHP       int           `json:"maxHp"`
	CurrentHP   int           `json:"currentHp"`
	TemporaryHP int           `json:"temporaryHp"`
	AC          int           `json:"ac"`
	Speed       int           `json:"speed"`
	DexScore    int           `json:"dexScore"` // Used as tiebreaker for initiative

	// Turn resources
	Action      ActionState `json:"action"`
	BonusAction ActionState `json:"bonusAction"`
	Reaction    ActionState `json:"reaction"`

	// Conditions and resistances
	Conditions        []*ConditionEntry `json:"conditions,omitempty"`
	DamageResistances []types.DamageType `json:"damageResistances,omitempty"`
	DamageImmunities  []types.DamageType `json:"damageImmunities,omitempty"`

	// Death saves (for player characters)
	DeathSaves *models.DeathSaves `json:"deathSaves,omitempty"`

	// Hit dice (for rest/recovery)
	HitDice models.HitDiceInfo `json:"hitDice"`

	// Reference to character ID for syncing back
	CharacterID string `json:"characterId,omitempty"`

	// Level and CON modifier for hit dice recovery
	Level  int `json:"level"`
	CONMod int `json:"conMod"`
}

// ActionState tracks whether an action resource is available or used.
type ActionState string

const (
	// ActionAvailable means the resource has not been used this turn.
	ActionAvailable ActionState = "available"
	// ActionUsed means the resource has been consumed this turn.
	ActionUsed ActionState = "used"
)

// ConditionEntry represents an active condition on a combatant.
type ConditionEntry struct {
	Condition types.Condition `json:"condition"`
	Source    string `json:"source,omitempty"` // What applied this condition
	Duration  int    `json:"duration"`         // Total duration in rounds (0 = indefinite)
	Remaining int    `json:"remaining"`        // Remaining rounds
	Level     int    `json:"level,omitempty"`  // For exhaustion (1-6)
}

// InitiativeEntry represents a creature's position in the initiative order.
type InitiativeEntry struct {
	CharacterID string `json:"characterId"`
	Initiative  int    `json:"initiative"`
	HasActed    bool   `json:"hasActed"`
}

// ActiveEffect represents an active effect in combat (spell effects, conditions, etc).
type ActiveEffect struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	TargetID   string   `json:"targetId"`
	Duration   int      `json:"duration"` // Remaining rounds/duration
	Conditions []string `json:"conditions,omitempty"`
}

// ScenarioState represents the current scenario/campaign state.
type ScenarioState struct {
	Name      string                 `json:"name"`
	Chapter   string                 `json:"chapter"`
	Flags     map[string]interface{} `json:"flags"`
	NPCs      map[string]*NPCState   `json:"npcs"`
	Locations map[string]*Location   `json:"locations"`
}

// NPCState represents the state of an NPC.
type NPCState struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Location    string   `json:"location"`
	Disposition string   `json:"disposition"` // friendly, neutral, hostile
	Health      int      `json:"health,omitempty"`
	MaxHealth   int      `json:"maxHealth,omitempty"`
	Conditions  []string `json:"conditions,omitempty"`
}

// Location represents a location in the game world.
type Location struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Position    *Position `json:"position,omitempty"`
}

// Position represents a location on a map.
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// GameMetadata contains metadata about the game session.
type GameMetadata struct {
	CreatedAt    int64  `json:"createdAt"`
	UpdatedAt    int64  `json:"updatedAt"`
	LastActivity int64  `json:"lastActivity"`
	DM           string `json:"dm,omitempty"` // DM identifier
}

// NewGameState creates a new game state with the given session ID.
func NewGameState(sessionID string) *GameState {
	now := currentTime()
	return &GameState{
		SessionID: sessionID,
		Phase:     PhaseExploring,
		Party:     make([]*models.Character, 0),
		Metadata: &GameMetadata{
			CreatedAt:    now,
			UpdatedAt:    now,
			LastActivity: now,
		},
	}
}

// currentTime returns the current Unix timestamp in seconds.
func currentTime() int64 {
	return time.Now().Unix()
}

// Validate checks that ConditionEntry has a valid condition and non-negative durations.
func (c *ConditionEntry) Validate() error {
	if !c.Condition.Valid() {
		return fmt.Errorf("invalid condition: %s", c.Condition)
	}
	if c.Duration > 0 && c.Remaining < 0 {
		return fmt.Errorf("remaining duration %d cannot be negative for timed condition", c.Remaining)
	}
	return nil
}

// Validate checks that a Combatant has required fields and valid sub-structures.
func (c *Combatant) Validate() error {
	if c.ID == "" {
		return fmt.Errorf("combatant ID is required")
	}
	if c.Name == "" {
		return fmt.Errorf("combatant name is required")
	}
	if c.MaxHP < 0 {
		return fmt.Errorf("combatant max HP %d cannot be negative", c.MaxHP)
	}
	if err := c.HitDice.Validate(); err != nil {
		return fmt.Errorf("combatant %s hit dice: %w", c.ID, err)
	}
	if c.DeathSaves != nil {
		if err := c.DeathSaves.Validate(); err != nil {
			return fmt.Errorf("combatant %s death saves: %w", c.ID, err)
		}
	}
	for _, cond := range c.Conditions {
		if err := cond.Validate(); err != nil {
			return fmt.Errorf("combatant %s condition: %w", c.ID, err)
		}
	}
	return nil
}
