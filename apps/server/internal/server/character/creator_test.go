package character

import (
	"encoding/json"
	"strings"
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

	// Elf gets +2 DEX: DEX 14 + 2 = 16
	// Verify ability scores with racial bonus
	if char.Stats.Dexterity != 16 {
		t.Errorf("Expected Dexterity 16 (14+2 elf bonus), got %d", char.Stats.Dexterity)
	}

	// Verify HP: 6 (base wizard HP) + 1 (CON mod from 12) = 7
	if char.MaxHP != 7 {
		t.Errorf("Expected MaxHP 7, got %d", char.MaxHP)
	}
	if char.HP != char.MaxHP {
		t.Errorf("Expected HP %d, got %d", char.MaxHP, char.HP)
	}

	// Verify AC: 10 + 3 (DEX mod from 16) = 13
	if char.AC != 13 {
		t.Errorf("Expected AC 13 (with elf DEX bonus), got %d", char.AC)
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

	// Verify sage background skills
	if !char.Skills[types.Arcana] {
		t.Error("Expected Arcana skill from sage background")
	}
	if !char.Skills[types.History] {
		t.Error("Expected History skill from sage background")
	}
}

// TestCreateBasic_HumanFighter tests creating a human fighter.
// Human gets +1 to all ability scores, which affects HP and AC calculations.
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

	// Human +1 to all: STR 17, DEX 13, CON 15, INT 11, WIS 11, CHA 11
	// HP: 10 (fighter hit dice) + 2 (CON 15 = +2 mod) = 12
	if char.MaxHP != 12 {
		t.Errorf("Expected MaxHP 12 (with human CON bonus), got %d", char.MaxHP)
	}

	// AC: 10 + 1 (DEX 13 = +1 mod) = 11
	if char.AC != 11 {
		t.Errorf("Expected AC 11 (with human DEX bonus), got %d", char.AC)
	}

	// Verify ability scores include racial bonus
	if char.Stats.Strength != 17 {
		t.Errorf("Expected Strength 17 (16+1 human bonus), got %d", char.Stats.Strength)
	}
	if char.Stats.Constitution != 15 {
		t.Errorf("Expected Constitution 15 (14+1 human bonus), got %d", char.Stats.Constitution)
	}

	// Verify saving throws: fighter gets Strength and Constitution
	if !char.SavingThrows[types.Strength] {
		t.Error("Expected Strength saving throw proficiency")
	}
	if !char.SavingThrows[types.Constitution] {
		t.Error("Expected Constitution saving throw proficiency")
	}

	// Verify background skills (soldier: Athletics, Intimidation)
	if !char.Skills[types.Athletics] {
		t.Error("Expected Athletics skill from soldier background")
	}
	if !char.Skills[types.Intimidation] {
		t.Error("Expected Intimidation skill from soldier background")
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

	// Dwarf gets +2 CON: CON 12 + 2 = 14
	// Verify HP: 8 (base rogue HP) + 2 (CON mod from 14) = 10
	if char.MaxHP != 10 {
		t.Errorf("Expected MaxHP 10 (with dwarf CON bonus), got %d", char.MaxHP)
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

	// Verify criminal background skills
	if !char.Skills[types.Deception] {
		t.Error("Expected Deception skill from criminal background")
	}
	if !char.Skills[types.Stealth] {
		t.Error("Expected Stealth skill from criminal background")
	}

	// Verify dwarf racial bonus applied
	if char.Stats.Constitution != 14 {
		t.Errorf("Expected Constitution 14 (12+2 dwarf bonus), got %d", char.Stats.Constitution)
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

// TestCreateBasic_InvalidBackground tests error handling for invalid background.
func TestCreateBasic_InvalidBackground(t *testing.T) {
	params := CreateParams{
		Name:       "测试",
		Race:       "human",
		Class:      "fighter",
		Background: "noble",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for invalid background, got nil")
	}
}

// TestCreateBasic_ElfRacialBonus tests that elf racial DEX bonus is applied.
func TestCreateBasic_ElfRacialBonus(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "elf",
		Class:      "rogue",
		Background: "criminal",
		AbilityScores: map[string]int{
			"str": 10, "dex": 14, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Elf gets +2 DEX
	if char.Stats.Dexterity != 16 {
		t.Errorf("Expected Dexterity 16 (14+2 elf bonus), got %d", char.Stats.Dexterity)
	}
}

// TestCreateBasic_DwarfRacialBonus tests that dwarf racial CON bonus is applied.
func TestCreateBasic_DwarfRacialBonus(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "dwarf",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 14, "dex": 10, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Dwarf gets +2 CON
	if char.Stats.Constitution != 16 {
		t.Errorf("Expected Constitution 16 (14+2 dwarf bonus), got %d", char.Stats.Constitution)
	}
}

// TestCreateBasic_SkillChoices tests that class skill choices are applied.
func TestCreateBasic_SkillChoices(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
		SkillChoices: []types.Skill{types.Survival, types.Perception},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Background skills
	if !char.Skills[types.Athletics] {
		t.Error("Expected Athletics from soldier background")
	}
	if !char.Skills[types.Intimidation] {
		t.Error("Expected Intimidation from soldier background")
	}
	// Chosen class skills
	if !char.Skills[types.Survival] {
		t.Error("Expected Survival from skill choices")
	}
	if !char.Skills[types.Perception] {
		t.Error("Expected Perception from skill choices")
	}
}

// TestCreateBasic_InvalidSkillChoice tests error handling for invalid skill choices.
func TestCreateBasic_InvalidSkillChoice(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
		SkillChoices: []types.Skill{types.Arcana}, // Arcana is not a fighter skill
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for invalid skill choice, got nil")
	}
}

// TestCreateBasic_DuplicateSkillChoice tests error handling for duplicate skills.
func TestCreateBasic_DuplicateSkillChoice(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier", // Gives Athletics
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
		SkillChoices: []types.Skill{types.Athletics}, // Already from background
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for duplicate skill choice, got nil")
	}
}

// TestAbilityModifier tests the ability modifier calculation via models.AbilityScores.
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
		// Use models.AbilityScores.GetModifier() to avoid code duplication
		stats := models.AbilityScores{Strength: tt.score}
		result := stats.GetModifier(types.Strength)
		if result != tt.expected {
			t.Errorf("GetModifier(Strength=%d) = %d; expected %d", tt.score, result, tt.expected)
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

// TestCreateBasic_EmptyName tests error handling for empty name.
func TestCreateBasic_EmptyName(t *testing.T) {
	params := CreateParams{
		Name:       "",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for empty name, got nil")
	}
}

// TestCreateBasic_WhitespaceName tests error handling for whitespace-only name.
func TestCreateBasic_WhitespaceName(t *testing.T) {
	params := CreateParams{
		Name:       "   ",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 16, "dex": 12, "con": 14,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for whitespace-only name, got nil")
	}
}

// TestCreateBasic_AbilityScoreOutOfRange tests error handling for ability scores out of range.
func TestCreateBasic_AbilityScoreOutOfRange(t *testing.T) {
	// Test score below minimum
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 0, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	_, err := CreateBasic(params)
	if err == nil {
		t.Error("Expected error for ability score below minimum, got nil")
	}

	// Test score above maximum
	params.AbilityScores["str"] = 25
	_, err = CreateBasic(params)
	if err == nil {
		t.Error("Expected error for ability score above maximum, got nil")
	}
}

// TestCreateBasic_RacialTraits tests that racial traits are properly assigned.
func TestCreateBasic_RacialTraits(t *testing.T) {
	tests := []struct {
		race          string
		expectedTrait string
	}{
		{"elf", "Darkvision"},
		{"dwarf", "Dwarven Resilience"},
		{"human", "Ability Score Increase"},
	}

	for _, tt := range tests {
		t.Run(tt.race, func(t *testing.T) {
			params := CreateParams{
				Name:       "Test",
				Race:       tt.race,
				Class:      "fighter",
				Background: "soldier",
				AbilityScores: map[string]int{
					"str": 10, "dex": 10, "con": 10,
					"int": 10, "wis": 10, "cha": 10,
				},
			}

			char, err := CreateBasic(params)
			if err != nil {
				t.Fatalf("CreateBasic failed: %v", err)
			}

			if len(char.RacialTraits) == 0 {
				t.Fatalf("Expected racial traits for %s, got none", tt.race)
			}

			found := false
			for _, trait := range char.RacialTraits {
				if trait.Name == tt.expectedTrait {
					found = true
					break
				}
			}

			if !found {
				t.Errorf("Expected trait '%s' for %s, not found", tt.expectedTrait, tt.race)
			}
		})
	}
}

// TestCreateBasic_UUIDFormat tests that character ID is a valid UUID format.
func TestCreateBasic_UUIDFormat(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"str": 10, "dex": 10, "con": 10,
			"int": 10, "wis": 10, "cha": 10,
		},
	}

	// Create two characters and verify their IDs are different
	char1, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	char2, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Verify IDs are different (UUID uniqueness)
	if char1.ID == char2.ID {
		t.Error("Expected different UUIDs for different characters")
	}

	// Verify ID format (char-{uuid})
	if len(char1.ID) < 36 {
		t.Errorf("ID too short, expected UUID format: %s", char1.ID)
	}
}

// TestCreateBasic_StartingGold tests that starting gold is assigned correctly.
func TestCreateBasic_StartingGold(t *testing.T) {
	expectedGold := map[string]int{
		"fighter": 125, // Average of 5d4 x 10
		"wizard":  105, // Average of 3d6 x 10
		"rogue":   100, // Average of 4d4 x 10
	}

	for class, expected := range expectedGold {
		t.Run(class, func(t *testing.T) {
			params := CreateParams{
				Name:       "Test",
				Race:       "human",
				Class:      class,
				Background: "soldier",
				AbilityScores: map[string]int{
					"str": 10, "dex": 10, "con": 10,
					"int": 10, "wis": 10, "cha": 10,
				},
			}

			char, err := CreateBasic(params)
			if err != nil {
				t.Fatalf("CreateBasic failed: %v", err)
			}

			if char.Gold != expected {
				t.Errorf("Expected starting gold %d for %s, got %d", expected, class, char.Gold)
			}
		})
	}
}

// TestCreateBasic_CaseInsensitiveRaceClass tests that race and class lookups are case-insensitive.
func TestCreateBasic_CaseInsensitiveRaceClass(t *testing.T) {
	tests := []struct {
		name  string
		race  string
		class string
	}{
		{"uppercase race", "HUMAN", "fighter"},
		{"uppercase class", "human", "FIGHTER"},
		{"mixed case race", "ElF", "wizard"},
		{"mixed case class", "elf", "WiZaRd"},
		{"all uppercase", "DWARF", "ROGUE"},
		{"with whitespace", "  human  ", "  fighter  "},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			params := CreateParams{
				Name:       "Test",
				Race:       tt.race,
				Class:      tt.class,
				Background: "soldier",
				AbilityScores: map[string]int{
					"str": 10, "dex": 10, "con": 10,
					"int": 10, "wis": 10, "cha": 10,
				},
			}

			char, err := CreateBasic(params)
			if err != nil {
				t.Fatalf("CreateBasic failed for race=%q, class=%q: %v", tt.race, tt.class, err)
			}

			// Verify race and class are normalized to lowercase
			if char.Race != strings.ToLower(strings.TrimSpace(tt.race)) {
				t.Errorf("Race not normalized: got %q, want %q", char.Race, strings.ToLower(strings.TrimSpace(tt.race)))
			}
			if char.Class != strings.ToLower(strings.TrimSpace(tt.class)) {
				t.Errorf("Class not normalized: got %q, want %q", char.Class, strings.ToLower(strings.TrimSpace(tt.class)))
			}
		})
	}
}

