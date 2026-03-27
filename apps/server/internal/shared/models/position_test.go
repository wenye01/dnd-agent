package models

import (
	"encoding/json"
	"testing"
)

func TestPosition_Add(t *testing.T) {
	tests := []struct {
		name     string
		p1       Position
		p2       Position
		expected Position
	}{
		{
			name:     "add positive coordinates",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 3, Y: 7},
			expected: Position{X: 8, Y: 17},
		},
		{
			name:     "add negative coordinates",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: -2, Y: -3},
			expected: Position{X: 3, Y: 7},
		},
		{
			name:     "add to zero",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 5, Y: 10},
			expected: Position{X: 5, Y: 10},
		},
		{
			name:     "add zero to position",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 0, Y: 0},
			expected: Position{X: 5, Y: 10},
		},
		{
			name:     "add mixed positive and negative",
			p1:       Position{X: -5, Y: 10},
			p2:       Position{X: 7, Y: -3},
			expected: Position{X: 2, Y: 7},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.p1.Add(tt.p2)
			if result != tt.expected {
				t.Errorf("Add() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestPosition_Distance(t *testing.T) {
	// Distance uses Manhattan distance: |dx| + |dy|
	tests := []struct {
		name     string
		p1       Position
		p2       Position
		expected int
	}{
		{
			name:     "same position",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 5, Y: 10},
			expected: 0,
		},
		{
			name:     "horizontal distance",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 5, Y: 0},
			expected: 5,
		},
		{
			name:     "vertical distance",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 0, Y: 7},
			expected: 7,
		},
		{
			name:     "diagonal distance",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 3, Y: 4},
			expected: 7, // |3| + |4| = 7
		},
		{
			name:     "distance with negative coordinates",
			p1:       Position{X: -5, Y: -10},
			p2:       Position{X: 2, Y: -3},
			expected: 14, // |-7| + |-7| = 14
		},
		{
			name:     "large distance",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 100, Y: 50},
			expected: 150,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.p1.Distance(tt.p2)
			if result != tt.expected {
				t.Errorf("Distance() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestPosition_EuclideanDistance(t *testing.T) {
	tests := []struct {
		name     string
		p1       Position
		p2       Position
		epsilon  float64
		expected float64
	}{
		{
			name:     "same position",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 0, Y: 0},
			epsilon:  0.001,
			expected: 0,
		},
		{
			name:     "unit horizontal",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 1, Y: 0},
			epsilon:  0.001,
			expected: 1,
		},
		{
			name:     "unit vertical",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 0, Y: 1},
			epsilon:  0.001,
			expected: 1,
		},
		{
			name:     "3-4-5 triangle",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 3, Y: 4},
			epsilon:  0.01,
			expected: 5,
		},
		{
			name:     "5-12-13 triangle",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 5, Y: 12},
			epsilon:  0.01,
			expected: 13,
		},
		{
			name:     "diagonal unit square",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 1, Y: 1},
			epsilon:  0.01,
			expected: 1.414,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.p1.EuclideanDistance(tt.p2)
			diff := result - tt.expected
			if diff < 0 {
				diff = -diff
			}
			if diff > tt.epsilon {
				t.Errorf("EuclideanDistance() = %f, want %f (epsilon %f)", result, tt.expected, tt.epsilon)
			}
		})
	}
}

