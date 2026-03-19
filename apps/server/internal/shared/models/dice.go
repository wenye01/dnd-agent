// Package models provides the core data models for the D&D game.
package models

// DiceResult represents the result of a dice roll.
type DiceResult struct {
	Formula  string `json:"formula"`  // The original dice formula (e.g., "2d6+3")
	Dice     []int  `json:"dice"`     // Individual die results
	Modifier int    `json:"modifier"` // The modifier applied to the roll
	Total    int    `json:"total"`    // The final total
	IsCrit   bool   `json:"isCrit"`   // True if the roll was a natural 20
	IsFumble bool   `json:"isFumble"` // True if the roll was a natural 1
}

// CheckResult represents the result of an ability check, saving throw, or attack roll.
type CheckResult struct {
	Success      bool `json:"success"`      // Whether the check succeeded
	Roll         int  `json:"roll"`         // The raw d20 roll
	Modifier     int  `json:"modifier"`     // The modifier applied
	Total        int  `json:"total"`        // Roll + modifier
	DC           int  `json:"dc"`           // The difficulty class
	Advantage    bool `json:"advantage"`    // Whether advantage was used
	Disadvantage bool `json:"disadvantage"` // Whether disadvantage was used
	Crit         bool `json:"crit"`         // Whether it was a critical hit
}
