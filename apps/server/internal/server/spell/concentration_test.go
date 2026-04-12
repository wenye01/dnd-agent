package spell

import (
	"testing"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// mockConcentrationDice is a dice service that always returns a fixed total.
type mockConcentrationDice struct {
	fixedTotal int
}

func (m *mockConcentrationDice) Roll(formula string) (*dice.Result, error) {
	return &dice.Result{Total: m.fixedTotal}, nil
}
func (m *mockConcentrationDice) AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}
func (m *mockConcentrationDice) AbilityCheck(modifier, dc int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}

func TestConcentrationManager_StartConcentration(t *testing.T) {
	cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 15})

	t.Run("starts new concentration", func(t *testing.T) {
		err := cm.StartConcentration("caster1", "bless", "Bless", "target1")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		conc := cm.GetActiveConcentration("caster1")
		if conc == nil {
			t.Fatal("expected active concentration")
		}
		if conc.SpellID != "bless" {
			t.Errorf("expected spell bless, got %s", conc.SpellID)
		}
	})

	t.Run("replaces existing concentration", func(t *testing.T) {
		err := cm.StartConcentration("caster1", "hold_person", "Hold Person", "target2")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}

		conc := cm.GetActiveConcentration("caster1")
		if conc == nil {
			t.Fatal("expected active concentration")
		}
		if conc.SpellID != "hold_person" {
			t.Errorf("expected spell hold_person, got %s", conc.SpellID)
		}
	})
}

func TestConcentrationManager_EndConcentration(t *testing.T) {
	cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 15})

	t.Run("errors when not concentrating", func(t *testing.T) {
		err := cm.EndConcentration("nonexistent")
		if err == nil {
			t.Error("expected error when not concentrating")
		}
	})

	t.Run("ends active concentration", func(t *testing.T) {
		_ = cm.StartConcentration("caster1", "bless", "Bless", "target1")
		err := cm.EndConcentration("caster1")
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if cm.IsConcentrating("caster1") {
			t.Error("should not be concentrating after end")
		}
	})
}

func TestConcentrationManager_IsConcentrating(t *testing.T) {
	cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 15})

	if cm.IsConcentrating("caster1") {
		t.Error("should not be concentrating initially")
	}

	_ = cm.StartConcentration("caster1", "bless", "Bless", "target1")
	if !cm.IsConcentrating("caster1") {
		t.Error("should be concentrating after start")
	}
}

func TestConcentrationManager_ConcentrationCheck(t *testing.T) {
	t.Run("returns true when not concentrating", func(t *testing.T) {
		cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 15})
		char := &models.Character{ID: "caster1", Level: 5}
		maintained, err := cm.ConcentrationCheck(char, 10)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !maintained {
			t.Error("should always maintain when not concentrating")
		}
	})

	t.Run("succeeds when roll beats DC", func(t *testing.T) {
		// d20=15 + conMod=3 + prof=4 = 22 vs DC=10
		cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 15})
		char := &models.Character{
			ID:              "caster1",
			Level:           9,
			ProficiencyBonus: 4,
			Stats:           models.AbilityScores{Constitution: 16},
			SavingThrows:    map[types.Ability]bool{types.Constitution: true},
		}
		_ = cm.StartConcentration("caster1", "bless", "Bless", "")

		maintained, err := cm.ConcentrationCheck(char, 10)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if !maintained {
			t.Error("should maintain concentration with high roll")
		}
	})

	t.Run("fails when roll is too low", func(t *testing.T) {
		// d20=1 + conMod=0 = 1 vs DC=10
		cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 1})
		char := &models.Character{
			ID:              "caster1",
			Level:           1,
			ProficiencyBonus: 2,
			Stats:           models.AbilityScores{Constitution: 10},
			SavingThrows:    map[types.Ability]bool{},
		}
		_ = cm.StartConcentration("caster1", "bless", "Bless", "")

		maintained, err := cm.ConcentrationCheck(char, 10)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if maintained {
			t.Error("should fail concentration check with low roll")
		}
		if cm.IsConcentrating("caster1") {
			t.Error("concentration should be ended after failed check")
		}
	})

	t.Run("DC is max(10, damage/2)", func(t *testing.T) {
		// damage=30 -> DC=15, roll=5 + conMod=3 = 8 < 15 -> fail
		cm := NewConcentrationManager(&mockConcentrationDice{fixedTotal: 5})
		char := &models.Character{
			ID:              "caster1",
			Level:           5,
			ProficiencyBonus: 3,
			Stats:           models.AbilityScores{Constitution: 16},
			SavingThrows:    map[types.Ability]bool{},
		}
		_ = cm.StartConcentration("caster1", "bless", "Bless", "")

		maintained, _ := cm.ConcentrationCheck(char, 30)
		if maintained {
			t.Error("should fail with DC 15 and low roll")
		}
	})
}

func TestGetBreakDC(t *testing.T) {
	tests := []struct {
		damage int
		want   int
	}{
		{0, 10},
		{5, 10},
		{10, 10},
		{20, 10},
		{21, 10},
		{22, 11},
		{30, 15},
		{50, 25},
	}

	for _, tt := range tests {
		got := GetBreakDC(tt.damage)
		if got != tt.want {
			t.Errorf("GetBreakDC(%d) = %d, want %d", tt.damage, got, tt.want)
		}
	}
}
