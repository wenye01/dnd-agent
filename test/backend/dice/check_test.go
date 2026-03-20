package dice_test

import (
	"fmt"
	"testing"

	dice "github.com/dnd-game/server/internal/server/dice"
)

func TestAbilityCheck(t *testing.T) {
	t.Run("basic ability check", func(t *testing.T) {
		result := dice.AbilityCheck(5, 15, false, false)

		if result.Modifier != 5 {
			t.Errorf("Expected modifier 5, got %d", result.Modifier)
		}
		if result.DC != 15 {
			t.Errorf("Expected DC 15, got %d", result.DC)
		}
		if result.Advantage || result.Disadvantage {
			t.Errorf("Expected no advantage/disadvantage")
		}
		if result.Roll < 1 || result.Roll > 20 {
			t.Errorf("Roll out of range: %d", result.Roll)
		}
	})

	t.Run("ability check with advantage", func(t *testing.T) {
		result := dice.AbilityCheck(5, 15, true, false)

		if !result.Advantage {
			t.Errorf("Expected advantage to be true")
		}
		if result.Disadvantage {
			t.Errorf("Expected disadvantage to be false")
		}
		expectedTotal := result.Roll + result.Modifier
		if result.Total != expectedTotal {
			t.Errorf("Expected total %d, got %d", expectedTotal, result.Total)
		}
	})

	t.Run("ability check with disadvantage", func(t *testing.T) {
		result := dice.AbilityCheck(3, 12, false, true)

		if !result.Disadvantage {
			t.Errorf("Expected disadvantage to be true")
		}
		if result.Advantage {
			t.Errorf("Expected advantage to be false")
		}
	})

	t.Run("advantage and disadvantage both set", func(t *testing.T) {
		result := dice.AbilityCheck(0, 10, true, true)

		if !result.Advantage || !result.Disadvantage {
			t.Errorf("Both advantage and disadvantage flags should be set when both parameters are true")
		}
	})

	t.Run("natural 20 is always a crit", func(t *testing.T) {
		foundCrit := false
		for i := 0; i < 1000; i++ {
			result := dice.AbilityCheck(0, 30, false, false)
			if result.Roll == 20 {
				if !result.Crit {
					t.Errorf("Natural 20 should be a crit")
				}
				foundCrit = true
				break
			}
		}
		if !foundCrit {
			t.Skip("Could not verify crit in 1000 rolls")
		}
	})

	t.Run("success calculation", func(t *testing.T) {
		result := dice.AbilityCheck(5, 15, false, false)
		expectedSuccess := result.Total >= 15
		if result.Success != expectedSuccess {
			t.Errorf("Success calculation incorrect: got %v, expected %v", result.Success, expectedSuccess)
		}
	})

	t.Run("high modifier always succeeds", func(t *testing.T) {
		for i := 0; i < 100; i++ {
			result := dice.AbilityCheck(10, 5, false, false)
			if !result.Success {
				t.Errorf("With +10 mod vs DC 5, should always succeed. Roll: %d, Total: %d", result.Roll, result.Total)
			}
			if result.Roll <= 10 {
				break
			}
		}
	})
}

func TestSavingThrow(t *testing.T) {
	t.Run("saving throw is same as ability check", func(t *testing.T) {
		result := dice.SavingThrow(3, 14, false, false)

		if result.Modifier != 3 {
			t.Errorf("Expected modifier 3, got %d", result.Modifier)
		}
		if result.DC != 14 {
			t.Errorf("Expected DC 14, got %d", result.DC)
		}
	})
}

