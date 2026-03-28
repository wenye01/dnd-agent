package dice_test

import (
	"strings"
	"sync"
	"testing"

	dice "github.com/dnd-game/server/internal/server/dice"
)

func TestNewService(t *testing.T) {
	t.Run("creates new service", func(t *testing.T) {
		svc := dice.NewService()
		if svc == nil {
			t.Errorf("NewService() should return non-nil")
		}
	})

	t.Run("multiple services are independent", func(t *testing.T) {
		svc1 := dice.NewService()
		svc2 := dice.NewService()

		if svc1 == svc2 {
			t.Errorf("NewService() should return new instances")
		}
	})
}

func TestService_Roll(t *testing.T) {
	t.Run("simple d20 roll", func(t *testing.T) {
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

	t.Run("dice with modifier", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("2d6+3")

		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		if len(result.Dice) != 2 {
			t.Errorf("Expected 2 dice, got %d", len(result.Dice))
		}
		if result.Modifier != 3 {
			t.Errorf("Expected modifier 3, got %d", result.Modifier)
		}
		if result.Total != result.Dice[0]+result.Dice[1]+3 {
			t.Errorf("Total calculation incorrect")
		}
	})

	t.Run("keep highest", func(t *testing.T) {
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

	t.Run("invalid formula returns error", func(t *testing.T) {
		svc := dice.NewService()
		_, err := svc.Roll("invalid")

		if err == nil {
			t.Errorf("Expected error for invalid formula")
		}
		if !strings.Contains(err.Error(), "parse formula") {
			t.Errorf("Error should mention parse failure: %v", err)
		}
	})

	t.Run("empty formula returns error", func(t *testing.T) {
		svc := dice.NewService()
		_, err := svc.Roll("")

		if err == nil {
			t.Errorf("Expected error for empty formula")
		}
	})

	t.Run("complex formula", func(t *testing.T) {
		svc := dice.NewService()
		result, err := svc.Roll("4d6k3+2")

		if err != nil {
			t.Errorf("Roll() error = %v", err)
		}
		if len(result.KeptDice) != 3 {
			t.Errorf("Expected 3 kept dice, got %d", len(result.KeptDice))
		}
		if result.Modifier != 2 {
			t.Errorf("Expected modifier 2, got %d", result.Modifier)
		}
	})
}

func TestService_AbilityCheck(t *testing.T) {
	t.Run("basic ability check", func(t *testing.T) {
		svc := dice.NewService()
		result := svc.AbilityCheck(5, 15, false, false)

		if result.Modifier != 5 {
			t.Errorf("Expected modifier 5, got %d", result.Modifier)
		}
		if result.DC != 15 {
			t.Errorf("Expected DC 15, got %d", result.DC)
		}
		if result.Roll < 1 || result.Roll > 20 {
			t.Errorf("Roll out of range: %d", result.Roll)
		}
	})

	t.Run("ability check with advantage", func(t *testing.T) {
		svc := dice.NewService()
		result := svc.AbilityCheck(3, 12, true, false)

		if !result.Advantage {
			t.Errorf("Expected advantage")
		}
		if result.Disadvantage {
			t.Errorf("Expected no disadvantage")
		}
	})

	t.Run("ability check with disadvantage", func(t *testing.T) {
		svc := dice.NewService()
		result := svc.AbilityCheck(2, 10, false, true)

		if !result.Disadvantage {
			t.Errorf("Expected disadvantage")
		}
		if result.Advantage {
			t.Errorf("Expected no advantage")
		}
	})

	t.Run("natural 20 is crit", func(t *testing.T) {
		svc := dice.NewService()
		found := false
		for i := 0; i < 1000; i++ {
			result := svc.AbilityCheck(0, 30, false, false)
			if result.Roll == 20 {
				if !result.Crit {
					t.Errorf("Natural 20 should be crit")
				}
				found = true
				break
			}
		}
		if !found {
			t.Skip("Could not verify crit in 1000 rolls")
		}
	})
}

func TestService_ThreadSafety(t *testing.T) {
	t.Run("concurrent rolls", func(t *testing.T) {
		svc := dice.NewService()
		var wg sync.WaitGroup
		errors := make(chan error, 100)
		done := make(chan bool, 100)

		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				for j := 0; j < 10; j++ {
					_, err := svc.Roll("2d6")
					if err != nil {
						errors <- err
					}
				}
				done <- true
			}()
		}

		wg.Wait()
		close(errors)
		close(done)

		for err := range errors {
			t.Errorf("Concurrent roll error: %v", err)
		}

		completed := 0
		for range done {
			completed++
		}
		if completed != 100 {
			t.Errorf("Expected 100 completed goroutines, got %d", completed)
		}
	})

	t.Run("concurrent ability checks", func(t *testing.T) {
		svc := dice.NewService()
		var wg sync.WaitGroup

		for i := 0; i < 50; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				svc.AbilityCheck(5, 15, true, false)
			}()
		}

		wg.Wait()
	})
}

func TestToRollResult(t *testing.T) {
	t.Run("convert result to roll result", func(t *testing.T) {
		result := &dice.Result{
			Dice:     []int{3, 4, 5},
			KeptDice: []int{4, 5},
			Modifier: 2,
			Total:    11,
			IsCrit:   false,
			IsFumble: false,
		}

		rollResult := dice.ToRollResult(result, "3d6+2")

		if rollResult.Formula != "3d6+2" {
			t.Errorf("Expected formula '3d6+2', got %s", rollResult.Formula)
		}
		if len(rollResult.Dice) != 3 {
			t.Errorf("Expected 3 dice, got %d", len(rollResult.Dice))
		}
		if rollResult.Modifier != 2 {
			t.Errorf("Expected modifier 2, got %d", rollResult.Modifier)
		}
		if rollResult.Total != 11 {
			t.Errorf("Expected total 11, got %d", rollResult.Total)
		}
	})

	t.Run("convert with crit", func(t *testing.T) {
		result := &dice.Result{
			Dice:     []int{20},
			KeptDice: []int{20},
			Modifier: 5,
			Total:    25,
			IsCrit:   true,
			IsFumble: false,
		}

		rollResult := dice.ToRollResult(result, "1d20+5")

		if !rollResult.IsCrit {
			t.Errorf("Expected crit to be true")
		}
		if rollResult.IsFumble {
			t.Errorf("Expected fumble to be false")
		}
	})

	t.Run("convert with fumble", func(t *testing.T) {
		result := &dice.Result{
			Dice:     []int{1},
			KeptDice: []int{1},
			Modifier: 0,
			Total:    1,
			IsCrit:   false,
			IsFumble: true,
		}

		rollResult := dice.ToRollResult(result, "1d20")

		if rollResult.IsCrit {
			t.Errorf("Expected crit to be false")
		}
		if !rollResult.IsFumble {
			t.Errorf("Expected fumble to be true")
		}
	})
}
