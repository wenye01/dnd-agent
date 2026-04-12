package spell

import (
	"fmt"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

func TestSlotManager_GetSpellSlots(t *testing.T) {
	sm := NewSlotManager()

	t.Run("returns empty map when no slots", func(t *testing.T) {
		char := &models.Character{ID: "test"}
		slots := sm.GetSpellSlots(char)
		if len(slots) != 0 {
			t.Errorf("expected empty slots, got %v", slots)
		}
	})

	t.Run("returns copy of slots", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 3, 2: 2},
		}
		slots := sm.GetSpellSlots(char)
		slots[1] = 0 // Modify returned copy.

		if char.SpellSlots[1] != 3 {
			t.Error("modifying returned map should not affect character")
		}
	})
}

func TestSlotManager_GetMaxSpellSlots(t *testing.T) {
	sm := NewSlotManager()

	tests := []struct {
		name       string
		class      string
		level      int
		wantMax    map[int]int
	}{
		{
			name:    "wizard level 1",
			class:   "wizard",
			level:   1,
			wantMax: map[int]int{1: 2},
		},
		{
			name:    "wizard level 5",
			class:   "wizard",
			level:   5,
			wantMax: map[int]int{1: 4, 2: 3, 3: 2},
		},
		{
			name:    "wizard level 20",
			class:   "wizard",
			level:   20,
			wantMax: map[int]int{1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 2, 7: 2, 8: 1, 9: 1},
		},
		{
			name:    "cleric level 3",
			class:   "cleric",
			level:   3,
			wantMax: map[int]int{1: 4, 2: 2},
		},
		{
			name:    "paladin level 2",
			class:   "paladin",
			level:   2,
			wantMax: map[int]int{1: 2},
		},
		{
			name:    "paladin level 5",
			class:   "paladin",
			level:   5,
			wantMax: map[int]int{1: 4, 2: 2},
		},
		{
			name:    "ranger level 2",
			class:   "ranger",
			level:   2,
			wantMax: map[int]int{1: 2},
		},
		{
			name:    "fighter level 5 (non-caster)",
			class:   "fighter",
			level:   5,
			wantMax: map[int]int{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			char := &models.Character{Class: tt.class, Level: tt.level}
			maxSlots := sm.GetMaxSpellSlots(char)
			if len(maxSlots) != len(tt.wantMax) {
				t.Errorf("expected %d slot levels, got %d: %v", len(tt.wantMax), len(maxSlots), maxSlots)
			}
			for level, count := range tt.wantMax {
				if maxSlots[level] != count {
					t.Errorf("level %d: expected %d slots, got %d", level, count, maxSlots[level])
				}
			}
		})
	}
}

func TestSlotManager_ConsumeSlot(t *testing.T) {
	sm := NewSlotManager()

	t.Run("cantrip does not consume slot", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 2},
		}
		err := sm.ConsumeSlot(char, 0)
		if err != nil {
			t.Errorf("cantrip should not error: %v", err)
		}
		if char.SpellSlots[1] != 2 {
			t.Error("cantrip should not consume a slot")
		}
	})

	t.Run("consumes slot correctly", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 3},
		}
		err := sm.ConsumeSlot(char, 1)
		if err != nil {
			t.Errorf("unexpected error: %v", err)
		}
		if char.SpellSlots[1] != 2 {
			t.Errorf("expected 2 remaining, got %d", char.SpellSlots[1])
		}
	})

	t.Run("errors when no slots available", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 0},
		}
		err := sm.ConsumeSlot(char, 1)
		if err == nil {
			t.Error("expected error when no slots available")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrNoAvailableSlot {
			t.Errorf("expected NO_SPELL_SLOT error, got %v", err)
		}
	})

	t.Run("errors when level exceeds max", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{},
		}
		err := sm.ConsumeSlot(char, 10)
		if err == nil {
			t.Error("expected error for invalid slot level")
		}
	})

	t.Run("errors when no slot at level", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 2},
		}
		err := sm.ConsumeSlot(char, 3)
		if err == nil {
			t.Error("expected error for missing slot level")
		}
	})
}

func TestSlotManager_RestoreAllSlots(t *testing.T) {
	sm := NewSlotManager()

	t.Run("restores all slots to max", func(t *testing.T) {
		char := &models.Character{
			Class:  "wizard",
			Level:  5,
			SpellSlots: map[int]int{1: 0, 2: 1, 3: 0},
		}
		sm.RestoreAllSlots(char)

		maxSlots := sm.GetMaxSpellSlots(char)
		for level, count := range maxSlots {
			if char.SpellSlots[level] != count {
				t.Errorf("level %d: expected %d, got %d", level, count, char.SpellSlots[level])
			}
		}
	})

	t.Run("non-caster gets nil slots", func(t *testing.T) {
		char := &models.Character{
			Class:  "fighter",
			Level:  5,
			SpellSlots: map[int]int{},
		}
		sm.RestoreAllSlots(char)
		if char.SpellSlots != nil {
			t.Error("non-caster should have nil spell slots after restore")
		}
	})
}

