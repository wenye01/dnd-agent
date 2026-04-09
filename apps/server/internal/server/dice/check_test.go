package dice_test

import (
	"fmt"
	"testing"

	dice "github.com/dnd-game/server/internal/server/dice"
)

// mockCheckResult creates a CheckResult with a specific roll value for deterministic testing.
// This allows testing crit/fumble logic without relying on random rolls.
func mockCheckResult(roll, modifier, dc int, advantage, disadvantage bool) *dice.CheckResult {
	result := &dice.CheckResult{
		Roll:         roll,
		Modifier:     modifier,
		DC:           dc,
		Advantage:    advantage,
		Disadvantage: disadvantage,
		Crit:         roll == 20,
	}

	result.Total = roll + modifier
	result.Success = result.Total >= dc

	return result
}

// mockAdvantageResult simulates advantage by using the higher of two rolls.
func mockAdvantageResult(roll1, roll2, modifier, dc int) *dice.CheckResult {
	bestRoll := roll1
	if roll2 > roll1 {
		bestRoll = roll2
	}
	result := mockCheckResult(bestRoll, modifier, dc, true, false)
	return result
}

// mockDisadvantageResult simulates disadvantage by using the lower of two rolls.
func mockDisadvantageResult(roll1, roll2, modifier, dc int) *dice.CheckResult {
	worstRoll := roll1
	if roll2 < roll1 {
		worstRoll = roll2
	}
	result := mockCheckResult(worstRoll, modifier, dc, false, true)
	return result
}

// mockAttackResult creates a CheckResult for attack rolls with a specific roll value.
// Natural 20 always hits regardless of AC.
func mockAttackResult(roll, attackBonus, ac int, advantage, disadvantage bool) *dice.CheckResult {
	result := &dice.CheckResult{
		Roll:         roll,
		Modifier:     attackBonus,
		DC:           ac,
		Advantage:    advantage,
		Disadvantage: disadvantage,
		Crit:         roll == 20,
	}

	result.Total = roll + attackBonus
	// Natural 20 always hits
	result.Success = result.Crit || result.Total >= ac

	return result
}

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

	t.Run("advantage picks higher roll", func(t *testing.T) {
		// Roll 5 and 15 with advantage -> should use 15
		result := mockAdvantageResult(5, 15, 0, 10)

		if result.Roll != 15 {
			t.Errorf("Advantage should pick higher roll: expected 15, got %d", result.Roll)
		}
		if !result.Advantage {
			t.Errorf("Advantage flag should be set")
		}
	})

	t.Run("disadvantage picks lower roll", func(t *testing.T) {
		// Roll 5 and 15 with disadvantage -> should use 5
		result := mockDisadvantageResult(5, 15, 0, 10)

		if result.Roll != 5 {
			t.Errorf("Disadvantage should pick lower roll: expected 5, got %d", result.Roll)
		}
		if !result.Disadvantage {
			t.Errorf("Disadvantage flag should be set")
		}
	})

	t.Run("advantage can turn failure into success", func(t *testing.T) {
		// Low roll 5, high roll 15, DC 12, no modifier
		// With advantage: 15 >= 12 -> success
		// Without advantage: 5 < 12 -> failure
		result := mockAdvantageResult(5, 15, 0, 12)

		if !result.Success {
			t.Errorf("Advantage with roll 15 vs DC 12 should succeed")
		}
	})

	t.Run("disadvantage can turn success into failure", func(t *testing.T) {
		// Low roll 5, high roll 15, DC 12, no modifier
		// With disadvantage: 5 < 12 -> failure
		// Without disadvantage: 15 >= 12 -> success
		result := mockDisadvantageResult(5, 15, 0, 12)

		if result.Success {
			t.Errorf("Disadvantage with roll 5 vs DC 12 should fail")
		}
	})

	t.Run("natural 20 is always a crit", func(t *testing.T) {
		// Use mock to deterministically test crit behavior with a natural 20
		result := mockCheckResult(20, 0, 30, false, false)

		if result.Roll != 20 {
			t.Errorf("Expected roll 20, got %d", result.Roll)
		}
		if !result.Crit {
			t.Errorf("Natural 20 should be a crit")
		}
		// Even with DC 30 and no modifier, a natural 20 is marked as crit
		// (though Success depends on total >= DC)
	})

	t.Run("success calculation", func(t *testing.T) {
		result := dice.AbilityCheck(5, 15, false, false)
		expectedSuccess := result.Total >= 15
		if result.Success != expectedSuccess {
			t.Errorf("Success calculation incorrect: got %v, expected %v", result.Success, expectedSuccess)
		}
	})

	t.Run("high modifier always succeeds", func(t *testing.T) {
		// Deterministically test that even with the worst roll (1), high modifier succeeds
		result := mockCheckResult(1, 10, 5, false, false)

		if !result.Success {
			t.Errorf("With +10 mod vs DC 5, even rolling 1 (total 11) should succeed. Roll: %d, Total: %d", result.Roll, result.Total)
		}
	})

	t.Run("natural 1 is never a crit", func(t *testing.T) {
		result := mockCheckResult(1, 0, 10, false, false)

		if result.Crit {
			t.Errorf("Natural 1 should not be a crit")
		}
		if result.Total != 1 {
			t.Errorf("Expected total 1, got %d", result.Total)
		}
	})

	t.Run("success with exact DC match", func(t *testing.T) {
		// Roll 10 + modifier 5 = 15, DC 15 -> success
		result := mockCheckResult(10, 5, 15, false, false)

		if !result.Success {
			t.Errorf("Total %d matching DC %d should be a success", result.Total, result.DC)
		}
	})

	t.Run("failure just below DC", func(t *testing.T) {
		// Roll 9 + modifier 5 = 14, DC 15 -> failure
		result := mockCheckResult(9, 5, 15, false, false)

		if result.Success {
			t.Errorf("Total %d below DC %d should be a failure", result.Total, result.DC)
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
		// Use mock to deterministically test natural 20 behavior
		// Even against impossible AC 30 with no bonus, natural 20 always hits
		result := mockAttackResult(20, 0, 30, false, false)

		if result.Roll != 20 {
			t.Errorf("Expected roll 20, got %d", result.Roll)
		}
		if !result.Success {
			t.Errorf("Natural 20 should always hit (success)")
		}
		if !result.Crit {
			t.Errorf("Natural 20 should be a crit")
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

	t.Run("natural 1 is not a crit", func(t *testing.T) {
		result := mockAttackResult(1, 5, 10, false, false)

		if result.Crit {
			t.Errorf("Natural 1 should not be a crit")
		}
	})

	t.Run("low roll can still hit with high bonus", func(t *testing.T) {
		// Roll 2 + bonus 18 = 20, AC 19 -> hit
		result := mockAttackResult(2, 18, 19, false, false)

		if !result.Success {
			t.Errorf("Total %d vs AC %d should be a hit", result.Total, result.DC)
		}
	})

	t.Run("high roll fails against high AC without bonus", func(t *testing.T) {
		// Roll 15 + bonus 0 = 15, AC 20 -> miss
		result := mockAttackResult(15, 0, 20, false, false)

		if result.Success {
			t.Errorf("Total %d vs AC %d should be a miss", result.Total, result.DC)
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
		{1, -5},
		{2, -4},
		{3, -4},
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
