package models

import (
	"encoding/json"
	"testing"
)

func TestDiceResult_Serialization(t *testing.T) {
	tests := []struct {
		name   string
		result DiceResult
	}{
		{
			name: "simple d20 roll",
			result: DiceResult{
				Formula:  "d20",
				Dice:     []int{15},
				Modifier: 0,
				Total:    15,
				IsCrit:   false,
				IsFumble: false,
			},
		},
		{
			name: "crit on d20",
			result: DiceResult{
				Formula:  "d20",
				Dice:     []int{20},
				Modifier: 5,
				Total:    25,
				IsCrit:   true,
				IsFumble: false,
			},
		},
		{
			name: "fumble on d20",
			result: DiceResult{
				Formula:  "d20",
				Dice:     []int{1},
				Modifier: 3,
				Total:    4,
				IsCrit:   false,
				IsFumble: true,
			},
		},
		{
			name: "multiple dice with modifier",
			result: DiceResult{
				Formula:  "2d6+3",
				Dice:     []int{4, 2},
				Modifier: 3,
				Total:    9,
				IsCrit:   false,
				IsFumble: false,
			},
		},
		{
			name: "multiple dice with negative modifier",
			result: DiceResult{
				Formula:  "3d8-2",
				Dice:     []int{5, 3, 7},
				Modifier: -2,
				Total:    13,
				IsCrit:   false,
				IsFumble: false,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test JSON marshaling
			data, err := json.Marshal(tt.result)
			if err != nil {
				t.Fatalf("JSON Marshal failed: %v", err)
			}

			// Test JSON unmarshaling
			var unmarshaled DiceResult
			err = json.Unmarshal(data, &unmarshaled)
			if err != nil {
				t.Fatalf("JSON Unmarshal failed: %v", err)
			}

			// Verify all fields match
			if unmarshaled.Formula != tt.result.Formula {
				t.Errorf("Formula mismatch: got %s, want %s", unmarshaled.Formula, tt.result.Formula)
			}
			if unmarshaled.Total != tt.result.Total {
				t.Errorf("Total mismatch: got %d, want %d", unmarshaled.Total, tt.result.Total)
			}
			if unmarshaled.Modifier != tt.result.Modifier {
				t.Errorf("Modifier mismatch: got %d, want %d", unmarshaled.Modifier, tt.result.Modifier)
			}
			if unmarshaled.IsCrit != tt.result.IsCrit {
				t.Errorf("IsCrit mismatch: got %v, want %v", unmarshaled.IsCrit, tt.result.IsCrit)
			}
			if unmarshaled.IsFumble != tt.result.IsFumble {
				t.Errorf("IsFumble mismatch: got %v, want %v", unmarshaled.IsFumble, tt.result.IsFumble)
			}
			if len(unmarshaled.Dice) != len(tt.result.Dice) {
				t.Errorf("Dice array length mismatch: got %d, want %d", len(unmarshaled.Dice), len(tt.result.Dice))
			}
			for i := range unmarshaled.Dice {
				if unmarshaled.Dice[i] != tt.result.Dice[i] {
					t.Errorf("Dice[%d] mismatch: got %d, want %d", i, unmarshaled.Dice[i], tt.result.Dice[i])
				}
			}
		})
	}
}

func TestDiceResult_Validation(t *testing.T) {
	t.Run("valid dice result - all fields present", func(t *testing.T) {
		result := DiceResult{
			Formula:  "2d6+3",
			Dice:     []int{4, 2},
			Modifier: 3,
			Total:    9,
			IsCrit:   false,
			IsFumble: false,
		}

		if result.Formula == "" {
			t.Error("Formula should not be empty")
		}
		if len(result.Dice) == 0 {
			t.Error("Dice array should not be empty")
		}
		if result.Total != 9 {
			t.Errorf("Expected Total 9, got %d", result.Total)
		}
	})

	t.Run("dice result with zero modifier", func(t *testing.T) {
		result := DiceResult{
			Formula:  "d20",
			Dice:     []int{15},
			Modifier: 0,
			Total:    15,
			IsCrit:   false,
			IsFumble: false,
		}

		if result.Modifier != 0 {
			t.Errorf("Expected Modifier 0, got %d", result.Modifier)
		}
		if result.Total != result.Dice[0] {
			t.Errorf("Total should equal dice value when modifier is 0")
		}
	})
}

