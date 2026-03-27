package models_test

import (
	"testing"

	models "github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

func TestCharacter(t *testing.T) {
	t.Run("create character", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Aldric",
			Race:  "Human",
			Class: "Fighter",
			Level: 3,
			HP:    27,
			MaxHP: 27,
			AC:    16,
		}

		if char.ID != "char-1" {
			t.Errorf("Expected ID 'char-1', got %s", char.ID)
		}
		if char.Name != "Aldric" {
			t.Errorf("Expected name 'Aldric', got %s", char.Name)
		}
		if char.Level != 3 {
			t.Errorf("Expected level 3, got %d", char.Level)
		}
	})

	t.Run("character with ability scores", func(t *testing.T) {
		char := &models.Character{
			ID:   "char-1",
			Name: "Hero",
			Stats: models.AbilityScores{
				Strength:     16,
				Dexterity:    14,
				Constitution: 15,
				Intelligence: 10,
				Wisdom:       12,
				Charisma:     8,
			},
		}

		if char.Stats.Strength != 16 {
			t.Errorf("Expected Strength 16")
		}
		if char.Stats.Charisma != 8 {
			t.Errorf("Expected Charisma 8")
		}
	})

	t.Run("character with skills", func(t *testing.T) {
		char := &models.Character{
			ID:     "char-1",
			Name:   "Rogue",
			Skills: map[types.Skill]bool{
				types.Stealth:      true,
				types.SleightOfHand: true,
				types.Athletics:    false,
			},
		}

		if !char.Skills[types.Stealth] {
			t.Errorf("Expected proficiency in Stealth")
		}
		if char.Skills[types.Athletics] {
			t.Errorf("Expected no proficiency in Athletics")
		}
	})

	t.Run("character with inventory", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Adventurer",
			Inventory: []models.Item{
				{ID: "item-1", Name: "Longsword", Type: "weapon"},
				{ID: "item-2", Name: "Health Potion", Type: "consumable"},
			},
		}

		if len(char.Inventory) != 2 {
			t.Errorf("Expected 2 inventory items, got %d", len(char.Inventory))
		}
		if char.Inventory[0].Name != "Longsword" {
			t.Errorf("Expected first item to be Longsword")
		}
	})

	t.Run("character with conditions", func(t *testing.T) {
		char := &models.Character{
			ID:         "char-1",
			Name:       "Unfortunate Hero",
			Conditions: []types.Condition{types.ConditionPoisoned, types.ConditionFrightened},
		}

		if len(char.Conditions) != 2 {
			t.Errorf("Expected 2 conditions")
		}
		if char.Conditions[0] != types.ConditionPoisoned {
			t.Errorf("Expected first condition to be Poisoned")
		}
	})
}

func TestAbilityScores(t *testing.T) {
	t.Run("get strength modifier", func(t *testing.T) {
		stats := models.AbilityScores{Strength: 16}
		modifier := stats.GetModifier(types.Strength)

		if modifier != 3 {
			t.Errorf("Strength 16 should give +3 modifier, got %d", modifier)
		}
	})

	t.Run("get dexterity modifier", func(t *testing.T) {
		stats := models.AbilityScores{Dexterity: 14}
		modifier := stats.GetModifier(types.Dexterity)

		if modifier != 2 {
			t.Errorf("Dexterity 14 should give +2 modifier, got %d", modifier)
		}
	})

	t.Run("get constitution modifier", func(t *testing.T) {
		stats := models.AbilityScores{Constitution: 18}
		modifier := stats.GetModifier(types.Constitution)

		if modifier != 4 {
			t.Errorf("Constitution 18 should give +4 modifier, got %d", modifier)
		}
	})

	t.Run("get intelligence modifier", func(t *testing.T) {
		stats := models.AbilityScores{Intelligence: 10}
		modifier := stats.GetModifier(types.Intelligence)

		if modifier != 0 {
			t.Errorf("Intelligence 10 should give +0 modifier, got %d", modifier)
		}
	})

	t.Run("get wisdom modifier", func(t *testing.T) {
		stats := models.AbilityScores{Wisdom: 8}
		modifier := stats.GetModifier(types.Wisdom)

		if modifier != -1 {
			t.Errorf("Wisdom 8 should give -1 modifier, got %d", modifier)
		}
	})

	t.Run("get charisma modifier", func(t *testing.T) {
		stats := models.AbilityScores{Charisma: 20}
		modifier := stats.GetModifier(types.Charisma)

		if modifier != 5 {
			t.Errorf("Charisma 20 should give +5 modifier, got %d", modifier)
		}
	})

	t.Run("low score gives negative modifier", func(t *testing.T) {
		tests := []struct {
			score    int
			expected int
		}{
			{1, -5},   // (1-10)/2 = -4.5 -> -5 (floor division)
			{2, -4},   // (2-10)/2 = -4
			{4, -3},   // (4-10)/2 = -3
			{6, -2},   // (6-10)/2 = -2
			{8, -1},   // (8-10)/2 = -1
		}

		for _, tt := range tests {
			stats := models.AbilityScores{Strength: tt.score}
			modifier := stats.GetModifier(types.Strength)
			if modifier != tt.expected {
				t.Errorf("Score %d should give %d modifier, got %d", tt.score, tt.expected, modifier)
			}
		}
	})

	t.Run("high score gives positive modifier", func(t *testing.T) {
		tests := []struct {
			score    int
			expected int
		}{
			{12, 1},
			{14, 2},
			{16, 3},
			{18, 4},
			{20, 5},
		}

		for _, tt := range tests {
			stats := models.AbilityScores{Strength: tt.score}
			modifier := stats.GetModifier(types.Strength)
			if modifier != tt.expected {
				t.Errorf("Score %d should give %d modifier, got %d", tt.score, tt.expected, modifier)
			}
		}
	})

	t.Run("zero score gives negative modifier", func(t *testing.T) {
		// Test with a valid ability that has 0 score
		stats := models.AbilityScores{}
		modifier := stats.GetModifier(types.Strength)
		if modifier != -5 {
			t.Errorf("Strength 0 should give -5 modifier, got %d", modifier)
		}
	})
}

