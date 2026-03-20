package dice_test

import (
	"math/rand"
	"testing"

	dice "github.com/dnd-game/server/internal/server/dice"
)

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
		svc := dice.NewService()
		foundCrit := false
		for i := 0; i < 100; i++ {
			result, err := svc.Roll("1d20")
			if err != nil {
				t.Errorf("Roll() error = %v", err)
				return
			}
			if result.Dice[0] == 20 {
				if !result.IsCrit {
					t.Errorf("Natural 20 should be a crit")
				}
				foundCrit = true
				break
			}
		}
		if !foundCrit {
			t.Skip("Could not verify crit behavior in 100 rolls")
		}
	})

	t.Run("natural 1 is fumble", func(t *testing.T) {
		svc := dice.NewService()
		foundFumble := false
		for i := 0; i < 100; i++ {
			result, err := svc.Roll("1d20")
			if err != nil {
				t.Errorf("Roll() error = %v", err)
				return
			}
			if result.Dice[0] == 1 {
				if !result.IsFumble {
					t.Errorf("Natural 1 should be a fumble")
				}
				foundFumble = true
				break
			}
		}
		if !foundFumble {
			t.Skip("Could not verify fumble behavior in 100 rolls")
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
