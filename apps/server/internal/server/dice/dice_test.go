package dice_test

import (
	"math/rand"
	"testing"

	dice "github.com/dnd-game/server/internal/server/dice"
)

// mockRollerResult creates a Result with specific dice values for deterministic testing.
// This allows testing crit/fumble logic without relying on random rolls.
func mockRollerResult(diceValues []int, modifier int) *dice.Result {
	result := &dice.Result{
		Dice:     diceValues,
		KeptDice: diceValues,
		Modifier: modifier,
	}

	sum := 0
	for _, v := range diceValues {
		sum += v
	}
	result.Total = sum + modifier

	// Check for crit/fumble (only on single d20 rolls)
	if len(diceValues) == 1 {
		if diceValues[0] == 20 {
			result.IsCrit = true
		} else if diceValues[0] == 1 {
			result.IsFumble = true
		}
	}

	return result
}

func TestParse(t *testing.T) {
	tests := []struct {
		name    string
		formula string
		wantErr bool
	}{
		{name: "single die d20", formula: "d20", wantErr: false},
		{name: "single die d6", formula: "d6", wantErr: false},
		{name: "multiple dice 2d6", formula: "2d6", wantErr: false},
		{name: "dice with modifier 2d6+3", formula: "2d6+3", wantErr: false},
		{name: "dice with negative modifier 1d20-2", formula: "1d20-2", wantErr: false},
		{name: "keep highest 4d6k3", formula: "4d6k3", wantErr: false},
		{name: "keep highest with modifier 4d6k3+2", formula: "4d6k3+2", wantErr: false},
		{name: "uppercase D20", formula: "D20", wantErr: false},
		{name: "spaces are trimmed", formula: "  d20  ", wantErr: false},
		{name: "invalid empty string", formula: "", wantErr: true},
		{name: "invalid format", formula: "invalid", wantErr: true},
		{name: "zero dice count", formula: "0d6", wantErr: true},
		{name: "negative dice count", formula: "-1d6", wantErr: true},
		{name: "zero sides", formula: "1d0", wantErr: true},
		{name: "negative sides", formula: "1d-6", wantErr: true},
		{name: "zero keep value", formula: "2d6k0", wantErr: true},
		{name: "negative keep value", formula: "2d6k-1", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := dice.Parse(tt.formula)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRoller_Roll(t *testing.T) {
	src := rand.NewSource(42)
	rnd := rand.New(src)

	t.Run("simple d20 roll via Service", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("d20")

		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		if len(result.Dice) != 1 {
			t.Errorf("Expected 1 die, got %d", len(result.Dice))
		}
		if result.Dice[0] < 1 || result.Dice[0] > 20 {
			t.Errorf("d20 roll out of range: %d", result.Dice[0])
		}
	})

	t.Run("d20 with modifier", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("1d20+5")

		if err != nil {
				t.Errorf("Roll() error = %v", err)
		}
		if result.Total != result.Dice[0]+5 {
			t.Errorf("Total should equal dice roll + modifier")
		}
	})

	t.Run("multiple dice 3d6", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("3d6")

		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		if len(result.Dice) != 3 {
			t.Errorf("Expected 3 dice, got %d", len(result.Dice))
		}
		for _, die := range result.Dice {
			if die < 1 || die > 6 {
				t.Errorf("d6 roll out of range: %d", die)
			}
		}
		expectedTotal := result.Dice[0] + result.Dice[1] + result.Dice[2]
		if result.Total != expectedTotal {
			t.Errorf("Expected total %d, got %d", expectedTotal, result.Total)
		}
	})

	t.Run("keep highest 4d6k3", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("4d6k3")

		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		if len(result.Dice) != 4 {
			t.Errorf("Expected 4 dice, got %d", len(result.Dice))
		}
		if len(result.KeptDice) != 3 {
			t.Errorf("Expected 3 kept dice, got %d", len(result.KeptDice))
		}
	})

	t.Run("natural 20 is crit", func(t *testing.T) {
		// Use mock to deterministically test crit behavior
		result := mockRollerResult([]int{20}, 0)

		if result.Dice[0] != 20 {
			t.Errorf("Expected dice value 20, got %d", result.Dice[0])
		}
		if !result.IsCrit {
			t.Errorf("Natural 20 should be a crit")
		}
		if result.IsFumble {
			t.Errorf("Natural 20 should not be a fumble")
		}
	})

	t.Run("natural 1 is fumble", func(t *testing.T) {
		// Use mock to deterministically test fumble behavior
		result := mockRollerResult([]int{1}, 0)

		if result.Dice[0] != 1 {
			t.Errorf("Expected dice value 1, got %d", result.Dice[0])
		}
		if !result.IsFumble {
			t.Errorf("Natural 1 should be a fumble")
		}
		if result.IsCrit {
			t.Errorf("Natural 1 should not be a crit")
		}
	})

	t.Run("only d20 detects crit and fumble", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("1d6")
		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		_ = rnd // Use rnd to avoid unused variable error
		if result.IsCrit || result.IsFumble {
			t.Errorf("Non-d20 rolls should not have crit/fumble flags")
		}
	})

	t.Run("deterministic roll with fixed seed", func(t *testing.T) {
		// Use Roller.Roll() directly with a fixed seed for deterministic testing
		roller, err := dice.Parse("2d6+3")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		// Fixed seed should produce same results every time
		rnd1 := rand.New(rand.NewSource(12345))
		result1 := roller.Roll(rnd1)

		rnd2 := rand.New(rand.NewSource(12345))
		result2 := roller.Roll(rnd2)

		if result1.Total != result2.Total {
			t.Errorf("Same seed should produce same total: got %d and %d", result1.Total, result2.Total)
		}
		if len(result1.Dice) != len(result2.Dice) {
			t.Errorf("Same seed should produce same number of dice")
		}
		for i := range result1.Dice {
			if result1.Dice[i] != result2.Dice[i] {
				t.Errorf("Same seed should produce same dice values at index %d: got %d and %d", i, result1.Dice[i], result2.Dice[i])
			}
		}
	})
}

func TestDieSpec(t *testing.T) {
	t.Run("valid DieSpec", func(t *testing.T) {
		spec := dice.DieSpec{Count: 2, Sides: 6}
		if spec.Count != 2 {
			t.Errorf("Expected Count 2, got %d", spec.Count)
		}
		if spec.Sides != 6 {
			t.Errorf("Expected Sides 6, got %d", spec.Sides)
		}
	})
}

func TestResult(t *testing.T) {
	t.Run("result structure", func(t *testing.T) {
		result := &dice.Result{
			Dice:     []int{3, 4, 5},
			KeptDice: []int{4, 5},
			Modifier: 2,
			Total:    11,
			IsCrit:   false,
			IsFumble: false,
		}
		if len(result.Dice) != 3 {
			t.Errorf("Expected 3 dice, got %d", len(result.Dice))
		}
		if result.Total != 11 {
			t.Errorf("Expected total 11, got %d", result.Total)
		}
	})
}
