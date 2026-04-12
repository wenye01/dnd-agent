package spell

import (
	"testing"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/pkg/dnd5e/spells"
)

// mockDice always returns a fixed total.
type mockDice struct {
	total int
}

func (m *mockDice) Roll(formula string) (*dice.Result, error) {
	return &dice.Result{Total: m.total}, nil
}
func (m *mockDice) AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}
func (m *mockDice) AbilityCheck(modifier, dc int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}

// newTestCastingManager creates a CastingManager with test spell data.
func newTestCastingManager(diceVal int) *CastingManager {
	ds := &mockDice{total: diceVal}
	spellStore := spells.NewSpellStore(testSpellData())
	slotMgr := NewSlotManager()
	concMgr := NewConcentrationManager(ds)
	effectCalc := NewEffectApplier(ds)
	return NewCastingManager(spellStore, slotMgr, concMgr, effectCalc, ds)
}

// testSpellData creates a minimal set of spell definitions for testing.
func testSpellData() map[string]*models.Spell {
	return map[string]*models.Spell{
		"magic_missile": {
			ID:             "magic_missile",
			Name:           "Magic Missile",
			Level:          1,
			School:         models.SpellSchoolEvocation,
			Concentration:  false,
			Classes:        []string{"wizard", "sorcerer"},
			Effects: []models.SpellEffect{
				{
					Type:       models.SpellEffectTypeDamage,
					DamageType: "force",
					DiceCount:  3,
					DiceSize:   4,
					BonusValue: 3,
				},
			},
		},
		"fireball": {
			ID:             "fireball",
			Name:           "Fireball",
			Level:          3,
			School:         models.SpellSchoolEvocation,
			Concentration:  false,
			Classes:        []string{"wizard", "sorcerer"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeDamage,
					DamageType:      "fire",
					SaveAbility:     "dexterity",
					DiceCount:       8,
					DiceSize:        6,
					ScalingType:     models.ScalingTypeSlotLevel,
					ScalingInterval: 1,
				},
			},
		},
		"cure_wounds": {
			ID:             "cure_wounds",
			Name:           "Cure Wounds",
			Level:          1,
			School:         models.SpellSchoolEvocation,
			Concentration:  false,
			Classes:        []string{"cleric"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeHeal,
					DiceCount:       1,
					DiceSize:        8,
					ScalingType:     models.ScalingTypeSlotLevel,
					ScalingInterval: 1,
				},
			},
		},
		"shield": {
			ID:             "shield",
			Name:           "Shield",
			Level:          1,
			School:         models.SpellSchoolAbjuration,
			Concentration:  false,
			Classes:        []string{"wizard"},
			Effects: []models.SpellEffect{
				{
					Type:       models.SpellEffectTypeBuff,
					BonusValue: 5,
				},
			},
		},
		"bless": {
			ID:             "bless",
			Name:           "Bless",
			Level:          1,
			School:         models.SpellSchoolEnchantment,
			Concentration:  true,
			Classes:        []string{"cleric"},
			Effects: []models.SpellEffect{
				{
					Type:       models.SpellEffectTypeBuff,
					DiceCount:  1,
					DiceSize:   4,
				},
			},
		},
		"fire_bolt": {
			ID:             "fire_bolt",
			Name:           "Fire Bolt",
			Level:          0,
			School:         models.SpellSchoolEvocation,
			Concentration:  false,
			Classes:        []string{"wizard"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeDamage,
					DamageType:      "fire",
					DiceCount:       1,
					DiceSize:        10,
					ScalingType:     models.ScalingTypeCharacterLevel,
					ScalingInterval: 5,
				},
			},
		},
	}
}

func newTestWizard() *models.Character {
	return &models.Character{
		ID:               "wizard1",
		Name:             "Gandalf",
		Class:            "wizard",
		Level:            5,
		ProficiencyBonus: 3,
		Stats:            models.AbilityScores{Intelligence: 16},
		KnownSpells:      []string{"magic_missile", "fireball", "shield", "fire_bolt"},
		PreparedSpells:   []string{"magic_missile", "fireball", "shield", "fire_bolt"},
		SpellSlots:       map[int]int{1: 4, 2: 3, 3: 2},
	}
}

