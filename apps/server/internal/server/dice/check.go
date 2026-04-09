// Package dice implements D&D 5e dice rolling mechanics.
package dice

import (
	"math/rand"
)

// CheckResult represents the result of an ability check, saving throw, or attack roll.
type CheckResult struct {
	Success      bool `json:"success"`
	Roll         int  `json:"roll"`         // Raw d20 roll
	Modifier     int  `json:"modifier"`     // Modifier applied
	Total        int  `json:"total"`        // Roll + modifier
	DC           int  `json:"dc"`           // Difficulty class
	Advantage    bool `json:"advantage"`    // Had advantage
	Disadvantage bool `json:"disadvantage"` // Had disadvantage
	Crit         bool `json:"crit"`         // Natural 20
}

// AbilityCheck performs an ability check with the given modifier against a DC.
func AbilityCheck(modifier, dc int, advantage, disadvantage bool) *CheckResult {
	result := &CheckResult{
		Modifier:     modifier,
		DC:           dc,
		Advantage:    advantage,
		Disadvantage: disadvantage,
	}

	// Determine roll based on advantage/disadvantage
	if advantage && !disadvantage {
		// Advantage: roll twice, take higher
		r1 := rollD20()
		r2 := rollD20()
		if r1 >= r2 {
			result.Roll = r1
		} else {
			result.Roll = r2
		}
	} else if disadvantage && !advantage {
		// Disadvantage: roll twice, take lower
		r1 := rollD20()
		r2 := rollD20()
		if r1 <= r2 {
			result.Roll = r1
		} else {
			result.Roll = r2
		}
	} else {
		// Normal roll
		result.Roll = rollD20()
	}

	// Check for crit
	result.Crit = result.Roll == 20

	// Calculate total
	result.Total = result.Roll + modifier

	// Determine success
	result.Success = result.Total >= dc

	return result
}

// SavingThrow performs a saving throw with the given modifier against a DC.
func SavingThrow(modifier, dc int, advantage, disadvantage bool) *CheckResult {
	return AbilityCheck(modifier, dc, advantage, disadvantage)
}

// AttackRoll performs an attack roll with the given bonus against an AC.
func AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *CheckResult {
	result := &CheckResult{
		Modifier:     attackBonus,
		DC:           ac,
		Advantage:    advantage,
		Disadvantage: disadvantage,
	}

	// Determine roll based on advantage/disadvantage
	if advantage && !disadvantage {
		r1 := rollD20()
		r2 := rollD20()
		if r1 >= r2 {
			result.Roll = r1
		} else {
			result.Roll = r2
		}
	} else if disadvantage && !advantage {
		r1 := rollD20()
		r2 := rollD20()
		if r1 <= r2 {
			result.Roll = r1
		} else {
			result.Roll = r2
		}
	} else {
		result.Roll = rollD20()
	}

	// Check for crit (natural 20 always hits)
	result.Crit = result.Roll == 20

	// Calculate total
	result.Total = result.Roll + attackBonus

	// Determine success (crit always hits)
	result.Success = result.Crit || result.Total >= ac

	return result
}

// SkillCheck performs a skill check with the given proficiency bonus and ability modifier.
func SkillCheck(abilityMod, proficiencyBonus int, isProficient bool, dc int, advantage, disadvantage bool) *CheckResult {
	modifier := abilityMod
	if isProficient {
		modifier += proficiencyBonus
	}
	return AbilityCheck(modifier, dc, advantage, disadvantage)
}

// GetModifier returns the ability modifier for a given ability score.
// In D&D 5e, modifier = (score - 10) / 2, rounded down (floor division).
func GetModifier(score int) int {
	diff := score - 10
	mod := diff / 2
	// Go integer division truncates toward zero, but D&D 5e requires floor division
	// e.g., (1-10)/2 = -4 in Go but should be -5
	if diff < 0 && diff%2 != 0 {
		mod--
	}
	return mod
}

// rollD20 rolls a single d20 using the thread-safe shared random source.
func rollD20() int {
	return getGlobalRand().Intn(20) + 1
}

// NewRand creates a new random source. This should be called once at startup.
func NewRand(seed int64) *rand.Rand {
	return rand.New(rand.NewSource(seed))
}
