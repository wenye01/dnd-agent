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
			_, err := Parse(tt.formula)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestRoller_Roll(t *testing.T) {
	t.Run("simple d20 roll", func(t *testing.T) {
		roller, err := Parse("d20")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		if len(result.Dice) != 1 {
			t.Errorf("Expected 1 die, got %d", len(result.Dice))
		}
		if result.Dice[0] < 1 || result.Dice[0] > 20 {
			t.Errorf("d20 roll out of range: %d", result.Dice[0])
		}
	})

	t.Run("d20 with modifier", func(t *testing.T) {
		roller, err := Parse("1d20+5")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		if result.Total != result.Dice[0]+5 {
			t.Errorf("Total should equal dice roll + modifier")
		}
	})

	t.Run("multiple dice 3d6", func(t *testing.T) {
		roller, err := Parse("3d6")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

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
		roller, err := Parse("4d6k3")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		if len(result.Dice) != 4 {
			t.Errorf("Expected 4 dice, got %d", len(result.Dice))
		}
		if len(result.KeptDice) != 3 {
			t.Errorf("Expected 3 kept dice, got %d", len(result.KeptDice))
		}
	})

	t.Run("deterministic roll with fixed seed", func(t *testing.T) {
		roller, err := Parse("2d6+3")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

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

	t.Run("roll produces values within expected range", func(t *testing.T) {
		roller, err := Parse("d8")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		for i := 0; i < 100; i++ {
			result := roller.Roll(rnd)
			if result.Dice[0] < 1 || result.Dice[0] > 8 {
				t.Errorf("d8 roll out of range: %d", result.Dice[0])
			}
		}
	})

	t.Run("negative modifier works correctly", func(t *testing.T) {
		roller, err := Parse("1d20-5")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		if result.Total != result.Dice[0]-5 {
			t.Errorf("Total with negative modifier incorrect: got %d, want %d", result.Total, result.Dice[0]-5)
		}
		if result.Modifier != -5 {
			t.Errorf("Modifier should be -5, got %d", result.Modifier)
		}
	})

	t.Run("crit detection on natural 20", func(t *testing.T) {
		roller, err := Parse("d20")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		// Use seed search instead of mocking to exercise the real Roll() code path.
		// A d20 has a 5% chance of rolling 20, so finding one within 10000 seeds is
		// virtually guaranteed. If this fails, check whether the RNG or dice logic changed.
		var critResult *Result
		for seed := int64(0); seed < 10000; seed++ {
			rnd := rand.New(rand.NewSource(seed))
			result := roller.Roll(rnd)
			if result.IsCrit {
				critResult = result
				break
			}
		}

		if critResult == nil {
			t.Fatal("Failed to find a seed that produces natural 20 in 10000 attempts")
		}
		if critResult.Dice[0] != 20 {
			t.Errorf("Crit roll should be 20, got %d", critResult.Dice[0])
		}
		if !critResult.IsCrit {
			t.Errorf("Expected IsCrit to be true")
		}
		if critResult.IsFumble {
			t.Errorf("Expected IsFumble to be false")
		}
		if critResult.Total != 20 {
			t.Errorf("Crit total should be 20, got %d", critResult.Total)
		}
	})

	t.Run("fumble detection on natural 1", func(t *testing.T) {
		roller, err := Parse("d20")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		// Same seed-search approach as crit test — see crit detection comment above.
		var fumbleResult *Result
		for seed := int64(0); seed < 10000; seed++ {
			rnd := rand.New(rand.NewSource(seed))
			result := roller.Roll(rnd)
			if result.IsFumble {
				fumbleResult = result
				break
			}
		}

		if fumbleResult == nil {
			t.Fatal("Failed to find a seed that produces natural 1 in 10000 attempts")
		}
		if fumbleResult.Dice[0] != 1 {
			t.Errorf("Fumble roll should be 1, got %d", fumbleResult.Dice[0])
		}
		if !fumbleResult.IsFumble {
			t.Errorf("Expected IsFumble to be true")
		}
		if fumbleResult.IsCrit {
			t.Errorf("Expected IsCrit to be false")
		}
		if fumbleResult.Total != 1 {
			t.Errorf("Fumble total should be 1, got %d", fumbleResult.Total)
		}
	})

	t.Run("non-d20 rolls never have crit or fumble", func(t *testing.T) {
		roller, err := Parse("d6")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		for i := 0; i < 100; i++ {
			result := roller.Roll(rnd)
			if result.IsCrit {
				t.Errorf("d6 roll should never be crit, got roll %d", result.Dice[0])
			}
			if result.IsFumble {
				t.Errorf("d6 roll should never be fumble, got roll %d", result.Dice[0])
			}
		}
	})

	t.Run("multi-d20 rolls do not trigger crit/fumble", func(t *testing.T) {
		roller, err := Parse("2d20")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		for i := 0; i < 100; i++ {
			result := roller.Roll(rnd)
			if result.IsCrit {
				t.Errorf("2d20 roll should never be crit (only single d20)")
			}
			if result.IsFumble {
				t.Errorf("2d20 roll should never be fumble (only single d20)")
			}
		}
	})

	t.Run("keep higher than dice count keeps all", func(t *testing.T) {
		roller, err := Parse("2d6k10")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		// When keep >= dice count, all dice are kept
		if len(result.KeptDice) != len(result.Dice) {
			t.Errorf("When keep >= dice count, all dice should be kept")
		}
	})

	t.Run("keep equal to dice count", func(t *testing.T) {
		roller, err := Parse("4d6k4")
		if err != nil {
			t.Fatalf("Parse() error = %v", err)
		}

		rnd := rand.New(rand.NewSource(42))
		result := roller.Roll(rnd)

		if len(result.KeptDice) != 4 {
			t.Errorf("Expected 4 kept dice, got %d", len(result.KeptDice))
		}
	})
}

func TestParse_EdgeCases(t *testing.T) {
	tests := []struct {
		name    string
		formula string
		wantErr bool
	}{
		{name: "no count d20", formula: "d20", wantErr: false},
		{name: "no modifier d6", formula: "d6", wantErr: false},
		{name: "just d and number", formula: "d100", wantErr: false},
		{name: "large dice count", formula: "100d6", wantErr: false},
		{name: "large sides", formula: "1d1000", wantErr: false},
		{name: "mixed case D", formula: "D6", wantErr: false},
		{name: "spaces around plus", formula: "1d6 + 3", wantErr: true}, // Spaces not supported in regex
		{name: "only modifier", formula: "+5", wantErr: true},
		{name: "only k", formula: "k3", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := Parse(tt.formula)
			if (err != nil) != tt.wantErr {
				t.Errorf("Parse(%q) error = %v, wantErr %v", tt.formula, err, tt.wantErr)
			}
		})
	}
}