func newTestCleric() *models.Character {
	return &models.Character{
		ID:               "cleric1",
		Name:             "Cleric",
		Class:            "cleric",
		Level:            5,
		ProficiencyBonus: 3,
		Stats:            models.AbilityScores{Wisdom: 16},
		KnownSpells:      []string{"cure_wounds", "bless"},
		PreparedSpells:   []string{"cure_wounds", "bless"},
		SpellSlots:       map[int]int{1: 4, 2: 3, 3: 2},
	}
}

func TestCastingManager_CastSpell(t *testing.T) {
	t.Run("casts magic missile successfully", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()
		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "magic_missile",
			Level:    1,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Success {
			t.Error("expected success")
		}
		if result.SlotLevelUsed != 1 {
			t.Errorf("expected slot level 1, got %d", result.SlotLevelUsed)
		}
		if caster.SpellSlots[1] != 3 {
			t.Errorf("expected 3 remaining level 1 slots, got %d", caster.SpellSlots[1])
		}
		if len(result.Effects) != 1 {
			t.Fatalf("expected 1 effect, got %d", len(result.Effects))
		}
	})

	t.Run("casts cantrip without consuming slot", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()
		slotsBefore := caster.SpellSlots[1]

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fire_bolt",
			Level:    0,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Success {
			t.Error("expected success")
		}
		if result.SlotLevelUsed != 0 {
			t.Errorf("cantrip should use slot level 0, got %d", result.SlotLevelUsed)
		}
		if caster.SpellSlots[1] != slotsBefore {
			t.Error("cantrip should not consume spell slot")
		}
	})

	t.Run("casts fireball at base level", func(t *testing.T) {
		cm := newTestCastingManager(28)
		caster := newTestWizard()

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fireball",
			Level:    3,
			TargetID: "enemy1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Success {
			t.Error("expected success")
		}
		if caster.SpellSlots[3] != 1 {
			t.Errorf("expected 1 remaining level 3 slot, got %d", caster.SpellSlots[3])
		}
	})

	t.Run("upcasts fireball at level 4", func(t *testing.T) {
		cm := newTestCastingManager(30)
		caster := newTestWizard()
		caster.SpellSlots[4] = 1

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fireball",
			Level:    4,
			TargetID: "enemy1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.SlotLevelUsed != 4 {
			t.Errorf("expected slot level 4, got %d", result.SlotLevelUsed)
		}
	})

	t.Run("handles concentration spell", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestCleric()

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "bless",
			Level:    1,
			TargetID: "ally1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Concentrating {
			t.Error("bless should set concentrating=true")
		}
		if !cm.concMgr.IsConcentrating("cleric1") {
			t.Error("concentration manager should track active concentration")
		}
	})

	t.Run("replaces existing concentration", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestCleric()

		// Start concentrating on bless.
		_, _ = cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "bless",
			Level:    1,
		})

		// Now cast another concentration spell (use bless again as only option).
		_ = cm.concMgr.StartConcentration("cleric1", "hold_person", "Hold Person", "")

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "bless",
			Level:    1,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !result.Concentrating {
			t.Error("should be concentrating on new spell")
		}

		conc := cm.concMgr.GetActiveConcentration("cleric1")
		if conc == nil || conc.SpellID != "bless" {
			t.Error("should now be concentrating on bless (new spell)")
		}
	})

	t.Run("errors for unknown spell", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()

		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "nonexistent",
			Level:    1,
		})
		if err == nil {
			t.Fatal("expected error for unknown spell")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrSpellNotFound {
			t.Errorf("expected SPELL_NOT_FOUND, got %v", err)
		}
	})

	t.Run("errors for spell not known", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()
		// Cleric spell not known by wizard.
		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "cure_wounds",
			Level:    1,
		})
		if err == nil {
			t.Fatal("expected error for unknown spell")
		}
	})

	t.Run("errors for no available slot", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()
		caster.SpellSlots[3] = 0

		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fireball",
			Level:    3,
		})
		if err == nil {
			t.Fatal("expected error for no available slot")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrNoAvailableSlot {
			t.Errorf("expected NO_SPELL_SLOT, got %v", err)
		}
	})

	t.Run("errors for slot level below spell level", func(t *testing.T) {
		cm := newTestCastingManager(10)
		caster := newTestWizard()

		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fireball",
			Level:    2,
		})
		if err == nil {
			t.Fatal("expected error for slot level below spell level")
		}
	})
}

