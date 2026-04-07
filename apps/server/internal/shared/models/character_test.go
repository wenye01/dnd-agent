package models_test

import (
	"encoding/json"
	"strings"
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
			ID:   "char-1",
			Name: "Rogue",
			Skills: map[types.Skill]bool{
				types.Stealth:       true,
				types.SleightOfHand: true,
				types.Athletics:     false,
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
			ID:   "char-1",
			Name: "Adventurer",
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
			{1, -5}, // (1-10)/2 = -4.5 -> -5 (floor division)
			{2, -4}, // (2-10)/2 = -4
			{4, -3}, // (4-10)/2 = -3
			{6, -2}, // (6-10)/2 = -2
			{8, -1}, // (8-10)/2 = -1
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

// ===========================================================================
// HitDiceInfo.Validate tests
// ===========================================================================

func TestHitDiceInfo_Validate(t *testing.T) {
	t.Run("valid d4 hit dice", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 3, Current: 3, Size: 4}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("valid d6 hit dice", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 5, Current: 3, Size: 6}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("valid d8 hit dice", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 1, Current: 0, Size: 8}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("valid d10 hit dice", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 10, Current: 5, Size: 10}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("valid d12 hit dice", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 20, Current: 20, Size: 12}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("invalid size d20", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 5, Current: 5, Size: 20}
		if err := hd.Validate(); err == nil {
			t.Error("Validate() should return error for size 20")
		}
	})

	t.Run("invalid size 0", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 5, Current: 5, Size: 0}
		if err := hd.Validate(); err == nil {
			t.Error("Validate() should return error for size 0")
		}
	})

	t.Run("current exceeds total", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 3, Current: 5, Size: 8}
		if err := hd.Validate(); err == nil {
			t.Error("Validate() should return error when current > total")
		}
	})

	t.Run("negative current", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 5, Current: -1, Size: 8}
		if err := hd.Validate(); err == nil {
			t.Error("Validate() should return error for negative current")
		}
	})

	t.Run("negative total", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: -1, Current: 0, Size: 8}
		if err := hd.Validate(); err == nil {
			t.Error("Validate() should return error for negative total")
		}
	})

	t.Run("zero total with zero current is valid", func(t *testing.T) {
		hd := models.HitDiceInfo{Total: 0, Current: 0, Size: 8}
		if err := hd.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})
}

// ===========================================================================
// DeathSaves.Validate tests
// ===========================================================================

func TestDeathSaves_Validate(t *testing.T) {
	t.Run("zero values are valid", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 0, Failures: 0}
		if err := ds.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("1 success 1 failure is valid", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 1, Failures: 1}
		if err := ds.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("2 successes 2 failures is valid", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 2, Failures: 2}
		if err := ds.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("3 successes 0 failures is valid (stabilized)", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 3, Failures: 0}
		if err := ds.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("0 successes 3 failures is valid (dead)", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 0, Failures: 3}
		if err := ds.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("successes exceeds 3", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 4, Failures: 0}
		if err := ds.Validate(); err == nil {
			t.Error("Validate() should return error for successes > 3")
		}
	})

	t.Run("failures exceeds 3", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 0, Failures: 4}
		if err := ds.Validate(); err == nil {
			t.Error("Validate() should return error for failures > 3")
		}
	})

	t.Run("negative successes", func(t *testing.T) {
		ds := models.DeathSaves{Successes: -1, Failures: 0}
		if err := ds.Validate(); err == nil {
			t.Error("Validate() should return error for negative successes")
		}
	})

	t.Run("negative failures", func(t *testing.T) {
		ds := models.DeathSaves{Successes: 0, Failures: -1}
		if err := ds.Validate(); err == nil {
			t.Error("Validate() should return error for negative failures")
		}
	})
}

// ===========================================================================
// Character new fields tests
// ===========================================================================

