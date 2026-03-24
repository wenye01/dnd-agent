// Package character provides character creation and management functionality.
package character

import (
	"fmt"
	"time"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// Supported races for character creation.
var supportedRaces = map[string]bool{
	"human": true,
	"elf":   true,
	"dwarf": true,
}

// Supported classes for character creation.
var supportedClasses = map[string]bool{
	"fighter": true,
	"wizard":  true,
	"rogue":   true,
}

// Class hit dice and base HP values.
var classHitDice = map[string]int{
	"fighter": 10,
	"wizard":  6,
	"rogue":   8,
}

// Race speed values in feet.
var raceSpeed = map[string]int{
	"human": 30,
	"elf":   30,
	"dwarf": 25,
}

// CreateParams defines the parameters for creating a basic character.
type CreateParams struct {
	Name          string            `json:"name"`
	Race          string            `json:"race"`
	Class         string            `json:"class"`
	Background    string            `json:"background"`
	AbilityScores map[string]int    `json:"abilityScores"`
}

// CreateBasic creates a new character with the given parameters.
// It calculates derived stats including HP, AC, proficiency bonus, and speed.
func CreateBasic(params CreateParams) (*models.Character, error) {
	// Validate race
	if !supportedRaces[params.Race] {
		return nil, fmt.Errorf("unsupported race: %s (supported: human, elf, dwarf)", params.Race)
	}

	// Validate class
	if !supportedClasses[params.Class] {
		return nil, fmt.Errorf("unsupported class: %s (supported: fighter, wizard, rogue)", params.Class)
	}

	// Start with level 1
	level := 1

	// Get base HP from class hit dice
	baseHP := classHitDice[params.Class]
	if baseHP == 0 {
		baseHP = 8 // Default fallback
	}

	// Build ability scores
	stats := models.AbilityScores{
		Strength:     getAbilityScore(params.AbilityScores, "str"),
		Dexterity:    getAbilityScore(params.AbilityScores, "dex"),
		Constitution: getAbilityScore(params.AbilityScores, "con"),
		Intelligence: getAbilityScore(params.AbilityScores, "int"),
		Wisdom:       getAbilityScore(params.AbilityScores, "wis"),
		Charisma:     getAbilityScore(params.AbilityScores, "cha"),
	}

	// Calculate HP: base HP + CON modifier
	conMod := stats.GetModifier(types.Constitution)
	maxHP := baseHP + conMod
	if maxHP < 1 {
		maxHP = 1
	}

	// Calculate AC: 10 + DEX modifier (no armor)
	dexMod := stats.GetModifier(types.Dexterity)
	ac := 10 + dexMod

	// Calculate proficiency bonus for level
	profBonus := ProficiencyBonusForLevel(level)

	// Get speed from race
	speed := raceSpeed[params.Race]
	if speed == 0 {
		speed = 30 // Default
	}

	// Starting gold (standard starting wealth by class)
	gold := getStartingGold(params.Class)

	// Initialize saving throws based on class
	savingThrows := getClassSavingThrows(params.Class)

	char := &models.Character{
		ID:               generateID(),
		Name:             params.Name,
		Race:             params.Race,
		Class:            params.Class,
		Level:            level,
		HP:               maxHP,
		MaxHP:            maxHP,
		AC:               ac,
		Stats:            stats,
		Skills:           make(map[types.Skill]bool),
		Inventory:        []models.Item{},
		Conditions:       []types.Condition{},
		Background:       params.Background,
		ProficiencyBonus: profBonus,
		SavingThrows:     savingThrows,
		Speed:            speed,
		Gold:             gold,
	}

	return char, nil
}

// getAbilityScore retrieves an ability score from the map with a default value.
func getAbilityScore(scores map[string]int, key string) int {
	if val, ok := scores[key]; ok {
		if val < 1 {
			return 1
		}
		if val > 20 {
			return 20
		}
		return val
	}
	return 10 // Default
}

// generateID generates a simple unique ID for the character.
func generateID() string {
	return fmt.Sprintf("char-%d", time.Now().UnixNano())
}

// getStartingGold returns the starting gold for a class.
func getStartingGold(class string) int {
	switch class {
	case "fighter":
		return 10  // 5d4 x 10 gp
	case "wizard":
		return 5   // 3d6 x 10 gp
	case "rogue":
		return 10  // 4d4 x 10 gp
	default:
		return 5   // Default
	}
}

// getClassSavingThrows returns the saving throw proficiencies for a class.
func getClassSavingThrows(class string) map[types.Ability]bool {
	throws := make(map[types.Ability]bool)
	
	switch class {
	case "fighter":
		throws[types.Strength] = true
		throws[types.Constitution] = true
	case "wizard":
		throws[types.Intelligence] = true
		throws[types.Wisdom] = true
	case "rogue":
		throws[types.Dexterity] = true
		throws[types.Intelligence] = true
	}
	
	return throws
}

// AbilityModifier calculates the ability modifier from a score.
// Formula: (score - 10) / 2, rounded toward negative infinity.
// This matches D&D 5e rules where odd scores round down.
func AbilityModifier(score int) int {
	mod := (score - 10) / 2
	// In Go, integer division truncates toward zero.
	// We need floor division for negative numbers.
	// E.g., (1-10)/2 = -9/2 = -4, but should be -5.
	if (score-10)%2 != 0 && (score-10) < 0 {
		mod -= 1
	}
	return mod
}

// ProficiencyBonusForLevel calculates the proficiency bonus for a given level.
// Bonus starts at +2 and increases at levels 5, 9, 13, and 17.
func ProficiencyBonusForLevel(level int) int {
	switch {
	case level >= 17:
		return 6
	case level >= 13:
		return 5
	case level >= 9:
		return 4
	case level >= 5:
		return 3
	default:
		return 2
	}
}