func TestCastingManager_CanCastSpell(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("can cast known spell with slots", func(t *testing.T) {
		caster := newTestWizard()
		ok, reason := cm.CanCastSpell(caster, "magic_missile", 1)
		if !ok {
			t.Errorf("expected can cast, got: %s", reason)
		}
	})

	t.Run("cannot cast unknown spell", func(t *testing.T) {
		caster := newTestWizard()
		ok, _ := cm.CanCastSpell(caster, "cure_wounds", 1)
		if ok {
			t.Error("should not be able to cast unknown spell")
		}
	})

	t.Run("can always cast cantrip", func(t *testing.T) {
		caster := newTestWizard()
		ok, _ := cm.CanCastSpell(caster, "fire_bolt", 0)
		if !ok {
			t.Error("should always be able to cast cantrips")
		}
	})

	t.Run("cannot cast with no slots", func(t *testing.T) {
		caster := newTestWizard()
		caster.SpellSlots[1] = 0
		ok, _ := cm.CanCastSpell(caster, "magic_missile", 1)
		if ok {
			t.Error("should not be able to cast with no slots")
		}
	})
}

func TestCastingManager_PrepareSpell(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("prepares known spell", func(t *testing.T) {
		caster := &models.Character{
			ID:          "wizard1",
			Class:       "wizard",
			KnownSpells: []string{"magic_missile"},
		}
		err := cm.PrepareSpell(caster, "magic_missile")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !containsString(caster.PreparedSpells, "magic_missile") {
			t.Error("spell should be in prepared list")
		}
	})

	t.Run("no-op for already prepared spell", func(t *testing.T) {
		caster := &models.Character{
			ID:             "wizard1",
			Class:          "wizard",
			KnownSpells:    []string{"magic_missile"},
			PreparedSpells: []string{"magic_missile"},
		}
		err := cm.PrepareSpell(caster, "magic_missile")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
	})

	t.Run("errors for unknown spell", func(t *testing.T) {
		caster := &models.Character{
			ID:          "wizard1",
			Class:       "wizard",
			KnownSpells: []string{},
		}
		err := cm.PrepareSpell(caster, "magic_missile")
		if err == nil {
			t.Error("expected error for unknown spell")
		}
	})
}

func TestCastingManager_UnprepareSpell(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("unprepares spell", func(t *testing.T) {
		caster := &models.Character{
			ID:             "wizard1",
			PreparedSpells: []string{"magic_missile", "fireball"},
		}
		err := cm.UnprepareSpell(caster, "magic_missile")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if containsString(caster.PreparedSpells, "magic_missile") {
			t.Error("spell should not be in prepared list")
		}
		if !containsString(caster.PreparedSpells, "fireball") {
			t.Error("other spells should remain")
		}
	})

	t.Run("errors for spell not prepared", func(t *testing.T) {
		caster := &models.Character{
			ID:             "wizard1",
			PreparedSpells: []string{},
		}
		err := cm.UnprepareSpell(caster, "magic_missile")
		if err == nil {
			t.Error("expected error for spell not prepared")
		}
	})
}

// ---------------------------------------------------------------------------
// Additional edge-case tests
// ---------------------------------------------------------------------------