func TestPosition_Equals(t *testing.T) {
	tests := []struct {
		name     string
		p1       Position
		p2       Position
		expected bool
	}{
		{
			name:     "same positions",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 5, Y: 10},
			expected: true,
		},
		{
			name:     "different x coordinate",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 6, Y: 10},
			expected: false,
		},
		{
			name:     "different y coordinate",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 5, Y: 11},
			expected: false,
		},
		{
			name:     "both coordinates different",
			p1:       Position{X: 5, Y: 10},
			p2:       Position{X: 6, Y: 11},
			expected: false,
		},
		{
			name:     "zero positions",
			p1:       Position{X: 0, Y: 0},
			p2:       Position{X: 0, Y: 0},
			expected: true,
		},
		{
			name:     "negative coordinates equal",
			p1:       Position{X: -5, Y: -10},
			p2:       Position{X: -5, Y: -10},
			expected: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.p1.Equals(tt.p2)
			if result != tt.expected {
				t.Errorf("Equals() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSize_Contains(t *testing.T) {
	tests := []struct {
		name     string
		size     Size
		position Position
		expected bool
	}{
		{
			name:     "position within bounds",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 5, Y: 5},
			expected: true,
		},
		{
			name:     "position at origin",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 0, Y: 0},
			expected: true,
		},
		{
			name:     "position at max boundary (exclusive)",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 9, Y: 9},
			expected: true,
		},
		{
			name:     "position outside x boundary",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 10, Y: 5},
			expected: false,
		},
		{
			name:     "position outside y boundary",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 5, Y: 10},
			expected: false,
		},
		{
			name:     "negative x position",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: -1, Y: 5},
			expected: false,
		},
		{
			name:     "negative y position",
			size:     Size{Width: 10, Height: 10},
			position: Position{X: 5, Y: -1},
			expected: false,
		},
		{
			name:     "1x1 size contains only origin",
			size:     Size{Width: 1, Height: 1},
			position: Position{X: 0, Y: 0},
			expected: true,
		},
		{
			name:     "1x1 size does not contain (1,0)",
			size:     Size{Width: 1, Height: 1},
			position: Position{X: 1, Y: 0},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.size.Contains(tt.position)
			if result != tt.expected {
				t.Errorf("Contains() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestSize_Area(t *testing.T) {
	tests := []struct {
		name     string
		size     Size
		expected int
	}{
		{
			name:     "10x10 area",
			size:     Size{Width: 10, Height: 10},
			expected: 100,
		},
		{
			name:     "1x1 area",
			size:     Size{Width: 1, Height: 1},
			expected: 1,
		},
		{
			name:     "rectangular area",
			size:     Size{Width: 5, Height: 20},
			expected: 100,
		},
		{
			name:     "zero width",
			size:     Size{Width: 0, Height: 10},
			expected: 0,
		},
		{
			name:     "zero height",
			size:     Size{Width: 10, Height: 0},
			expected: 0,
		},
		{
			name:     "large area",
			size:     Size{Width: 100, Height: 100},
			expected: 10000,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.size.Area()
			if result != tt.expected {
				t.Errorf("Area() = %d, want %d", result, tt.expected)
			}
		})
	}
}

func TestSize_Valid(t *testing.T) {
	tests := []struct {
		name     string
		size     Size
		expected bool
	}{
		{
			name:     "positive dimensions",
			size:     Size{Width: 10, Height: 10},
			expected: true,
		},
		{
			name:     "minimum valid size",
			size:     Size{Width: 1, Height: 1},
			expected: true,
		},
		{
			name:     "zero width",
			size:     Size{Width: 0, Height: 10},
			expected: false,
		},
		{
			name:     "zero height",
			size:     Size{Width: 10, Height: 0},
			expected: false,
		},
		{
			name:     "both zero",
			size:     Size{Width: 0, Height: 0},
			expected: false,
		},
		{
			name:     "negative width",
			size:     Size{Width: -1, Height: 10},
			expected: false,
		},
		{
			name:     "negative height",
			size:     Size{Width: 10, Height: -1},
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.size.Valid()
			if result != tt.expected {
				t.Errorf("Valid() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestPosition_Serialization(t *testing.T) {
	t.Run("position serializes correctly", func(t *testing.T) {
		pos := Position{X: 5, Y: 10}

		data, err := json.Marshal(pos)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled Position
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if unmarshaled.X != pos.X {
			t.Errorf("X mismatch: got %d, want %d", unmarshaled.X, pos.X)
		}
		if unmarshaled.Y != pos.Y {
			t.Errorf("Y mismatch: got %d, want %d", unmarshaled.Y, pos.Y)
		}
	})

	t.Run("negative coordinates serialize", func(t *testing.T) {
		pos := Position{X: -5, Y: -10}

		data, err := json.Marshal(pos)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled Position
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if unmarshaled.X != pos.X {
			t.Errorf("X mismatch: got %d, want %d", unmarshaled.X, pos.X)
		}
		if unmarshaled.Y != pos.Y {
			t.Errorf("Y mismatch: got %d, want %d", unmarshaled.Y, pos.Y)
		}
	})
}

func TestSize_Serialization(t *testing.T) {
	t.Run("size serializes correctly", func(t *testing.T) {
		size := Size{Width: 800, Height: 600}

		data, err := json.Marshal(size)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled Size
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if unmarshaled.Width != size.Width {
			t.Errorf("Width mismatch: got %d, want %d", unmarshaled.Width, size.Width)
		}
		if unmarshaled.Height != size.Height {
			t.Errorf("Height mismatch: got %d, want %d", unmarshaled.Height, size.Height)
		}
	})
}

func TestPosition_Direction(t *testing.T) {
	t.Run("adding unit vectors for cardinal directions", func(t *testing.T) {
		pos := Position{X: 5, Y: 5}

		// North
		north := pos.Add(Position{X: 0, Y: -1})
		if north.X != 5 || north.Y != 4 {
			t.Errorf("North direction incorrect: got (%d, %d), want (5, 4)", north.X, north.Y)
		}

		// South
		south := pos.Add(Position{X: 0, Y: 1})
		if south.X != 5 || south.Y != 6 {
			t.Errorf("South direction incorrect: got (%d, %d), want (5, 6)", south.X, south.Y)
		}

		// East
		east := pos.Add(Position{X: 1, Y: 0})
		if east.X != 6 || east.Y != 5 {
			t.Errorf("East direction incorrect: got (%d, %d), want (6, 5)", east.X, east.Y)
		}

		// West
		west := pos.Add(Position{X: -1, Y: 0})
		if west.X != 4 || west.Y != 5 {
			t.Errorf("West direction incorrect: got (%d, %d), want (4, 5)", west.X, west.Y)
		}
	})
}
