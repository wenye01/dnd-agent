// Package dice implements D&D 5e dice rolling mechanics.
package dice

import (
	"fmt"
	"math/rand"
	"sync"
	"time"
)

var (
	// globalRand is the shared random source for dice rolls.
	globalRand *rand.Rand
	randOnce   sync.Once
)

// getGlobalRand returns the shared random source, initialized lazily.
func getGlobalRand() *rand.Rand {
	randOnce.Do(func() {
		globalRand = rand.New(rand.NewSource(time.Now().UnixNano()))
	})
	return globalRand
}

// Service provides dice rolling functionality.
type Service struct {
	rnd *rand.Rand
	mu  sync.Mutex
}

// NewService creates a new dice service with a random seed.
func NewService() *Service {
	return &Service{
		rnd: rand.New(rand.NewSource(time.Now().UnixNano())),
	}
}

// Roll parses and executes a dice formula.
func (s *Service) Roll(formula string) (*Result, error) {
	roller, err := Parse(formula)
	if err != nil {
		return nil, fmt.Errorf("parse formula: %w", err)
	}

	s.mu.Lock()
	result := roller.Roll(s.rnd)
	s.mu.Unlock()

	return result, nil
}

// AbilityCheck performs an ability check.
func (s *Service) AbilityCheck(modifier, dc int, advantage, disadvantage bool) *CheckResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	roll := s.rollD20()
	result := &CheckResult{
		Modifier:     modifier,
		DC:           dc,
		Advantage:    advantage,
		Disadvantage: disadvantage,
	}

	// Apply advantage/disadvantage
	if advantage && !disadvantage {
		r2 := s.rollD20()
		if r2 > roll {
			roll = r2
		}
	} else if disadvantage && !advantage {
		r2 := s.rollD20()
		if r2 < roll {
			roll = r2
		}
	}

	result.Roll = roll
	result.Crit = roll == 20
	result.Total = roll + modifier
	result.Success = result.Total >= dc

	return result
}

// AttackRoll performs an attack roll with D&D 5e nat1/nat20 rules:
//   - Natural 20 always hits (critical hit)
//   - Natural 1 always misses
func (s *Service) AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *CheckResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	roll := s.rollD20()
	result := &CheckResult{
		Modifier:     attackBonus,
		DC:           ac,
		Advantage:    advantage,
		Disadvantage: disadvantage,
	}

	// Apply advantage/disadvantage
	if advantage && !disadvantage {
		r2 := s.rollD20()
		if r2 > roll {
			roll = r2
		}
	} else if disadvantage && !advantage {
		r2 := s.rollD20()
		if r2 < roll {
			roll = r2
		}
	}

	result.Roll = roll
	result.Crit = roll == 20
	result.Total = roll + attackBonus

	// Natural 20 always hits; natural 1 always misses
	if roll == 20 {
		result.Success = true
	} else if roll == 1 {
		result.Success = false
	} else {
		result.Success = result.Total >= ac
	}

	return result
}

// rollD20 rolls a single d20.
func (s *Service) rollD20() int {
	return s.rnd.Intn(20) + 1
}

// RollResult is a simplified result format for external use.
type RollResult struct {
	Formula  string `json:"formula"`
	Dice     []int  `json:"dice"`
	Modifier int    `json:"modifier"`
	Total    int    `json:"total"`
	IsCrit   bool   `json:"isCrit"`
	IsFumble bool   `json:"isFumble"`
}

// ToRollResult converts a Result to RollResult.
func ToRollResult(r *Result, formula string) *RollResult {
	return &RollResult{
		Formula:  formula,
		Dice:     r.Dice,
		Modifier: r.Modifier,
		Total:    r.Total,
		IsCrit:   r.IsCrit,
		IsFumble: r.IsFumble,
	}
}