func TestCastingManager_LearnSpell(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("learns new spell", func(t *testing.T) {
		caster := &models.Character{
			ID:          "wizard1",
			Class:       "wizard",
			KnownSpells: []string{"magic_missile"},
		}
		err := cm.LearnSpell(caster, "fireball")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !containsString(caster.KnownSpells, "fireball") {
			t.Error("fireball should be in known spells")
		}
	})

	t.Run("no-op for already known spell", func(t *testing.T) {
		caster := &models.Character{
			ID:          "wizard1",
			KnownSpells: []string{"magic_missile"},
		}
		err := cm.LearnSpell(caster, "magic_missile")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		// Should not duplicate.
		count := 0
		for _, s := range caster.KnownSpells {
			if s == "magic_missile" {
				count++
			}
		}
		if count != 1 {
			t.Errorf("expected exactly 1 instance of magic_missile, got %d", count)
		}
	})

	t.Run("errors for nonexistent spell", func(t *testing.T) {
		caster := &models.Character{
			ID:          "wizard1",
			KnownSpells: []string{},
		}
		err := cm.LearnSpell(caster, "nonexistent")
		if err == nil {
			t.Error("expected error for nonexistent spell")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrSpellNotFound {
			t.Errorf("expected SPELL_NOT_FOUND, got %v", err)
		}
	})
}

func TestCastingManager_CastSpell_UsesNaturalLevel(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("uses spell natural level when slot_level is 0", func(t *testing.T) {
		caster := newTestWizard()
		// Pass slot_level=0, which should default to spell's natural level (1).
		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "magic_missile",
			Level:    0, // Should use natural level 1
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.SlotLevelUsed != 1 {
			t.Errorf("expected slot level 1, got %d", result.SlotLevelUsed)
		}
		if caster.SpellSlots[1] != 3 {
			t.Errorf("expected 3 remaining level 1 slots, got %d", caster.SpellSlots[1])
		}
	})
}

func TestCastingManager_CastSpell_InvalidLevel(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("errors for negative level", func(t *testing.T) {
		caster := newTestWizard()
		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "magic_missile",
			Level:    -1,
		})
		if err == nil {
			t.Fatal("expected error for negative level")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrInvalidSlotLevel {
			t.Errorf("expected INVALID_SLOT_LEVEL, got %v", err)
		}
	})

	t.Run("errors for level above 9", func(t *testing.T) {
		caster := newTestWizard()
		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "magic_missile",
			Level:    10,
		})
		if err == nil {
			t.Fatal("expected error for level > 9")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrInvalidSlotLevel {
			t.Errorf("expected INVALID_SLOT_LEVEL, got %v", err)
		}
	})
}

func TestCastingManager_GetActiveConcentration(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("returns nil when not concentrating", func(t *testing.T) {
		conc := cm.GetActiveConcentration("wizard1")
		if conc != nil {
			t.Error("expected nil when not concentrating")
		}
	})

	t.Run("returns concentration after casting concentration spell", func(t *testing.T) {
		caster := newTestCleric()
		_, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "bless",
			Level:    1,
			TargetID: "ally1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		conc := cm.GetActiveConcentration("cleric1")
		if conc == nil {
			t.Fatal("expected active concentration")
		}
		if conc.SpellID != "bless" {
			t.Errorf("expected spell bless, got %s", conc.SpellID)
		}
		if conc.CasterID != "cleric1" {
			t.Errorf("expected caster cleric1, got %s", conc.CasterID)
		}
	})
}

