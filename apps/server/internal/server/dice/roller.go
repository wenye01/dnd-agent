// Package dice implements D&D 5e dice rolling mechanics.
package dice

import (
	"fmt"
	"math/rand"
	"regexp"
	"sort"
	"strconv"
	"strings"
)

// Roller represents a dice roll expression that can be executed.
type Roller struct {
	dice     []DieSpec
	modifier int
	keep     int // number of highest dice to keep (0 = keep all)
}

// DieSpec specifies a type and quantity of dice to roll.
type DieSpec struct {
	Count int
	Sides int
}

// Parse parses a dice formula string into a Roller.
// Supported formats:
//   - d20, d6, d8 (single die)
//   - 2d6, 4d6k3 (multiple dice, optional keep highest)
//   - 2d6+3, 1d20-2 (with modifier)
//   - 4d6k3+2 (keep highest with modifier)
func Parse(formula string) (*Roller, error) {
	// Normalize and parse
	formula = strings.ToLower(strings.TrimSpace(formula))

	// Regex: (\d*)d(\d+)(k(\d+))?([+-]\d+)?
	re := regexp.MustCompile(`^(\d*)d(\d+)(k(\d+))?([+-]\d+)?$`)
	matches := re.FindStringSubmatch(formula)

	if matches == nil {
		return nil, fmt.Errorf("invalid dice formula: %s", formula)
	}

	roller := &Roller{}

	// Parse dice count
	if matches[1] == "" {
		roller.dice = []DieSpec{{Count: 1, Sides: atoi(matches[2])}}
	} else {
		count := atoi(matches[1])
		sides := atoi(matches[2])
		if count <= 0 {
			return nil, fmt.Errorf("dice count must be positive: %d", count)
		}
		if sides <= 0 {
			return nil, fmt.Errorf("dice sides must be positive: %d", sides)
		}
		roller.dice = []DieSpec{{Count: count, Sides: sides}}
	}

	// Parse keep highest
	if matches[4] != "" {
		roller.keep = atoi(matches[4])
		if roller.keep <= 0 {
			return nil, fmt.Errorf("keep value must be positive: %d", roller.keep)
		}
	}

	// Parse modifier
	if matches[5] != "" {
		roller.modifier = atoi(matches[5])
	}

	return roller, nil
}

// atoi converts a string to int, assuming valid input.
func atoi(s string) int {
	n, _ := strconv.Atoi(s)
	return n
}

// Roll executes the dice roll using the provided random source.
func (r *Roller) Roll(rnd *rand.Rand) *Result {
	var allRolls []int

	// Roll all dice
	for _, die := range r.dice {
		for i := 0; i < die.Count; i++ {
			roll := rnd.Intn(die.Sides) + 1
			allRolls = append(allRolls, roll)
		}
	}

	result := &Result{
		Dice:     allRolls,
		Modifier: r.modifier,
	}

	// Keep highest N if specified
	keptDice := allRolls
	if r.keep > 0 && r.keep < len(allRolls) {
		sort.Sort(sort.Reverse(sort.IntSlice(allRolls)))
		keptDice = allRolls[:r.keep]
		result.KeptDice = keptDice
	} else {
		result.KeptDice = allRolls
	}

	// Calculate total
	sum := 0
	for _, d := range keptDice {
		sum += d
	}
	result.Total = sum + r.modifier

	// Check for crit/fumble (only on single d20 rolls)
	if len(allRolls) == 1 && r.dice[0].Sides == 20 {
		if allRolls[0] == 20 {
			result.IsCrit = true
		} else if allRolls[0] == 1 {
			result.IsFumble = true
		}
	}

	return result
}

// Result represents the outcome of a dice roll.
type Result struct {
	Dice     []int `json:"dice"`     // All raw dice rolls
	KeptDice []int `json:"keptDice"` // Dice kept after applying keep-highest
	Modifier int   `json:"modifier"` // Modifier applied to the roll
	Total    int   `json:"total"`    // Final total
	IsCrit   bool  `json:"isCrit"`   // True if natural 20 on d20
	IsFumble bool  `json:"isFumble"` // True if natural 1 on d20
}