func TestItem(t *testing.T) {
	t.Run("create item", func(t *testing.T) {
		item := models.Item{
			ID:          "item-1",
			Name:        "Longsword",
			Description: "A versatile melee weapon",
			Type:        "weapon",
		}

		if item.ID != "item-1" {
			t.Errorf("Expected ID 'item-1'")
		}
		if item.Name != "Longsword" {
			t.Errorf("Expected name 'Longsword'")
		}
		if item.Type != "weapon" {
			t.Errorf("Expected type 'weapon'")
		}
	})

	t.Run("create potion", func(t *testing.T) {
		item := models.Item{
			ID:          "potion-1",
			Name:        "Health Potion",
			Description: "Restores 2d4+2 HP when consumed",
			Type:        "consumable",
		}

		if item.Type != "consumable" {
			t.Errorf("Expected type 'consumable'")
		}
	})
}

func TestCharacterProficiency(t *testing.T) {
	t.Run("proficient skills", func(t *testing.T) {
		char := &models.Character{
			ID:   "char-1",
			Name: "Rogue",
			Skills: map[types.Skill]bool{
				types.Stealth:       true,
				types.Deception:     true,
				types.Investigation: true,
				types.Perception:    false,
			},
		}

		proficientCount := 0
		for _, isProficient := range char.Skills {
			if isProficient {
				proficientCount++
			}
		}

		if proficientCount != 3 {
			t.Errorf("Expected 3 proficient skills, got %d", proficientCount)
		}
	})

	t.Run("empty skill map", func(t *testing.T) {
		char := &models.Character{
			ID:     "char-1",
			Name:   "Commoner",
			Skills: map[types.Skill]bool{},
		}

		if len(char.Skills) != 0 {
			t.Errorf("Expected empty skill map")
		}
	})
}

func TestCharacterHealth(t *testing.T) {
	t.Run("full health", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Healthy Hero",
			HP:    27,
			MaxHP: 27,
		}

		if char.HP != char.MaxHP {
			t.Errorf("Hero at full health should have HP == MaxHP")
		}
	})

	t.Run("damaged character", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Wounded Hero",
			HP:    5,
			MaxHP: 27,
		}

		if char.HP >= char.MaxHP {
			t.Errorf("Wounded hero should have HP < MaxHP")
		}
		healthPercent := float64(char.HP) / float64(char.MaxHP) * 100
		if healthPercent < 0 || healthPercent > 100 {
			t.Errorf("Health percentage out of range")
		}
	})

	t.Run("unconscious character", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Fallen Hero",
			HP:    0,
			MaxHP: 27,
		}

		if char.HP != 0 {
			t.Errorf("Unconscious character should have 0 HP")
		}
	})
}

func TestCharacterArmorClass(t *testing.T) {
	t.Run("light armor", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Rogue",
			AC:    12, // Leather armor + high dex
		}

		if char.AC != 12 {
			t.Errorf("Expected AC 12")
		}
	})

	t.Run("heavy armor", func(t *testing.T) {
		char := &models.Character{
			ID:    "char-1",
			Name:  "Paladin",
			AC:    18, // Plate armor
		}

		if char.AC != 18 {
			t.Errorf("Expected AC 18")
		}
	})
}
