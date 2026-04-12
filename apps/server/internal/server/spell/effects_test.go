package spell

import (
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

func TestEffectApplier_ApplyDamageEffect(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 15})

	t.Run("calculates damage without save", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "magic_missile",
			Name:  "Magic Missile",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:       models.SpellEffectTypeDamage,
			DamageType: "force",
			DiceCount:  3,
			DiceSize:   4,
			BonusValue: 3,
		}

		result := ea.ApplyEffect(caster, spell, effect, "target1", 1)

		if result.Type != models.SpellEffectTypeDamage {
			t.Errorf("expected damage type, got %s", result.Type)
		}
		if result.TargetID != "target1" {
			t.Errorf("expected target target1, got %s", result.TargetID)
		}
		if result.DamageType != types.DamageForce {
			t.Errorf("expected force damage type, got %s", result.DamageType)
		}
		// 3d4+3 with fixed roll total 15: mock returns 15 for the whole formula.
		if result.Damage != 15 {
			t.Errorf("expected damage 15, got %d", result.Damage)
		}
		if result.SaveResult != nil {
			t.Error("should not have save result without save ability")
		}
	})

	t.Run("calculates damage with save", func(t *testing.T) {
		ea := NewEffectApplier(&mockDice{total: 28})
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "fireball",
			Name:  "Fireball",
			Level: 3,
		}
		effect := models.SpellEffect{
			Type:        models.SpellEffectTypeDamage,
			DamageType:  "fire",
			SaveAbility: "dexterity",
			DiceCount:   8,
			DiceSize:    6,
		}

		result := ea.ApplyEffect(caster, spell, effect, "enemy1", 3)

		if result.SaveResult == nil {
			t.Fatal("expected save result")
		}
		// DC = 8 + prof(3) + int mod(3) = 14
		if result.SaveResult.DC != 14 {
			t.Errorf("expected DC 14, got %d", result.SaveResult.DC)
		}
		if result.SaveResult.Ability != "dexterity" {
			t.Errorf("expected dexterity save, got %s", result.SaveResult.Ability)
		}
	})

	t.Run("upcasting adds extra dice", func(t *testing.T) {
		ea := NewEffectApplier(&mockDice{total: 30})
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "fireball",
			Name:  "Fireball",
			Level: 3,
		}
		effect := models.SpellEffect{
			Type:            models.SpellEffectTypeDamage,
			DamageType:      "fire",
			DiceCount:       8,
			DiceSize:        6,
			ScalingType:     models.ScalingTypeSlotLevel,
			ScalingInterval: 1,
		}

		result := ea.ApplyEffect(caster, spell, effect, "enemy1", 5)

		// Upcast from level 3 to level 5: 2 extra levels = 2 extra d6.
		// Dice formula should be 10d6.
		if result.DiceRolled != "10d6" {
			t.Errorf("expected 10d6, got %s", result.DiceRolled)
		}
	})
}

func TestEffectApplier_ApplyHealEffect(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 8})

	t.Run("calculates healing with spellcasting modifier", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "cleric",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Wisdom: 16},
		}
		spell := &models.Spell{
			ID:    "cure_wounds",
			Name:  "Cure Wounds",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:      models.SpellEffectTypeHeal,
			DiceCount: 1,
			DiceSize:  8,
		}

		result := ea.ApplyEffect(caster, spell, effect, "ally1", 1)

		if result.Type != models.SpellEffectTypeHeal {
			t.Errorf("expected heal type, got %s", result.Type)
		}
		if result.Healing != 8 {
			t.Errorf("expected healing 8, got %d", result.Healing)
		}
	})

	t.Run("upcasting adds extra healing dice", func(t *testing.T) {
		ea := NewEffectApplier(&mockDice{total: 20})
		caster := &models.Character{
			Level:            5,
			Class:            "cleric",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Wisdom: 16},
		}
		spell := &models.Spell{
			ID:    "cure_wounds",
			Name:  "Cure Wounds",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:            models.SpellEffectTypeHeal,
			DiceCount:       1,
			DiceSize:        8,
			ScalingType:     models.ScalingTypeSlotLevel,
			ScalingInterval: 1,
		}

		result := ea.ApplyEffect(caster, spell, effect, "ally1", 3)

		// Upcast from 1 to 3: 2 extra levels = 2 extra d8.
		// 3d8+3 (wis mod).
		if result.DiceRolled != "3d8+3" {
			t.Errorf("expected 3d8+3, got %s", result.DiceRolled)
		}
	})
}

