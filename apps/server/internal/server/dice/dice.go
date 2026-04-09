// Package dice handles dice rolling mechanics.
// Deprecated: Use dice.Service for new code. This package contains legacy
// functions that use the global random source which is not thread-safe.
// The dice.Service provides a complete, thread-safe implementation.
package dice

// RollSimple rolls n dice with s sides each and returns the sum.
// This is a simple utility function for basic dice rolling.
// For full D&D mechanics, use dice.Service instead.
func RollSimple(n, s int) int {
	sum := 0
	rnd := getGlobalRand()
	for i := 0; i < n; i++ {
		sum += rnd.Intn(s) + 1
	}
	return sum
}
