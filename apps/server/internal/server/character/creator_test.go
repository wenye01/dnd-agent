package character

import (
	"encoding/json"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// TestCreateBasic_ElfWizard tests creating an elf wizard as specified in the PRD.
func TestCreateBasic_ElfWizard(t *testing.T) {
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
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Verify basic fields
	if char.Name != "艾拉" {
		t.Errorf("Expected Name '艾拉', got '%s'", char.Name)
	}
	if char.Race != "elf" {
		t.Errorf("Expected Race 'elf', got '%s'", char.Race)
	}
	if char.Class != "wizard" {
		t.Errorf("Expected Class 'wizard', got '%s'", char.Class)
	}
	if char.Background != "sage" {
		t.Errorf("Expected Background 'sage', got '%s'", char.Background)
	}

	// Verify HP: 6 (base wizard HP) + 1 (CON mod from 12) = 7
	if char.MaxHP != 7 {
		t.Errorf("Expected MaxHP 7, got %d", char.MaxHP)
	}
	if char.HP != char.MaxHP {
		t.Errorf("Expected HP %d, got %d", char.MaxHP, char.HP)
	}

	// Verify AC: 10 + 2 (DEX mod from 14) = 12
	if char.AC != 12 {
		t.Errorf("Expected AC 12, got %d", char.AC)
	}

	// Verify proficiency bonus: level 1 = 2
	if char.ProficiencyBonus != 2 {
		t.Errorf("Expected ProficiencyBonus 2, got %d", char.ProficiencyBonus)
	}

	// Verify speed: elf = 30
	if char.Speed != 30 {
		t.Errorf("Expected Speed 30, got %d", char.Speed)
	}

	// Verify saving throws: wizard gets Intelligence and Wisdom
	if !char.SavingThrows[types.Intelligence] {
		t.Error("Expected Intelligence saving throw proficiency")
	}
	if !char.SavingThrows[types.Wisdom] {
		t.Error("Expected Wisdom saving throw proficiency")
	}
	if char.SavingThrows[types.Strength] {
		t.Error("Did not expect Strength saving throw proficiency")
	}
}

// TestCreateBasic_HumanFighter tests creating a human fighter.
func TestCreateBasic_HumanFighter(t *testing.T) {
	params := CreateParams{
		Name:       "凯尔",
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
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Verify HP: 10 (base fighter HP) + 2 (CON mod from 14) = 12
	if char.MaxHP != 12 {
		t.Errorf("Expected MaxHP 12, got %d", char.MaxHP)
	}

	// Verify AC: 10 + 1 (DEX mod from 12) = 11
	if char.AC != 11 {
		t.Errorf("Expected AC 11, got %d", char.AC)
	}

	// Verify saving throws: fighter gets Strength and Constitution
	if !char.SavingThrows[types.Strength] {
		t.Error("Expected Strength saving throw proficiency")
	}
	if !char.SavingThrows[types.Constitution] {
		t.Error("Expected Constitution saving throw proficiency")
	}
}

// TestCreateBasic_DwarfRogue tests creating a dwarf rogue.
func TestCreateBasic_DwarfRogue(t *testing.T) {
	params := CreateParams{
		Name:       "索林",
		Race:       "dwarf",
		Class:      "rogue",
		Background: "criminal",
		AbilityScores: map[string]int{
			"str": 10, "dex": 16, "con": 12,
			"int": 12, "wis": 10, "cha": 8,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Verify HP: 8 (base rogue HP) + 1 (CON mod from 12) = 9
	if char.MaxHP != 9 {
		t.Errorf("Expected MaxHP 9, got %d", char.MaxHP)
	}

	// Verify AC: 10 + 3 (DEX mod from 16) = 13
	if char.AC != 13 {
		t.Errorf("Expected AC 13, got %d", char.AC)
	}

	// Verify speed: dwarf = 25
	if char.Speed != 25 {
		t.Errorf("Expected Speed 25, got %d", char.Speed)
	}

	// Verify saving throws: rogue gets Dexterity and Intelligence
	if !char.SavingThrows[types.Dexterity] {
		t.Error("Expected Dexterity saving throw proficiency")
	}
	if !char.SavingThrows[types.Intelligence] {
		t.Error("Expected Intelligence saving throw proficiency")
	}
}

// TestCreateBasic_InvalidRace tests error handling for invalid race.
func TestCreateBasic_InvalidRace(t *testing.T) {
	params := CreateParams{
		Name:       "测试",
		Race:       "dragonborn",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for invalid race, got nil")
	}
}

// TestCreateBasic_InvalidClass tests error handling for invalid class.
func TestCreateBasic_InvalidClass(t *testing.T) {
	params := CreateParams{
		Name:       "测试",
		Race:       "human",
		Class:      "paladin",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for invalid class, got nil")
	}
}

// TestAbilityModifier tests the ability modifier calculation.
func TestAbilityModifier(t *testing.T) {
	tests := []struct {
		score    int
		expected int
	}{
		{1, -5},   // (1 - 10) / 2 = -4.5 -> -5
		{8, -1},   // (8 - 10) / 2 = -1
		{10, 0},   // (10 - 10) / 2 = 0
		{12, 1},   // (12 - 10) / 2 = 1
		{14, 2},   // (14 - 10) / 2 = 2
		{16, 3},   // (16 - 10) / 2 = 3
		{18, 4},   // (18 - 10) / 2 = 4
		{20, 5},   // (20 - 10) / 2 = 5
	}

	for _, tt := range tests {
		result := AbilityModifier(tt.score)
		if result != tt.expected {
			t.Errorf("AbilityModifier(%d) = %d; expected %d", tt.score, result, tt.expected)
		}
	}
}

// TestProficiencyBonusForLevel tests the proficiency bonus calculation.
func TestProficiencyBonusForLevel(t *testing.T) {
	tests := []struct {
		level    int
		expected int
	}{
		{1, 2},  // Level 1-4: +2
		{2, 2},
		{4, 2},
		{5, 3},  // Level 5-8: +3
		{8, 3},
		{9, 4},  // Level 9-12: +4
		{12, 4},
		{13, 5}, // Level 13-16: +5
		{16, 5},
		{17, 6}, // Level 17-20: +6
		{20, 6},
	}

	for _, tt := range tests {
		result := ProficiencyBonusForLevel(tt.level)
		if result != tt.expected {
			t.Errorf("ProficiencyBonusForLevel(%d) = %d; expected %d", tt.level, result, tt.expected)
		}
	}
}

// TestCharacterSerialization tests that the character can be serialized to JSON.
func TestCharacterSerialization(t *testing.T) {
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
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Test JSON marshaling
	data, err := json.Marshal(char)
	if err != nil {
		t.Fatalf("JSON Marshal failed: %v", err)
	}

	// Test JSON unmarshaling
	var unmarshaled models.Character
	err = json.Unmarshal(data, &unmarshaled)
	if err != nil {
		t.Fatalf("JSON Unmarshal failed: %v", err)
	}

	// Verify key fields match
	if unmarshaled.Name != char.Name {
		t.Errorf("Unmarshaled Name mismatch: got %s, want %s", unmarshaled.Name, char.Name)
	}
	if unmarshaled.MaxHP != char.MaxHP {
		t.Errorf("Unmarshaled MaxHP mismatch: got %d, want %d", unmarshaled.MaxHP, char.MaxHP)
	}
	if unmarshaled.AC != char.AC {
		t.Errorf("Unmarshaled AC mismatch: got %d, want %d", unmarshaled.AC, char.AC)
	}
}