func TestEffectApplier_ApplyBuffEffect(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 3})

	t.Run("calculates buff with fixed value", func(t *testing.T) {
		spell := &models.Spell{
			ID:    "shield",
			Name:  "Shield",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:       models.SpellEffectTypeBuff,
			BonusValue: 5,
		}

		result := ea.ApplyEffect(nil, spell, effect, "self", 1)

		if result.Type != models.SpellEffectTypeBuff {
			t.Errorf("expected buff type, got %s", result.Type)
		}
		if result.BonusValue != 5 {
			t.Errorf("expected bonus 5, got %d", result.BonusValue)
		}
	})

	t.Run("calculates buff with dice", func(t *testing.T) {
		spell := &models.Spell{
			ID:    "bless",
			Name:  "Bless",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:      models.SpellEffectTypeBuff,
			DiceCount: 1,
			DiceSize:  4,
		}

		result := ea.ApplyEffect(nil, spell, effect, "ally1", 1)

		if result.BonusValue != 3 {
			t.Errorf("expected bonus from dice roll 3, got %d", result.BonusValue)
		}
	})
}

func TestEffectApplier_CantripScaling(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 10})

	spell := &models.Spell{
		ID:    "fire_bolt",
		Name:  "Fire Bolt",
		Level: 0,
	}
	effect := models.SpellEffect{
		Type:            models.SpellEffectTypeDamage,
		DamageType:      "fire",
		DiceCount:       1,
		DiceSize:        10,
		ScalingType:     models.ScalingTypeCharacterLevel,
		ScalingInterval: 5,
	}

	tests := []struct {
		name          string
		level         int
		expectedDice  string
	}{
		{"level 1 (1d10)", 1, "1d10"},
		{"level 4 (1d10)", 4, "1d10"},
		{"level 5 (2d10)", 5, "2d10"},
		{"level 10 (2d10)", 10, "2d10"},
		{"level 11 (3d10)", 11, "3d10"},
		{"level 16 (3d10)", 16, "3d10"},
		{"level 17 (4d10)", 17, "4d10"},
		{"level 20 (4d10)", 20, "4d10"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caster := &models.Character{Level: tt.level, Class: "wizard"}
			result := ea.ApplyEffect(caster, spell, effect, "target1", 0)
			if result.DiceRolled != tt.expectedDice {
				t.Errorf("expected %s, got %s", tt.expectedDice, result.DiceRolled)
			}
		})
	}
}

func TestEffectApplier_SpellDC(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 10})

	tests := []struct {
		name     string
		class    string
		level    int
		prof     int
		stats    models.AbilityScores
		wantDC   int
	}{
		{
			name:   "wizard INT 16 level 5",
			class:  "wizard", level: 5, prof: 3,
			stats:  models.AbilityScores{Intelligence: 16},
			wantDC: 14, // 8 + 3 (prof) + 3 (INT mod)
		},
		{
			name:   "cleric WIS 18 level 9",
			class:  "cleric", level: 9, prof: 4,
			stats:  models.AbilityScores{Wisdom: 18},
			wantDC: 16, // 8 + 4 (prof) + 4 (WIS mod)
		},
		{
			name:   "bard CHA 14 level 3",
			class:  "bard", level: 3, prof: 2,
			stats:  models.AbilityScores{Charisma: 14},
			wantDC: 12, // 8 + 2 (prof) + 2 (CHA mod)
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			caster := &models.Character{
				Class:            tt.class,
				Level:            tt.level,
				ProficiencyBonus: tt.prof,
				Stats:            tt.stats,
			}
			spell := &models.Spell{ID: "test", Name: "Test", Level: 1}
			effect := models.SpellEffect{
				Type:        models.SpellEffectTypeDamage,
				SaveAbility: "dexterity",
				DiceCount:   1,
				DiceSize:    6,
			}
			result := ea.ApplyEffect(caster, spell, effect, "target", 1)
			if result.SaveResult == nil {
				t.Fatal("expected save result")
			}
			if result.SaveResult.DC != tt.wantDC {
				t.Errorf("expected DC %d, got %d", tt.wantDC, result.SaveResult.DC)
			}
		})
	}
}

