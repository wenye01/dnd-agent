// Package models provides the core data models for the D&D game.
package models

import "math"

// Position represents a location on a 2D map grid.
type Position struct {
	X int `json:"x"`
	Y int `json:"y"`
}

// Add returns a new Position that is the sum of this position and another.
func (p Position) Add(other Position) Position {
	return Position{X: p.X + other.X, Y: p.Y + other.Y}
}

// Distance returns the Manhattan distance to another position.
func (p Position) Distance(other Position) int {
	dx := p.X - other.X
	if dx < 0 {
		dx = -dx
	}
	dy := p.Y - other.Y
	if dy < 0 {
		dy = -dy
	}
	return dx + dy
}

// EuclideanDistance returns the Euclidean distance to another position.
func (p Position) EuclideanDistance(other Position) float64 {
	dx := float64(p.X - other.X)
	dy := float64(p.Y - other.Y)
	return math.Sqrt(dx*dx + dy*dy)
}

// Equals returns true if this position is equal to another.
func (p Position) Equals(other Position) bool {
	return p.X == other.X && p.Y == other.Y
}

// Size represents the dimensions of a map or area.
type Size struct {
	Width  int `json:"width"`
	Height int `json:"height"`
}

// Contains returns true if the given position is within the bounds of this size.
func (s Size) Contains(pos Position) bool {
	return pos.X >= 0 && pos.X < s.Width && pos.Y >= 0 && pos.Y < s.Height
}

// Area returns the total area (width * height).
func (s Size) Area() int {
	return s.Width * s.Height
}

// Valid returns true if the size has positive dimensions.
func (s Size) Valid() bool {
	return s.Width > 0 && s.Height > 0
}