func TestSlotManager_HasAvailableSlot(t *testing.T) {
	sm := NewSlotManager()

	t.Run("cantrip always returns true", func(t *testing.T) {
		char := &models.Character{ID: "test"}
		if !sm.HasAvailableSlot(char, 0) {
			t.Error("cantrip should always be available")
		}
	})

	t.Run("returns true when slots available", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 2},
		}
		if !sm.HasAvailableSlot(char, 1) {
			t.Error("should have available slot")
		}
	})

	t.Run("returns false when no slots", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 0},
		}
		if sm.HasAvailableSlot(char, 1) {
			t.Error("should not have available slot")
		}
	})

	t.Run("returns false when nil map", func(t *testing.T) {
		char := &models.Character{ID: "test"}
		if sm.HasAvailableSlot(char, 1) {
			t.Error("should not have available slot with nil map")
		}
	})
}

func TestSlotManager_InitSpellSlots(t *testing.T) {
	sm := NewSlotManager()

	t.Run("initializes wizard level 3", func(t *testing.T) {
		char := &models.Character{Class: "wizard", Level: 3}
		sm.InitSpellSlots(char)

		expected := map[int]int{1: 4, 2: 2}
		if len(char.SpellSlots) != len(expected) {
			t.Errorf("expected %d slot levels, got %d", len(expected), len(char.SpellSlots))
		}
		for level, count := range expected {
			if char.SpellSlots[level] != count {
				t.Errorf("level %d: expected %d, got %d", level, count, char.SpellSlots[level])
			}
		}
	})

	t.Run("non-caster gets no slots", func(t *testing.T) {
		char := &models.Character{Class: "fighter", Level: 5}
		sm.InitSpellSlots(char)
		if char.SpellSlots != nil {
			t.Errorf("non-caster should have nil spell slots, got %v", char.SpellSlots)
		}
	})
}

func TestSlotManager_ConsumeSlot_AllLevels(t *testing.T) {
	sm := NewSlotManager()

	t.Run("consume multiple levels sequentially", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 4, 2: 3, 3: 2},
		}

		// Consume a level 1 slot.
		if err := sm.ConsumeSlot(char, 1); err != nil {
			t.Fatalf("consume level 1: %v", err)
		}
		if char.SpellSlots[1] != 3 {
			t.Errorf("expected 3 level-1 slots, got %d", char.SpellSlots[1])
		}

		// Consume a level 3 slot.
		if err := sm.ConsumeSlot(char, 3); err != nil {
			t.Fatalf("consume level 3: %v", err)
		}
		if char.SpellSlots[3] != 1 {
			t.Errorf("expected 1 level-3 slot, got %d", char.SpellSlots[3])
		}

		// Level 2 should be untouched.
		if char.SpellSlots[2] != 3 {
			t.Errorf("expected 3 level-2 slots (untouched), got %d", char.SpellSlots[2])
		}
	})

	t.Run("consume all slots of a level then fail", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 2},
		}

		sm.ConsumeSlot(char, 1)
		sm.ConsumeSlot(char, 1)

		err := sm.ConsumeSlot(char, 1)
		if err == nil {
			t.Error("expected error when all slots consumed")
		}
		se, ok := err.(*SpellError)
		if !ok || se.Code != ErrNoAvailableSlot {
			t.Errorf("expected NO_SPELL_SLOT, got %v", err)
		}
	})

	t.Run("negative level does not consume slot", func(t *testing.T) {
		char := &models.Character{
			ID:         "test",
			SpellSlots: map[int]int{1: 2},
		}
		err := sm.ConsumeSlot(char, -1)
		if err != nil {
			t.Errorf("negative level should not error: %v", err)
		}
		if char.SpellSlots[1] != 2 {
			t.Error("negative level should not consume slot")
		}
	})
}

func TestSlotManager_GetMaxSpellSlots_AllFullCasterLevels(t *testing.T) {
	sm := NewSlotManager()

	tests := []struct {
		class     string
		level     int
		wantCount int // Number of slot levels expected
	}{
		{"wizard", 1, 1},
		{"wizard", 3, 2},
		{"wizard", 5, 3},
		{"wizard", 9, 5},
		{"wizard", 11, 6},
		{"wizard", 13, 7},
		{"wizard", 15, 8},
		{"wizard", 17, 9},
		{"wizard", 20, 9},
	}

	for _, tt := range tests {
		t.Run(fmt.Sprintf("%s_level_%d", tt.class, tt.level), func(t *testing.T) {
			char := &models.Character{Class: tt.class, Level: tt.level}
			maxSlots := sm.GetMaxSpellSlots(char)
			if len(maxSlots) != tt.wantCount {
				t.Errorf("expected %d slot levels for %s level %d, got %d: %v",
					tt.wantCount, tt.class, tt.level, len(maxSlots), maxSlots)
			}
		})
	}
}

func TestSlotManager_RestoreAllSlots_PartiallyUsed(t *testing.T) {
	sm := NewSlotManager()

	t.Run("restores partially used slots", func(t *testing.T) {
		char := &models.Character{
			Class:      "wizard",
			Level:      9,
			SpellSlots: map[int]int{1: 1, 2: 0, 3: 1, 4: 0, 5: 0},
		}

		sm.RestoreAllSlots(char)

		expected := map[int]int{1: 4, 2: 3, 3: 3, 4: 3, 5: 1}
		for level, expectedCount := range expected {
			if char.SpellSlots[level] != expectedCount {
				t.Errorf("level %d: expected %d, got %d", level, expectedCount, char.SpellSlots[level])
			}
		}
	})
}