// TestGetSupportedRaces tests that GetSupportedRaces returns all races.
func TestGetSupportedRaces(t *testing.T) {
	races := GetSupportedRaces()
	if len(races) != 3 {
		t.Errorf("Expected 3 supported races, got %d", len(races))
	}

	// Check that expected races are present
	raceMap := make(map[string]bool)
	for _, r := range races {
		raceMap[r] = true
	}
	if !raceMap["human"] || !raceMap["elf"] || !raceMap["dwarf"] {
		t.Error("Missing expected races in GetSupportedRaces")
	}
}

// TestGetSupportedClasses tests that GetSupportedClasses returns all classes.
func TestGetSupportedClasses(t *testing.T) {
	classes := GetSupportedClasses()
	if len(classes) != 3 {
		t.Errorf("Expected 3 supported classes, got %d", len(classes))
	}

	classMap := make(map[string]bool)
	for _, c := range classes {
		classMap[c] = true
	}
	if !classMap["fighter"] || !classMap["wizard"] || !classMap["rogue"] {
		t.Error("Missing expected classes in GetSupportedClasses")
	}
}

// TestGetSupportedBackgrounds tests that GetSupportedBackgrounds returns all backgrounds.
func TestGetSupportedBackgrounds(t *testing.T) {
	backgrounds := GetSupportedBackgrounds()
	if len(backgrounds) != 4 {
		t.Errorf("Expected 4 supported backgrounds, got %d", len(backgrounds))
	}

	bgMap := make(map[string]bool)
	for _, b := range backgrounds {
		bgMap[b] = true
	}
	if !bgMap["sage"] || !bgMap["soldier"] || !bgMap["criminal"] || !bgMap["commoner"] {
		t.Error("Missing expected backgrounds in GetSupportedBackgrounds")
	}
}

