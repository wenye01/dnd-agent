// Package state manages the game state for D&D sessions.
package state

import (
	"time"

	"github.com/dnd-game/server/internal/shared/models"
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

// CombatState represents the state of combat.
type CombatState struct {
	Round         int                `json:"round"`
	TurnIndex     int                `json:"turnIndex"`
	Initiatives   []*InitiativeEntry `json:"initiatives"`
	Participants  []string           `json:"participants"`
	ActiveEffects []*ActiveEffect    `json:"activeEffects"`
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
