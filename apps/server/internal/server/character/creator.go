// Package character provides character creation and management functionality.
package character

import (
	"fmt"
	"strings"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
	"github.com/google/uuid"
)

// Default values for character creation.
const (
	defaultBaseHP   = 8  // Default base HP when class hit dice lookup fails
	defaultSpeed    = 30 // Default movement speed in feet
	minHP           = 1  // Minimum HP for any character
	defaultAbility  = 10 // Default ability score
)

// Ability score limits.
const (
	minAbilityScore = 1
	maxAbilityScore = 20
)

// Supported race names.
const (
	RaceHuman = "human"
	RaceElf   = "elf"
	RaceDwarf = "dwarf"
)

// Supported class names.
const (
	ClassFighter = "fighter"
	ClassWizard  = "wizard"
	ClassRogue   = "rogue"
)

// RaceConfig holds configuration for a playable race.
type RaceConfig struct {
	Name   string
	Speed  int
	Traits []models.RaceTrait
}

// ClassConfig holds configuration for a playable class.
type ClassConfig struct {
	Name              string
	HitDice           int
	SavingThrows      []types.Ability
	StartingGoldDice  string // D&D 5e starting wealth formula
	StartingGoldAvg   int    // Simplified average for quick creation
}

// Supported races configuration with traits.
var raceConfigs = map[string]RaceConfig{
	"human": {
		Name:  "human",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Ability Score Increase", Description: "+1 to all ability scores"},
			{Name: "Languages", Description: "Common, one extra language"},
		},
	},
	"elf": {
		Name:  "elf",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Keen Senses", Description: "Proficiency in Perception"},
			{Name: "Fey Ancestry", Description: "Advantage on saves against charm, immunity to sleep"},
		},
	},
	"dwarf": {
		Name:  "dwarf",
		Speed: 25,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Dwarven Resilience", Description: "Advantage on saves against poison, resistance to poison damage"},
			{Name: "Stonecunning", Description: "Double proficiency on History checks related to stonework"},
		},
	},
}

// Supported classes configuration.
var classConfigs = map[string]ClassConfig{
	"fighter": {
		Name:              "fighter",
		HitDice:           10,
		SavingThrows:      []types.Ability{types.Strength, types.Constitution},
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"wizard": {
		Name:              "wizard",
		HitDice:           6,
		SavingThrows:      []types.Ability{types.Intelligence, types.Wisdom},
		StartingGoldDice:  "3d6 x 10 gp",
		StartingGoldAvg:   105, // Average of 3d6 is 10.5, x 10 = 105
	},
	"rogue": {
		Name:              "rogue",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Dexterity, types.Intelligence},
		StartingGoldDice:  "4d4 x 10 gp",
		StartingGoldAvg:   100, // Average of 4d4 is 10, x 10 = 100
	},
}

// CreateParams defines the parameters for creating a basic character.
type CreateParams struct {
	Name          string         `json:"name"`
	Race          string         `json:"race"`
	Class         string         `json:"class"`
	Background    string         `json:"background"`
	AbilityScores map[string]int `json:"abilityScores"`
}

// CreateBasic creates a new character with the given parameters.
// It calculates derived stats including HP, AC, proficiency bonus, and speed.
func CreateBasic(params CreateParams) (*models.Character, error) {
	// Validate name
	if strings.TrimSpace(params.Name) == "" {
		return nil, fmt.Errorf("character name cannot be empty")
	}

	// Normalize and validate race (case-insensitive)
	race := strings.ToLower(strings.TrimSpace(params.Race))
	raceConfig, ok := raceConfigs[race]
	if !ok {
		return nil, fmt.Errorf("unsupported race: %s (supported: human, elf, dwarf)", params.Race)
	}

	// Normalize and validate class (case-insensitive)
	class := strings.ToLower(strings.TrimSpace(params.Class))
	classConfig, ok := classConfigs[class]
	if !ok {
		return nil, fmt.Errorf("unsupported class: %s (supported: fighter, wizard, rogue)", params.Class)
	}

	// Validate ability scores
	for ability, score := range params.AbilityScores {
		if score < minAbilityScore || score > maxAbilityScore {
			return nil, fmt.Errorf("ability score %s out of range [%d, %d]: %d", ability, minAbilityScore, maxAbilityScore, score)
		}
	}

	// Start with level 1
	level := 1

	// Build ability scores with validation
	stats := models.AbilityScores{
		Strength:     getAbilityScore(params.AbilityScores, "str"),
		Dexterity:    getAbilityScore(params.AbilityScores, "dex"),
		Constitution: getAbilityScore(params.AbilityScores, "con"),
		Intelligence: getAbilityScore(params.AbilityScores, "int"),
		Wisdom:       getAbilityScore(params.AbilityScores, "wis"),
		Charisma:     getAbilityScore(params.AbilityScores, "cha"),
	}

	// Calculate HP: class hit dice + CON modifier
	maxHP := classConfig.HitDice + stats.GetModifier(types.Constitution)
	if maxHP < minHP {
		maxHP = minHP
	}

	// Calculate AC: 10 + DEX modifier (no armor)
	ac := 10 + stats.GetModifier(types.Dexterity)

	// Calculate proficiency bonus for level
	profBonus := ProficiencyBonusForLevel(level)

	// Initialize saving throws based on class
	savingThrows := make(map[types.Ability]bool)
	for _, ability := range classConfig.SavingThrows {
		savingThrows[ability] = true
	}

	char := &models.Character{
		ID:               generateID(),
		Name:             params.Name,
		Race:             race,  // Use normalized value
		Class:            class, // Use normalized value
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
		Speed:            raceConfig.Speed,
		Gold:             classConfig.StartingGoldAvg,
		RacialTraits:     raceConfig.Traits,
	}

	return char, nil
}

// getAbilityScore retrieves an ability score from the map with a default value.
// Note: Validation is handled in CreateBasic, so values here are already validated.
func getAbilityScore(scores map[string]int, key string) int {
	if val, ok := scores[key]; ok {
		return val
	}
	return defaultAbility
}

// generateID generates a unique ID for the character using UUID.
func generateID() string {
	return fmt.Sprintf("char-%s", uuid.New().String())
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