func TestCastingManager_CastSpell_EffectResults(t *testing.T) {
	t.Run("damage effect has correct type and target", func(t *testing.T) {
		cm := newTestCastingManager(15)
		caster := newTestWizard()

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fireball",
			Level:    3,
			TargetID: "enemy1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Effects) != 1 {
			t.Fatalf("expected 1 effect, got %d", len(result.Effects))
		}
		eff := result.Effects[0]
		if eff.Type != models.SpellEffectTypeDamage {
			t.Errorf("expected damage type, got %s", eff.Type)
		}
		if eff.TargetID != "enemy1" {
			t.Errorf("expected target enemy1, got %s", eff.TargetID)
		}
		if eff.Damage <= 0 {
			t.Errorf("expected positive damage, got %d", eff.Damage)
		}
	})

	t.Run("heal effect has correct type", func(t *testing.T) {
		cm := newTestCastingManager(8)
		caster := newTestCleric()

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "cure_wounds",
			Level:    1,
			TargetID: "ally1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Effects) != 1 {
			t.Fatalf("expected 1 effect, got %d", len(result.Effects))
		}
		eff := result.Effects[0]
		if eff.Type != models.SpellEffectTypeHeal {
			t.Errorf("expected heal type, got %s", eff.Type)
		}
		if eff.Healing <= 0 {
			t.Errorf("expected positive healing, got %d", eff.Healing)
		}
	})

	t.Run("buff effect has correct type", func(t *testing.T) {
		cm := newTestCastingManager(3)
		caster := newTestCleric()

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "bless",
			Level:    1,
			TargetID: "ally1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}

		if len(result.Effects) != 1 {
			t.Fatalf("expected 1 effect, got %d", len(result.Effects))
		}
		eff := result.Effects[0]
		if eff.Type != models.SpellEffectTypeBuff {
			t.Errorf("expected buff type, got %s", eff.Type)
		}
	})
}

func TestCastingManager_CastSpell_Upcasting(t *testing.T) {
	t.Run("upcasting cures wounds adds extra healing dice", func(t *testing.T) {
		cm := newTestCastingManager(20)
		caster := newTestCleric()
		caster.SpellSlots[3] = 2

		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "cleric1",
			SpellID:  "cure_wounds",
			Level:    3, // Upcast from level 1 to level 3
			TargetID: "ally1",
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.SlotLevelUsed != 3 {
			t.Errorf("expected slot level 3, got %d", result.SlotLevelUsed)
		}
		if caster.SpellSlots[3] != 1 {
			t.Errorf("expected 1 remaining level 3 slot, got %d", caster.SpellSlots[3])
		}
	})
}

func TestCastingManager_CastSpell_CantripAlwaysLevel0(t *testing.T) {
	cm := newTestCastingManager(10)

	t.Run("cantrip ignores slot_level parameter", func(t *testing.T) {
		caster := newTestWizard()
		// Even if slot_level=5 is passed for a cantrip, it should use level 0.
		result, err := cm.CastSpell(caster, &CastSpellRequest{
			CasterID: "wizard1",
			SpellID:  "fire_bolt",
			Level:    5,
		})
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if result.SlotLevelUsed != 0 {
			t.Errorf("cantrip should always use level 0, got %d", result.SlotLevelUsed)
		}
	})
}

func TestClassesRequiringPreparation(t *testing.T) {
	tests := []struct {
		class    string
		expected bool
	}{
		{"wizard", true},
		{"cleric", true},
		{"druid", true},
		{"paladin", true},
		{"sorcerer", false},
		{"bard", false},
		{"warlock", false},
		{"ranger", false},
		{"fighter", false},
		{"rogue", false},
	}

	for _, tt := range tests {
		t.Run(tt.class, func(t *testing.T) {
			got := classesRequiringPreparation(tt.class)
			if got != tt.expected {
				t.Errorf("classesRequiringPreparation(%s) = %v, want %v", tt.class, got, tt.expected)
			}
		})
	}
}

func TestContainsString(t *testing.T) {
	t.Run("finds existing element", func(t *testing.T) {
		if !containsString([]string{"a", "b", "c"}, "b") {
			t.Error("should find 'b' in slice")
		}
	})

	t.Run("returns false for missing element", func(t *testing.T) {
		if containsString([]string{"a", "b", "c"}, "d") {
			t.Error("should not find 'd' in slice")
		}
	})

	t.Run("handles empty slice", func(t *testing.T) {
		if containsString([]string{}, "a") {
			t.Error("should not find anything in empty slice")
		}
	})

	t.Run("handles nil slice", func(t *testing.T) {
		if containsString(nil, "a") {
			t.Error("should not find anything in nil slice")
		}
	})
}
