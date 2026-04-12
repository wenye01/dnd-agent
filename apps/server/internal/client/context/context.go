// Package context provides game context building for LLM interactions.
// Context types determine which system prompts and relevant data are included
// in LLM requests based on the current game phase.
package context

import (
	"github.com/dnd-game/server/internal/shared/state"
)

// ContextType represents the type of game context for prompt building.
type ContextType string

const (
	// ContextExploration is the default exploration context.
	ContextExploration ContextType = "exploration"
	// ContextCombat is active during combat encounters.
	ContextCombat ContextType = "combat"
	// ContextDialog is active during NPC conversations.
	ContextDialog ContextType = "dialog"
	// ContextResting is active during short/long rests.
	ContextResting ContextType = "resting"
)

// GameContext holds the contextual information sent to the LLM.
type GameContext struct {
	Type         ContextType            `json:"type"`
	SystemPrompt string                 `json:"systemPrompt"`
	RelevantData map[string]interface{} `json:"relevantData,omitempty"`
}

// ContextBuilder defines the interface for building game contexts.
// Implementations determine which system prompt and data to include
// based on the current game state.
type ContextBuilder interface {
	// Build constructs a GameContext from the current game state.
	Build(gameState *state.GameState) *GameContext
	// GetSystemPrompt returns the system prompt for a given context type.
	GetSystemPrompt(ctxType ContextType) string
}