func TestAttackRoll(t *testing.T) {
	t.Run("basic attack roll", func(t *testing.T) {
		result := dice.AttackRoll(5, 15, false, false)

		if result.Modifier != 5 {
			t.Errorf("Expected attack bonus 5, got %d", result.Modifier)
		}
		if result.DC != 15 {
			t.Errorf("Expected AC 15, got %d", result.DC)
		}
	})

	t.Run("natural 20 always hits", func(t *testing.T) {
		found := false
		for i := 0; i < 1000; i++ {
			result := dice.AttackRoll(0, 30, false, false)
			if result.Roll == 20 {
				if !result.Success {
					t.Errorf("Natural 20 should always hit (success)")
				}
				if !result.Crit {
					t.Errorf("Natural 20 should be a crit")
				}
				found = true
				break
			}
		}
		if !found {
			t.Skip("Could not verify nat 20 behavior in 1000 rolls")
		}
	})

	t.Run("attack with advantage", func(t *testing.T) {
		result := dice.AttackRoll(5, 15, true, false)

		if !result.Advantage {
			t.Errorf("Expected advantage")
		}
	})

	t.Run("attack with disadvantage", func(t *testing.T) {
		result := dice.AttackRoll(3, 12, false, true)

		if !result.Disadvantage {
			t.Errorf("Expected disadvantage")
		}
	})

	t.Run("hit calculation", func(t *testing.T) {
		result := dice.AttackRoll(5, 15, false, false)
		expectedHit := result.Crit || result.Total >= 15
		if result.Success != expectedHit {
			t.Errorf("Hit calculation incorrect: got %v, expected %v", result.Success, expectedHit)
		}
	})
}

func TestSkillCheck(t *testing.T) {
	t.Run("skill without proficiency", func(t *testing.T) {
		result := dice.SkillCheck(2, 3, false, 12, false, false)

		if result.Modifier != 2 {
			t.Errorf("Expected modifier 2 (no proficiency), got %d", result.Modifier)
		}
	})

	t.Run("skill with proficiency", func(t *testing.T) {
		result := dice.SkillCheck(2, 3, true, 12, false, false)

		if result.Modifier != 5 {
			t.Errorf("Expected modifier 5 (2 + 3 proficiency), got %d", result.Modifier)
		}
	})

	t.Run("skill check with advantage", func(t *testing.T) {
		result := dice.SkillCheck(1, 2, true, 10, true, false)

		if !result.Advantage {
			t.Errorf("Expected advantage")
		}
		if result.Modifier != 3 {
			t.Errorf("Expected modifier 3, got %d", result.Modifier)
		}
	})
}

func TestGetModifier(t *testing.T) {
	tests := []struct {
		score    int
		expected int
	}{
		{1, -4},
		{2, -4},
		{3, -3},
		{8, -1},
		{10, 0},
		{11, 0},
		{12, 1},
		{14, 2},
		{16, 3},
		{18, 4},
		{20, 5},
		{30, 10},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("score_%d", tt.score), func(t *testing.T) {
			result := dice.GetModifier(tt.score)
			if result != tt.expected {
				t.Errorf("GetModifier(%d) = %d, want %d", tt.score, result, tt.expected)
			}
		})
	}
}

func TestNewRand(t *testing.T) {
	t.Run("creates random source", func(t *testing.T) {
		rnd := dice.NewRand(42)
		if rnd == nil {
			t.Errorf("NewRand() should return non-nil")
		}
	})

	t.Run("same seed produces same sequence", func(t *testing.T) {
		rnd1 := dice.NewRand(123)
		rnd2 := dice.NewRand(123)

		val1 := rnd1.Intn(100)
		val2 := rnd2.Intn(100)

		if val1 != val2 {
			t.Errorf("Same seed should produce same values: got %d and %d", val1, val2)
		}
	})

	t.Run("different seeds produce different sequences", func(t *testing.T) {
		rnd1 := dice.NewRand(111)
		rnd2 := dice.NewRand(999)

		different := false
		for i := 0; i < 10; i++ {
			val1 := rnd1.Intn(1000)
			val2 := rnd2.Intn(1000)
			if val1 != val2 {
				different = true
				break
			}
		}

		if !different {
			t.Errorf("Different seeds should likely produce different values")
		}
	})
}

func TestCheckResult(t *testing.T) {
	t.Run("check result structure", func(t *testing.T) {
		result := &dice.CheckResult{
			Success:      true,
			Roll:         15,
			Modifier:     3,
			Total:        18,
			DC:           15,
			Advantage:    false,
			Disadvantage: false,
			Crit:         false,
		}

		if !result.Success {
			t.Errorf("Expected success")
		}
		if result.Roll != 15 {
			t.Errorf("Expected roll 15")
		}
		if result.Total != 18 {
			t.Errorf("Expected total 18")
		}
	})
}
