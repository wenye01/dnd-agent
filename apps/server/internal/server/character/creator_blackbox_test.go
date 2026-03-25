package character

import (
	"encoding/json"
	"testing"

	"github.com/dnd-game/server/internal/shared/types"
)

// Blackbox tests verify the character creation system from an external perspective.

func TestBlackbox_ElfWizard_PRD(t *testing.T) {
	params := CreateParams{
		Name:       "艾拉",
		Race:       "elf",
		Class:      "wizard",
		Background: "sage",
		AbilityScores: map[string]int{
			"str": 8, "dex": 14, "con": 12,
			"int": 16, "wis": 12, "cha": 10,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("Failed to create character: %v", err)
	}

	// Elf gets +2 DEX: DEX 14 + 2 = 16, modifier = +3
	// HP: 6 (wizard hit dice) + 1 (CON 12 = +1 mod) = 7
	if char.MaxHP != 7 {
		t.Errorf("PRD expectation failed: MaxHP should be 7, got %d", char.MaxHP)
	}
	// AC: 10 + 3 (DEX 16 = +3 mod) = 13
	if char.AC != 13 {
		t.Errorf("PRD expectation failed: AC should be 13 (elf +2 DEX bonus), got %d", char.AC)
	}
	if char.ProficiencyBonus != 2 {
		t.Errorf("PRD expectation failed: ProficiencyBonus should be 2, got %d", char.ProficiencyBonus)
	}

	// Verify elf racial bonus applied
	if char.Stats.Dexterity != 16 {
		t.Errorf("Expected Dexterity 16 (14+2 elf bonus), got %d", char.Stats.Dexterity)
	}

	// Verify sage background skills
	if !char.Skills[types.Arcana] {
		t.Error("Expected Arcana skill from sage background")
	}
	if !char.Skills[types.History] {
		t.Error("Expected History skill from sage background")
	}
}

func TestBlackbox_AllRaceClassCombinations(t *testing.T) {
	races := []string{"human", "elf", "dwarf"}
	classes := []string{"fighter", "wizard", "rogue"}

	for _, race := range races {
		for _, class := range classes {
			params := CreateParams{
				Name:          "TestCharacter",
				Race:          race,
				Class:         class,
				Background:    "commoner",
				AbilityScores: map[string]int{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
			}

			char, err := CreateBasic(params)
			if err != nil {
				t.Errorf("Failed to create %s %s: %v", race, class, err)
				continue
			}

			if char.ID == "" {
				t.Errorf("%s %s: ID is empty", race, class)
			}
			if char.Name != "TestCharacter" {
				t.Errorf("%s %s: Name mismatch", race, class)
			}
			if char.Level != 1 {
				t.Errorf("%s %s: Level should be 1, got %d", race, class, char.Level)
			}
			if char.HP != char.MaxHP {
				t.Errorf("%s %s: HP should equal MaxHP", race, class)
			}
		}
	}
}

func TestBlackbox_Serialization(t *testing.T) {
	params := CreateParams{
		Name:       "SerializationTest",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("Failed to create character: %v", err)
	}

	jsonData, err := json.Marshal(char)
	if err != nil {
		t.Fatalf("Failed to marshal character to JSON: %v", err)
	}

	if len(jsonData) == 0 {
		t.Fatal("Serialized JSON is empty")
	}

	var jsonMap map[string]interface{}
	if err := json.Unmarshal(jsonData, &jsonMap); err != nil {
		t.Fatalf("Failed to unmarshal JSON map: %v", err)
	}

	requiredFields := []string{"id", "name", "race", "class", "level", "hp", "maxHp", "ac", "stats", "background", "proficiencyBonus", "savingThrows", "speed", "gold"}
	for _, field := range requiredFields {
		if _, ok := jsonMap[field]; !ok {
			t.Errorf("Missing field in JSON: %s", field)
		}
	}
}

func TestBlackbox_ErrorHandling(t *testing.T) {
	_, err := CreateBasic(CreateParams{
		Name:          "Test",
		Race:          "dragonborn",
		Class:         "fighter",
		Background:    "soldier",
		AbilityScores: map[string]int{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
	})
	if err == nil {
		t.Error("Expected error for invalid race, got nil")
	}

	_, err = CreateBasic(CreateParams{
		Name:          "Test",
		Race:          "human",
		Class:         "paladin",
		Background:    "soldier",
		AbilityScores: map[string]int{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
	})
	if err == nil {
		t.Error("Expected error for invalid class, got nil")
	}

	_, err = CreateBasic(CreateParams{
		Name:          "Test",
		Race:          "human",
		Class:         "fighter",
		Background:    "noble",
		AbilityScores: map[string]int{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
	})
	if err == nil {
		t.Error("Expected error for invalid background, got nil")
	}
}

func TestBlackbox_AbilityModifierEdgeCases(t *testing.T) {
	params := CreateParams{
		Name:          "Test",
		Race:          "human",
		Class:         "fighter",
		Background:    "soldier",
		AbilityScores: map[string]int{"str": 1, "dex": 10, "con": 20, "int": 10, "wis": 10, "cha": 10},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("Failed to create character: %v", err)
	}

	// Human gets +1 to all: CON 20 + 1 = 21, modifier = +5
	// HP: 10 (fighter base) + 5 (CON 21 mod) = 15
	expectedHP := 10 + 5 // fighter base HP 10 + CON 21 modifier
	if char.MaxHP != expectedHP {
		t.Errorf("With CON 20+1 human bonus, expected MaxHP %d, got %d", expectedHP, char.MaxHP)
	}

	// Verify human racial bonuses applied
	if char.Stats.Strength != 2 {
		t.Errorf("Expected Strength 2 (1+1 human bonus), got %d", char.Stats.Strength)
	}
	if char.Stats.Constitution != 21 {
		t.Errorf("Expected Constitution 21 (20+1 human bonus), got %d", char.Stats.Constitution)
	}
}

func TestBlackbox_SavingThrowsByClass(t *testing.T) {
	tests := []struct {
		class             string
		strongSavingThrow types.Ability
	}{
		{"fighter", types.Strength},
		{"wizard", types.Intelligence},
		{"rogue", types.Dexterity},
	}

	for _, tt := range tests {
		t.Run(tt.class, func(t *testing.T) {
			params := CreateParams{
				Name:          "Test",
				Race:          "human",
				Class:         tt.class,
				Background:    "soldier",
				AbilityScores: map[string]int{"str": 10, "dex": 10, "con": 10, "int": 10, "wis": 10, "cha": 10},
			}

			char, err := CreateBasic(params)
			if err != nil {
				t.Fatalf("Failed to create character: %v", err)
			}

			if !char.SavingThrows[tt.strongSavingThrow] {
				t.Errorf("%s should be proficient in %s saving throws", tt.class, tt.strongSavingThrow)
			}
		})
	}
}