func TestCharacter_NewFields(t *testing.T) {
	t.Run("TemporaryHP defaults to zero", func(t *testing.T) {
		char := &models.Character{
			ID: "char-1", Name: "Hero", Level: 1, HP: 10, MaxHP: 10, AC: 15,
		}
		if char.TemporaryHP != 0 {
			t.Errorf("TemporaryHP = %d, want 0", char.TemporaryHP)
		}
	})

	t.Run("TemporaryHP can be set", func(t *testing.T) {
		char := &models.Character{
			ID: "char-1", Name: "Hero", Level: 1, HP: 10, MaxHP: 10, AC: 15,
			TemporaryHP: 5,
		}
		if char.TemporaryHP != 5 {
			t.Errorf("TemporaryHP = %d, want 5", char.TemporaryHP)
		}
	})

	t.Run("HitDice field works", func(t *testing.T) {
		char := &models.Character{
			ID: "char-1", Name: "Fighter", Level: 5,
			HitDice: models.HitDiceInfo{Total: 5, Current: 3, Size: 10},
		}
		if char.HitDice.Total != 5 {
			t.Errorf("HitDice.Total = %d, want 5", char.HitDice.Total)
		}
		if char.HitDice.Current != 3 {
			t.Errorf("HitDice.Current = %d, want 3", char.HitDice.Current)
		}
		if char.HitDice.Size != 10 {
			t.Errorf("HitDice.Size = %d, want 10", char.HitDice.Size)
		}
	})

	t.Run("DeathSaves field works", func(t *testing.T) {
		char := &models.Character{
			ID: "char-1", Name: "Hero",
			DeathSaves: models.DeathSaves{Successes: 2, Failures: 1},
		}
		if char.DeathSaves.Successes != 2 {
			t.Errorf("DeathSaves.Successes = %d, want 2", char.DeathSaves.Successes)
		}
		if char.DeathSaves.Failures != 1 {
			t.Errorf("DeathSaves.Failures = %d, want 1", char.DeathSaves.Failures)
		}
	})

	t.Run("DamageResistances field works", func(t *testing.T) {
		char := &models.Character{
			ID:                "char-1",
			Name:              "Dwarf Fighter",
			DamageResistances: []types.DamageType{types.DamagePoison},
		}
		if len(char.DamageResistances) != 1 {
			t.Fatalf("DamageResistances length = %d, want 1", len(char.DamageResistances))
		}
		if char.DamageResistances[0] != types.DamagePoison {
			t.Errorf("DamageResistances[0] = %s, want %s", char.DamageResistances[0], types.DamagePoison)
		}
	})

	t.Run("DamageImmunities field works", func(t *testing.T) {
		char := &models.Character{
			ID:               "char-1",
			Name:             "Fire Genasi",
			DamageImmunities: []types.DamageType{types.DamageFire},
		}
		if len(char.DamageImmunities) != 1 {
			t.Fatalf("DamageImmunities length = %d, want 1", len(char.DamageImmunities))
		}
		if char.DamageImmunities[0] != types.DamageFire {
			t.Errorf("DamageImmunities[0] = %s, want %s", char.DamageImmunities[0], types.DamageFire)
		}
	})

	t.Run("IsDead field defaults to false", func(t *testing.T) {
		char := &models.Character{ID: "char-1", Name: "Hero"}
		if char.IsDead {
			t.Error("IsDead should default to false")
		}
	})

	t.Run("IsDead can be set", func(t *testing.T) {
		char := &models.Character{ID: "char-1", Name: "Hero", IsDead: true}
		if !char.IsDead {
			t.Error("IsDead should be true")
		}
	})

	t.Run("TemporaryHP serializes to JSON with omitempty", func(t *testing.T) {
		char := models.Character{ID: "char-1", Name: "Hero", Level: 1, HP: 10, MaxHP: 10, AC: 15}

		data, err := json.Marshal(char)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}
		// temporaryHp should be omitted when 0
		s := string(data)
		if strings.Contains(s, "temporaryHp") {
			t.Error("temporaryHp should be omitted when 0, but found in JSON")
		}

		char.TemporaryHP = 5
		data, err = json.Marshal(char)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}
		s = string(data)
		if !strings.Contains(s, `"temporaryHp":5`) {
			t.Errorf("Expected temporaryHp:5 in JSON, got %s", s)
		}
	})

	t.Run("DeathSaves round-trips through JSON", func(t *testing.T) {
		original := models.Character{
			ID:   "char-1",
			Name: "Hero",
			DeathSaves: models.DeathSaves{
				Successes: 2,
				Failures:  1,
			},
		}

		data, err := json.Marshal(original)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}

		var decoded models.Character
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("json.Unmarshal() error = %v", err)
		}

		if decoded.DeathSaves.Successes != 2 {
			t.Errorf("DeathSaves.Successes = %d, want 2", decoded.DeathSaves.Successes)
		}
		if decoded.DeathSaves.Failures != 1 {
			t.Errorf("DeathSaves.Failures = %d, want 1", decoded.DeathSaves.Failures)
		}
	})

	t.Run("HitDice round-trips through JSON", func(t *testing.T) {
		original := models.Character{
			ID:   "char-1",
			Name: "Fighter",
			HitDice: models.HitDiceInfo{
				Total:   5,
				Current: 3,
				Size:    10,
			},
		}

		data, err := json.Marshal(original)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}

		var decoded models.Character
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("json.Unmarshal() error = %v", err)
		}

		if decoded.HitDice.Total != 5 {
			t.Errorf("HitDice.Total = %d, want 5", decoded.HitDice.Total)
		}
		if decoded.HitDice.Current != 3 {
			t.Errorf("HitDice.Current = %d, want 3", decoded.HitDice.Current)
		}
		if decoded.HitDice.Size != 10 {
			t.Errorf("HitDice.Size = %d, want 10", decoded.HitDice.Size)
		}
	})

	t.Run("DamageResistances and DamageImmunities round-trip through JSON", func(t *testing.T) {
		original := models.Character{
			ID:                "char-1",
			Name:              "Dwarf",
			DamageResistances: []types.DamageType{types.DamagePoison},
			DamageImmunities:  []types.DamageType{types.DamageFire, types.DamageRadiant},
		}

		data, err := json.Marshal(original)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}

		var decoded models.Character
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("json.Unmarshal() error = %v", err)
		}

		if len(decoded.DamageResistances) != 1 || decoded.DamageResistances[0] != types.DamagePoison {
			t.Errorf("DamageResistances = %v, want [poison]", decoded.DamageResistances)
		}
		if len(decoded.DamageImmunities) != 2 {
			t.Fatalf("DamageImmunities length = %d, want 2", len(decoded.DamageImmunities))
		}
		if decoded.DamageImmunities[0] != types.DamageFire {
			t.Errorf("DamageImmunities[0] = %s, want fire", decoded.DamageImmunities[0])
		}
		if decoded.DamageImmunities[1] != types.DamageRadiant {
			t.Errorf("DamageImmunities[1] = %s, want radiant", decoded.DamageImmunities[1])
		}
	})

	t.Run("IsDead round-trips through JSON", func(t *testing.T) {
		original := models.Character{
			ID:     "char-1",
			Name:   "Dead Hero",
			IsDead: true,
		}

		data, err := json.Marshal(original)
		if err != nil {
			t.Fatalf("json.Marshal() error = %v", err)
		}

		var decoded models.Character
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Fatalf("json.Unmarshal() error = %v", err)
		}

		if !decoded.IsDead {
			t.Error("IsDead should be true after JSON round-trip")
		}
	})
}