// TestGetRaceConfig tests that GetRaceConfig returns correct configuration.
func TestGetRaceConfig(t *testing.T) {
	config, ok := GetRaceConfig("human")
	if !ok {
		t.Fatal("Expected to find human race config")
	}
	if config.Speed != 30 {
		t.Errorf("Expected human speed 30, got %d", config.Speed)
	}
	if config.AbilityBonus[types.Strength] != 1 {
		t.Errorf("Expected human +1 STR bonus, got %d", config.AbilityBonus[types.Strength])
	}

	_, ok = GetRaceConfig("invalid")
	if ok {
		t.Error("Expected false for invalid race config")
	}
}

// TestGetClassConfig tests that GetClassConfig returns correct configuration.
func TestGetClassConfig(t *testing.T) {
	config, ok := GetClassConfig("fighter")
	if !ok {
		t.Fatal("Expected to find fighter class config")
	}
	if config.HitDice != 10 {
		t.Errorf("Expected fighter hit dice 10, got %d", config.HitDice)
	}
	if config.StartingGoldAvg != 125 {
		t.Errorf("Expected fighter starting gold 125, got %d", config.StartingGoldAvg)
	}

	_, ok = GetClassConfig("invalid")
	if ok {
		t.Error("Expected false for invalid class config")
	}
}