func TestGetSpellcastingAbility(t *testing.T) {
	tests := []struct {
		class string
		want  types.Ability
	}{
		{"wizard", types.Intelligence},
		{"cleric", types.Wisdom},
		{"druid", types.Wisdom},
		{"ranger", types.Wisdom},
		{"bard", types.Charisma},
		{"sorcerer", types.Charisma},
		{"warlock", types.Charisma},
		{"paladin", types.Charisma},
		{"rogue", types.Intelligence},
		{"unknown", types.Intelligence}, // default
	}

	for _, tt := range tests {
		t.Run(tt.class, func(t *testing.T) {
			got := getSpellcastingAbility(tt.class)
			if got != tt.want {
				t.Errorf("getSpellcastingAbility(%s) = %v, want %v", tt.class, got, tt.want)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Additional edge-case tests for effects
// ---------------------------------------------------------------------------

func TestEffectApplier_ApplyDebuffEffect(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 10})

	t.Run("debuff with save ability", func(t *testing.T) {
		spell := &models.Spell{
			ID:    "hold_person",
			Name:  "Hold Person",
			Level: 2,
		}
		effect := models.SpellEffect{
			Type:        models.SpellEffectTypeDebuff,
			SaveAbility: "wisdom",
		}

		result := ea.ApplyEffect(nil, spell, effect, "target1", 2)

		if result.Type != models.SpellEffectTypeDebuff {
			t.Errorf("expected debuff type, got %s", result.Type)
		}
		if result.TargetID != "target1" {
			t.Errorf("expected target target1, got %s", result.TargetID)
		}
		if result.SaveResult == nil {
			t.Fatal("expected save result for debuff with save ability")
		}
		if result.SaveResult.Ability != "wisdom" {
			t.Errorf("expected wisdom save, got %s", result.SaveResult.Ability)
		}
	})

	t.Run("debuff without save ability", func(t *testing.T) {
		spell := &models.Spell{
			ID:    "slow",
			Name:  "Slow",
			Level: 3,
		}
		effect := models.SpellEffect{
			Type: models.SpellEffectTypeDebuff,
		}

		result := ea.ApplyEffect(nil, spell, effect, "target1", 3)

		if result.SaveResult != nil {
			t.Error("should not have save result without save ability")
		}
	})
}

func TestEffectApplier_ApplyUtilityEffect(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 10})

	t.Run("utility effect returns description", func(t *testing.T) {
		spell := &models.Spell{
			ID:          "light",
			Name:        "Light",
			Level:       0,
			Description: "You touch one object that is no larger than 10 feet.",
		}
		effect := models.SpellEffect{
			Type: models.SpellEffectTypeUtility,
		}

		result := ea.ApplyEffect(nil, spell, effect, "target1", 0)

		if result.Type != models.SpellEffectTypeUtility {
			t.Errorf("expected utility type, got %s", result.Type)
		}
		if result.TargetID != "target1" {
			t.Errorf("expected target target1, got %s", result.TargetID)
		}
	})

	t.Run("unknown effect type returns description", func(t *testing.T) {
		spell := &models.Spell{ID: "test", Name: "Test", Level: 1}
		effect := models.SpellEffect{
			Type: "unknown_type",
		}

		result := ea.ApplyEffect(nil, spell, effect, "target1", 1)

		if result.Type != "unknown_type" {
			t.Errorf("expected unknown_type, got %s", result.Type)
		}
	})
}

func TestEffectApplier_DamageWithBonus(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 15})

	t.Run("damage with bonus includes bonus in dice formula", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "magic_missile",
			Name:  "Magic Missile",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:       models.SpellEffectTypeDamage,
			DamageType: "force",
			DiceCount:  3,
			DiceSize:   4,
			BonusValue: 3,
		}

		result := ea.ApplyEffect(caster, spell, effect, "target1", 1)

		if result.DiceRolled != "3d4+3" {
			t.Errorf("expected 3d4+3, got %s", result.DiceRolled)
		}
	})
}