func TestCheckResult_Serialization(t *testing.T) {
	tests := []struct {
		name   string
		result CheckResult
	}{
		{
			name: "successful check",
			result: CheckResult{
				Success:      true,
				Roll:         15,
				Modifier:     3,
				Total:        18,
				DC:           15,
				Advantage:    false,
				Disadvantage: false,
				Crit:         false,
			},
		},
		{
			name: "failed check",
			result: CheckResult{
				Success:      false,
				Roll:         8,
				Modifier:     2,
				Total:        10,
				DC:           15,
				Advantage:    false,
				Disadvantage: false,
				Crit:         false,
			},
		},
		{
			name: "critical success",
			result: CheckResult{
				Success:      true,
				Roll:         20,
				Modifier:     5,
				Total:        25,
				DC:           20,
				Advantage:    false,
				Disadvantage: false,
				Crit:         true,
			},
		},
		{
			name: "check with advantage",
			result: CheckResult{
				Success:      true,
				Roll:         14,
				Modifier:     3,
				Total:        17,
				DC:           15,
				Advantage:    true,
				Disadvantage: false,
				Crit:         false,
			},
		},
		{
			name: "check with disadvantage",
			result: CheckResult{
				Success:      false,
				Roll:         5,
				Modifier:     2,
				Total:        7,
				DC:           10,
				Advantage:    false,
				Disadvantage: true,
				Crit:         false,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test JSON marshaling
			data, err := json.Marshal(tt.result)
			if err != nil {
				t.Fatalf("JSON Marshal failed: %v", err)
			}

			// Test JSON unmarshaling
			var unmarshaled CheckResult
			err = json.Unmarshal(data, &unmarshaled)
			if err != nil {
				t.Fatalf("JSON Unmarshal failed: %v", err)
			}

			// Verify all fields match
			if unmarshaled.Success != tt.result.Success {
				t.Errorf("Success mismatch: got %v, want %v", unmarshaled.Success, tt.result.Success)
			}
			if unmarshaled.Roll != tt.result.Roll {
				t.Errorf("Roll mismatch: got %d, want %d", unmarshaled.Roll, tt.result.Roll)
			}
			if unmarshaled.Modifier != tt.result.Modifier {
				t.Errorf("Modifier mismatch: got %d, want %d", unmarshaled.Modifier, tt.result.Modifier)
			}
			if unmarshaled.Total != tt.result.Total {
				t.Errorf("Total mismatch: got %d, want %d", unmarshaled.Total, tt.result.Total)
			}
			if unmarshaled.DC != tt.result.DC {
				t.Errorf("DC mismatch: got %d, want %d", unmarshaled.DC, tt.result.DC)
			}
			if unmarshaled.Advantage != tt.result.Advantage {
				t.Errorf("Advantage mismatch: got %v, want %v", unmarshaled.Advantage, tt.result.Advantage)
			}
			if unmarshaled.Disadvantage != tt.result.Disadvantage {
				t.Errorf("Disadvantage mismatch: got %v, want %v", unmarshaled.Disadvantage, tt.result.Disadvantage)
			}
			if unmarshaled.Crit != tt.result.Crit {
				t.Errorf("Crit mismatch: got %v, want %v", unmarshaled.Crit, tt.result.Crit)
			}
		})
	}
}

func TestCheckResult_Validation(t *testing.T) {
	t.Run("check result total equals roll plus modifier", func(t *testing.T) {
		result := CheckResult{
			Roll:     15,
			Modifier: 3,
			Total:    18,
		}

		expectedTotal := result.Roll + result.Modifier
		if result.Total != expectedTotal {
			t.Errorf("Expected Total %d (Roll + Modifier), got %d", expectedTotal, result.Total)
		}
	})

	t.Run("success field can be set independently", func(t *testing.T) {
		// Note: Success is not computed automatically - it's set by the caller
		result := CheckResult{
			Roll:     15,
			Modifier: 2,
			Total:    17,
			DC:       15,
			Success:  true, // This must be set by the code using CheckResult
		}

		if !result.Success {
			t.Error("Expected Success to be true when explicitly set")
		}
	})

	t.Run("failed check has success false", func(t *testing.T) {
		result := CheckResult{
			Roll:     5,
			Modifier: 0,
			Total:    5,
			DC:       15,
			Success:  false, // Set by caller
		}

		if result.Success {
			t.Error("Expected Success to be false when explicitly set")
		}
	})
}

func TestDiceResult_EmptyArray(t *testing.T) {
	t.Run("empty dice array serializes correctly", func(t *testing.T) {
		result := DiceResult{
			Formula:  "d20",
			Dice:     []int{},
			Modifier: 0,
			Total:    0,
		}

		data, err := json.Marshal(result)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled DiceResult
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if len(unmarshaled.Dice) != 0 {
			t.Errorf("Expected empty dice array, got %d elements", len(unmarshaled.Dice))
		}
	})
}
