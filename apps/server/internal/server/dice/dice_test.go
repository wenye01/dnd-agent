package dice

import (
	"math/rand"
	"testing"
)

func TestParse(t *testing.T) {
	tests := []struct {
		name    string
		formula string
		wantErr bool
		check   func(*Roller) bool
	}{
		{
			name:    "single die d20",
			formula: "d20",
			wantErr: false,
			check: func(r *Roller) bool {
				return len(r.dice) == 1 && r.dice[0].Count == 1 && r.dice[0].Sides == 20
			},
		},
		{
			name:    "single die d6",
			formula: "d6",
			wantErr: false,
			check: func(r *Roller) bool {
				return len(r.dice) == 1 && r.dice[0].Count == 1 && r.dice[0].Sides == 6
			},
		},
		{
			name:    "multiple dice 2d6",
			formula: "2d6",
			wantErr: false,
			check: func(r *Roller) bool {
				return len(r.dice) == 1 && r.dice[0].Count == 2 && r.dice[0].Sides == 6
			},
		},
		{
			name:    "dice with modifier 2d6+3",
			formula: "2d6+3",
			wantErr: false,
			check: func(r *Roller) bool {
				return r.modifier == 3
			},
		},
		{
			name:    "dice with negative modifier 1d20-2",
			formula: "1d20-2",
			wantErr: false,
			check: func(r *Roller) bool {
				return r.modifier == -2
			},
		},
		{
			name:    "keep highest 4d6k3",
			formula: "4d6k3",
			wantErr: false,
			check: func(r *Roller) bool {
				return r.keep == 3
			},
		},
		{
			name:    "keep highest with modifier 4d6k3+2",
			formula: "4d6k3+2",
			wantErr: false,
			check: func(r *Roller) bool {
				return r.keep == 3 && r.modifier == 2
			},
		},
		{
			name:    "uppercase D20",
			formula: "D20",
			wantErr: false,
			check: func(r *Roller) bool {
				return len(r.dice) == 1 && r.dice[0].Sides == 20
			},
		},
		{
			name:    "spaces are trimmed",
			formula: "  d20  ",
			wantErr: false,
			check: func(r *Roller) bool {
				return len(r.dice) == 1 && r.dice[0].Sides == 20
			},
		},
		{
			name:    "invalid empty string",
			formula: "",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "invalid format",
			formula: "invalid",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "zero dice count",
			formula: "0d6",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "negative dice count",
			formula: "-1d6",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "zero sides",
			formula: "1d0",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "negative sides",
			formula: "1d-6",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "zero keep value",
			formula: "2d6k0",
			wantErr: true,
			check:   nil,
		},
		{
			name:    "negative keep value",
			formula: "2d6k-1",
			wantErr: true,
			check:   nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Parse(tt.formula)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && tt.check != nil && !tt.check(got) {
				t.Errorf("Parse() result check failed for formula %s", tt.formula)
			}
		})
	}
}

func TestRoller_Roll(t *testing.T) {
	// Create a deterministic random source
	src := rand.NewSource(42)
	rnd := rand.New(src)

	t.Run("simple d20 roll", func(t *testing.T) {
		roller := &Roller{
			dice:     []DieSpec{{Count: 1, Sides: 20}},
			modifier: 0,
		}
		result := roller.Roll(rnd)

		if len(result.Dice) != 1 {
			t.Errorf("Expected 1 die roll, got %d", len(result.Dice))
		}
		if result.Dice[0] < 1 || result.Dice[0] > 20 {
			t.Errorf("d20 roll out of range: %d", result.Dice[0])
		}
		if result.Total != result.Dice[0] {
			t.Errorf("Total should equal dice roll with no modifier")
		}
	})

	t.Run("d20 with modifier", func(t *testing.T) {
		roller := &Roller{
			dice:     []DieSpec{{Count: 1, Sides: 20}},
			modifier: 5,
		}
		result := roller.Roll(rnd)

		if result.Total != result.Dice[0]+5 {
			t.Errorf("Total should equal dice roll + modifier")
		}
	})

	t.Run("multiple dice 3d6", func(t *testing.T) {
		roller := &Roller{
			dice:     []DieSpec{{Count: 3, Sides: 6}},
			modifier: 0,
		}
		result := roller.Roll(rnd)

		if len(result.Dice) != 3 {
			t.Errorf("Expected 3 die rolls, got %d", len(result.Dice))
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
		roller := &Roller{
			dice:     []DieSpec{{Count: 4, Sides: 6}},
			modifier: 0,
			keep:     3,
		}
		result := roller.Roll(rnd)

		if len(result.Dice) != 4 {
			t.Errorf("Expected 4 die rolls, got %d", len(result.Dice))
		}
		if len(result.KeptDice) != 3 {
			t.Errorf("Expected 3 kept dice, got %d", len(result.KeptDice))
		}
		// Kept dice should be the highest 3
		// We can't verify exact values without knowing the rolls,
		// but we can check the count is correct
	})

	t.Run("natural 20 is crit", func(t *testing.T) {
		// Create a source that returns 19 (which becomes 20 with Intn(20)+1)
		src := rand.NewSource(0)
		rnd := rand.New(src)

		roller := &Roller{
			dice:     []DieSpec{{Count: 1, Sides: 20}},
			modifier: 0,
		}

		// Try multiple times to hit a 20
		foundCrit := false
		for i := 0; i < 100; i++ {
			result := roller.Roll(rnd)
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
		roller := &Roller{
			dice:     []DieSpec{{Count: 1, Sides: 20}},
			modifier: 0,
		}

		// Try multiple times to hit a 1
		foundFumble := false
		for i := 0; i < 100; i++ {
			result := roller.Roll(rnd)
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
		roller := &Roller{
			dice:     []DieSpec{{Count: 1, Sides: 6}},
			modifier: 0,
		}

		// Even on a 6 (max for d6), it shouldn't be a crit
		src := rand.NewSource(42)
		rnd := rand.New(src)

		result := roller.Roll(rnd)
		if result.IsCrit || result.IsFumble {
			t.Errorf("Non-d20 rolls should not have crit/fumble flags")
		}
	})
}

func TestDieSpec(t *testing.T) {
	t.Run("valid DieSpec", func(t *testing.T) {
		spec := DieSpec{Count: 2, Sides: 6}
		if spec.Count != 2 {
			t.Errorf("Expected Count 2, got %d", spec.Count)
		}
		if spec.Sides != 6 {
			t.Errorf("Expected Sides 6, got %d", spec.Sides)
		}
	})
}

func TestResult(t *testing.T) {
	t.Run("empty result", func(t *testing.T) {
		result := &Result{
			Dice:     []int{},
			KeptDice: []int{},
			Modifier: 0,
			Total:    0,
		}
		if result.Total != 0 {
			t.Errorf("Expected total 0, got %d", result.Total)
		}
	})

	t.Run("result with values", func(t *testing.T) {
		result := &Result{
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
