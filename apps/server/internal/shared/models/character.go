// Package models provides the core data models for the D&D game.
package models

import "github.com/dnd-game/server/internal/shared/types"

// RaceTrait represents a racial ability or characteristic.
type RaceTrait struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

// Character represents a D&D character.
//
// TODO(future): Consider adding the following fields for full D&D 5e support:
// - ExperiencePoints (XP tracking)
// - HitDice (current/max for healing during short rest)
// - DeathSaves (success/failure counters)
// - Inspiration (boolean)
// - Features []Feature (class/racial features)
// - Spells []Spell (for spellcasters)
// - Equipment []Equipment (detailed equipment with weight)
// - Proficiencies []Proficiency (tool, weapon, armor proficiencies)
type Character struct {
	ID                string                 `json:"id"`
	Name              string                 `json:"name"`
	Race              string                 `json:"race"`
	Class             string                 `json:"class"`
	Level             int                    `json:"level"`
	HP                int                    `json:"hp"`
	MaxHP             int                    `json:"maxHp"`
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
	RacialTraits        []RaceTrait            `json:"racialTraits"`        // Racial abilities and traits
	ArmorProficiencies  []string               `json:"armorProficiencies"`  // Armor proficiencies from class
	WeaponProficiencies []string               `json:"weaponProficiencies"` // Weapon proficiencies from class
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

// Item represents an item in the game.
type Item struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}
