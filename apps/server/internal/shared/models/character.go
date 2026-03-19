// Package models provides the core data models for the D&D game.
package models

import "github.com/dnd-game/server/internal/shared/types"

// Character represents a D&D character.
type Character struct {
	ID         string               `json:"id"`
	Name       string               `json:"name"`
	Race       string               `json:"race"`
	Class      string               `json:"class"`
	Level      int                  `json:"level"`
	HP         int                  `json:"hp"`
	MaxHP      int                  `json:"maxHp"`
	AC         int                  `json:"ac"`
	Stats      AbilityScores        `json:"stats"`
	Skills     map[types.Skill]bool `json:"skills"` // true = proficient
	Inventory  []Item               `json:"inventory"`
	Conditions []types.Condition    `json:"conditions,omitempty"`
}

// AbilityScores represents the six ability scores.
type AbilityScores struct {
	Strength     int `json:"strength"`
	Dexterity    int `json:"dexterity"`
	Constitution int `json:"constitution"`
	Intelligence int `json:"intelligence"`
	Wisdom       int `json:"wisdom"`
	Charisma     int `json:"charisma"`
}

// abilityScoreMap provides O(1) lookup from ability type to score field.
var abilityScoreMap = map[types.Ability]func(AbilityScores) int{
	types.Strength:     func(a AbilityScores) int { return a.Strength },
	types.Dexterity:    func(a AbilityScores) int { return a.Dexterity },
	types.Constitution: func(a AbilityScores) int { return a.Constitution },
	types.Intelligence: func(a AbilityScores) int { return a.Intelligence },
	types.Wisdom:       func(a AbilityScores) int { return a.Wisdom },
	types.Charisma:     func(a AbilityScores) int { return a.Charisma },
}

// GetModifier returns the ability modifier for a given ability score.
func (a AbilityScores) GetModifier(ability types.Ability) int {
	scoreFn, ok := abilityScoreMap[ability]
	if !ok {
		return 0
	}
	score := scoreFn(a)
	return (score - 10) / 2
}

// Item represents an item in the game.
type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}