// TestGetBackgroundConfig tests that GetBackgroundConfig returns correct configuration.
func TestGetBackgroundConfig(t *testing.T) {
	config, ok := GetBackgroundConfig("sage")
	if !ok {
		t.Fatal("Expected to find sage background config")
	}
	if len(config.Skills) != 2 {
		t.Errorf("Expected sage to have 2 skills, got %d", len(config.Skills))
	}

	_, ok = GetBackgroundConfig("invalid")
	if ok {
		t.Error("Expected false for invalid background config")
	}
}

// TestCreateBasic_FullNameAbilityScores tests that full ability names work as map keys.
// This ensures the API accepts both "str" and "strength" as valid keys.
func TestCreateBasic_FullNameAbilityScores(t *testing.T) {
	params := CreateParams{
		Name:       "Test",
		Race:       "human",
		Class:      "fighter",
		Background: "soldier",
		AbilityScores: map[string]int{
			"strength":     16,
			"dexterity":    12,
			"constitution": 14,
			"intelligence": 10,
			"wisdom":       8,
			"charisma":     13,
		},
	}

	char, err := CreateBasic(params)
	if err != nil {
		t.Fatalf("CreateBasic failed: %v", err)
	}

	// Human +1 to all: STR 17, DEX 13, CON 15, INT 11, WIS 9, CHA 14
	if char.Stats.Strength != 17 {
		t.Errorf("Expected Strength 17 (16+1 human bonus), got %d", char.Stats.Strength)
	}
	if char.Stats.Dexterity != 13 {
		t.Errorf("Expected Dexterity 13 (12+1 human bonus), got %d", char.Stats.Dexterity)
	}
	if char.Stats.Constitution != 15 {
		t.Errorf("Expected Constitution 15 (14+1 human bonus), got %d", char.Stats.Constitution)
	}
	if char.Stats.Intelligence != 11 {
		t.Errorf("Expected Intelligence 11 (10+1 human bonus), got %d", char.Stats.Intelligence)
	}
	if char.Stats.Wisdom != 9 {
		t.Errorf("Expected Wisdom 9 (8+1 human bonus), got %d", char.Stats.Wisdom)
	}
	if char.Stats.Charisma != 14 {
		t.Errorf("Expected Charisma 14 (13+1 human bonus), got %d", char.Stats.Charisma)
	}

	// HP: 10 (fighter hit dice) + 2 (CON 15 = +2 mod) = 12
	if char.MaxHP != 12 {
		t.Errorf("Expected MaxHP 12, got %d", char.MaxHP)
	}

	// AC: 10 + 1 (DEX 13 = +1 mod) = 11
	if char.AC != 11 {
		t.Errorf("Expected AC 11, got %d", char.AC)
	}
}
