// Package dice handles dice rolling mechanics.
// Deprecated: Use dice.Service for new code. This package contains legacy
// functions that use the global random source which is not thread-safe.
// The dice.Service provides a complete, thread-safe implementation.
package dice

import "fmt"

// This file is kept for backward compatibility but is deprecated.
// All new code should use dice.Service instead.

// RollSimple rolls n dice with s sides each and returns the sum.
// This is a simple utility function for basic dice rolling.
// For full D&D mechanics, use dice.Service instead.
func RollSimple(n, s int) int {
	sum := 0
	for i := 0; i < n; i++ {
		// Use the service for actual random generation
		result, _ := NewService().Roll(formatDice(n, s))
		sum += result.Total
	}
	return sum
}

// formatDice creates a dice formula string.
// This uses fmt.Sprintf to properly convert integers to strings.
func formatDice(n, s int) string {
	if n == 1 {
		return fmt.Sprintf("d%d", s)
	}
	return fmt.Sprintf("%dd%d", n, s)
}
