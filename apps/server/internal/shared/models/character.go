// Package models provides the core data models for the D&D game.
package models

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/types"
)

// RaceTrait represents a racial ability or characteristic.
type RaceTrait struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Character represents a D&D character.
type Character struct {
	ID                string                 `json:"id"`
	Name              string                 `json:"name"`
	Race              string                 `json:"race"`
	Class             string                 `json:"class"`
	Level             int                    `json:"level"`
	HP                int                    `json:"hp"`
	MaxHP             int                    `json:"maxHp"`
	TemporaryHP       int                    `json:"temporaryHp,omitempty"` // Temporary hit points
	AC                int                    `json:"ac"`
	Stats             AbilityScores          `json:"stats"`
	Skills            map[types.Skill]bool   `json:"skills"` // true = proficient
	Inventory         []Item                 `json:"inventory"`
	Conditions        []types.Condition      `json:"conditions,omitempty"`
	Background        string                 `json:"background"`       // Character background
	ProficiencyBonus  int                    `json:"proficiencyBonus"` // Proficiency bonus
	SavingThrows      map[types.Ability]bool `json:"savingThrows"`     // Saving throw proficiencies
	Speed             int                    `json:"speed"`            // Movement speed in feet
	Gold              int                    `json:"gold"`             // Gold pieces
	RacialTraits      []RaceTrait            `json:"racialTraits"`     // Racial abilities and traits
	HitDice           HitDiceInfo            `json:"hitDice"`          // Hit dice for short rest healing
	DeathSaves        DeathSaves             `json:"deathSaves"`       // Death save counters
	DamageResistances []types.DamageType     `json:"damageResistances,omitempty"`
	DamageImmunities  []types.DamageType     `json:"damageImmunities,omitempty"`
	IsDead            bool                   `json:"isDead,omitempty"` // Character has permanently died
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
// Formula: (score - 10) / 2, rounded toward negative infinity.
func (a AbilityScores) GetModifier(ability types.Ability) int {
	scoreFn, ok := abilityScoreMap[ability]
	if !ok {
		return 0
	}
	score := scoreFn(a)
	mod := (score - 10) / 2
	// In Go, integer division truncates toward zero.
	// We need floor division for negative numbers to match D&D 5e rules.
	if (score-10)%2 != 0 && (score-10) < 0 {
		mod -= 1
	}
	return mod
}

// HitDiceInfo tracks hit dice available for short rest healing.
type HitDiceInfo struct {
	Total   int `json:"total"`   // Total hit dice (equals character level)
	Current int `json:"current"` // Currently available hit dice
	Size    int `json:"size"`    // Die size (6 for wizard, 8 for rogue, 10 for fighter, 12 for barbarian)
}

// DeathSaves tracks death saving throw progress.
type DeathSaves struct {
	Successes int `json:"successes"` // Successes (3 = stable)
	Failures  int `json:"failures"`  // Failures (3 = dead)
}

// Item represents an item in the game.
type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

// validHitDiceSizes are the allowed hit die sizes in D&D 5e.
var validHitDiceSizes = map[int]bool{4: true, 6: true, 8: true, 10: true, 12: true}

// Validate checks that HitDiceInfo fields are consistent and valid.
func (h HitDiceInfo) Validate() error {
	if !validHitDiceSizes[h.Size] {
		return fmt.Errorf("invalid hit die size %d, must be one of 4, 6, 8, 10, 12", h.Size)
	}
	if h.Current < 0 {
		return fmt.Errorf("current hit dice %d cannot be negative", h.Current)
	}
	if h.Current > h.Total {
		return fmt.Errorf("current hit dice %d exceeds total %d", h.Current, h.Total)
	}
	if h.Total < 0 {
		return fmt.Errorf("total hit dice %d cannot be negative", h.Total)
	}
	return nil
}

// Validate checks that DeathSaves values are within D&D 5e bounds.
func (d DeathSaves) Validate() error {
	if d.Successes < 0 {
		return fmt.Errorf("death save successes %d cannot be negative", d.Successes)
	}
	if d.Successes > 3 {
		return fmt.Errorf("death save successes %d exceeds maximum of 3", d.Successes)
	}
	if d.Failures < 0 {
		return fmt.Errorf("death save failures %d cannot be negative", d.Failures)
	}
	if d.Failures > 3 {
		return fmt.Errorf("death save failures %d exceeds maximum of 3", d.Failures)
	}
	return nil
}