func TestEffectApplier_DamageWithoutTarget(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 20})

	t.Run("damage with save but no target has no save result", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "fireball",
			Name:  "Fireball",
			Level: 3,
		}
		effect := models.SpellEffect{
			Type:        models.SpellEffectTypeDamage,
			DamageType:  "fire",
			SaveAbility: "dexterity",
			DiceCount:   8,
			DiceSize:    6,
		}

		result := ea.ApplyEffect(caster, spell, effect, "", 3)

		// No target ID means no save result.
		if result.SaveResult != nil {
			t.Error("expected no save result when targetID is empty")
		}
	})
}

func TestEffectApplier_HealWithoutCaster(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 5})

	t.Run("heal without caster has no spellcasting modifier bonus", func(t *testing.T) {
		spell := &models.Spell{
			ID:    "cure_wounds",
			Name:  "Cure Wounds",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:      models.SpellEffectTypeHeal,
			DiceCount: 1,
			DiceSize:  8,
		}

		result := ea.ApplyEffect(nil, spell, effect, "ally1", 1)

		if result.DiceRolled != "1d8" {
			t.Errorf("expected 1d8 (no modifier), got %s", result.DiceRolled)
		}
		if result.Healing != 5 {
			t.Errorf("expected healing 5, got %d", result.Healing)
		}
	})
}

func TestEffectApplier_SpellDCWithNilCaster(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 10})

	t.Run("DC with nil caster returns 10", func(t *testing.T) {
		spell := &models.Spell{ID: "test", Name: "Test", Level: 1}
		effect := models.SpellEffect{
			Type:        models.SpellEffectTypeDamage,
			SaveAbility: "dexterity",
			DiceCount:   1,
			DiceSize:    6,
		}
		result := ea.ApplyEffect(nil, spell, effect, "target1", 1)

		if result.SaveResult == nil {
			t.Fatal("expected save result")
		}
		if result.SaveResult.DC != 10 {
			t.Errorf("expected DC 10 for nil caster, got %d", result.SaveResult.DC)
		}
	})
}

func TestEffectApplier_UpcastingWithScalingInterval(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 40})

	t.Run("upcasting with interval=2 adds fewer dice", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "test_spell",
			Name:  "Test Spell",
			Level: 3,
		}
		effect := models.SpellEffect{
			Type:            models.SpellEffectTypeDamage,
			DamageType:      "fire",
			DiceCount:       6,
			DiceSize:        6,
			ScalingType:     models.ScalingTypeSlotLevel,
			ScalingInterval: 2, // One extra die per 2 levels above base
		}

		// Upcast from 3 to 7: 4 extra levels / interval 2 = 2 extra dice.
		result := ea.ApplyEffect(caster, spell, effect, "target1", 7)

		if result.DiceRolled != "8d6" {
			t.Errorf("expected 8d6 (6 base + 2 from scaling), got %s", result.DiceRolled)
		}
	})
}

func TestEffectApplier_UpcastingNoScaling(t *testing.T) {
	ea := NewEffectApplier(&mockDice{total: 15})

	t.Run("no scaling type does not add extra dice", func(t *testing.T) {
		caster := &models.Character{
			Level:            5,
			Class:            "wizard",
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
		}
		spell := &models.Spell{
			ID:    "magic_missile",
			Name:  "Magic Missile",
			Level: 1,
		}
		effect := models.SpellEffect{
			Type:       models.SpellEffectTypeDamage,
			DamageType: "force",
			DiceCount:  3,
			DiceSize:   4,
			BonusValue: 3,
			// No ScalingType set.
		}

		// Upcast from 1 to 3: no scaling type means no extra dice.
		result := ea.ApplyEffect(caster, spell, effect, "target1", 3)

		if result.DiceRolled != "3d4+3" {
			t.Errorf("expected 3d4+3 (no scaling), got %s", result.DiceRolled)
		}
	})
}
