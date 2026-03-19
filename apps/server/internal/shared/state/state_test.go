package state

import (
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

func TestNewGameState(t *testing.T) {
	t.Run("creates new game state", func(t *testing.T) {
		state := NewGameState("test-session")

		if state.SessionID != "test-session" {
			t.Errorf("Expected session ID 'test-session', got %s", state.SessionID)
		}
		if state.Phase != PhaseExploring {
			t.Errorf("Expected phase 'exploring', got %s", state.Phase)
		}
		if state.Party == nil {
			t.Errorf("Party should be initialized")
		}
		if state.Metadata == nil {
			t.Errorf("Metadata should be initialized")
		}
		if state.Metadata.CreatedAt == 0 {
			t.Errorf("CreatedAt should be set")
		}
	})

	t.Run("different sessions have different IDs", func(t *testing.T) {
		state1 := NewGameState("session-1")
		state2 := NewGameState("session-2")

		if state1.SessionID == state2.SessionID {
			t.Errorf("Different sessions should have different IDs")
		}
	})
}

func TestGamePhase(t *testing.T) {
	t.Run("phase constants are defined", func(t *testing.T) {
		phases := []GamePhase{
			PhaseExploring,
			PhaseCombat,
			PhaseDialog,
			PhaseResting,
		}

		expected := []GamePhase{
			"exploring",
			"combat",
			"dialog",
			"resting",
		}

		for i, phase := range phases {
			if phase != expected[i] {
				t.Errorf("Phase %d: expected %s, got %s", i, expected[i], phase)
			}
		}
	})
}

func TestGameState(t *testing.T) {
	t.Run("create game state with party", func(t *testing.T) {
		state := NewGameState("test-session")
		char := &models.Character{
			ID:    "char-1",
			Name:  "Test Hero",
			Race:  "Human",
			Class: "Fighter",
			Level: 1,
		}
		state.Party = append(state.Party, char)

		if len(state.Party) != 1 {
			t.Errorf("Expected 1 party member, got %d", len(state.Party))
		}
		if state.Party[0].Name != "Test Hero" {
			t.Errorf("Party member name mismatch")
		}
	})

	t.Run("game state with combat", func(t *testing.T) {
		state := NewGameState("test-session")
		state.Combat = &CombatState{
			Round:     1,
			TurnIndex: 0,
		}

		if state.Combat.Round != 1 {
			t.Errorf("Expected combat round 1")
		}
	})

	t.Run("game state with scenario", func(t *testing.T) {
		state := NewGameState("test-session")
		state.Scenario = &ScenarioState{
			Name:    "The Lost Mine",
			Chapter: "Chapter 1",
		}

		if state.Scenario.Name != "The Lost Mine" {
			t.Errorf("Scenario name mismatch")
		}
	})
}

func TestCombatState(t *testing.T) {
	t.Run("initiative entries", func(t *testing.T) {
		entries := []*InitiativeEntry{
			{CharacterID: "char-1", Initiative: 15, HasActed: false},
			{CharacterID: "char-2", Initiative: 12, HasActed: false},
			{CharacterID: "char-3", Initiative: 18, HasActed: false},
		}

		combat := &CombatState{
			Round:        1,
			TurnIndex:    0,
			Initiatives:  entries,
			Participants: []string{"char-1", "char-2", "char-3"},
		}

		if len(combat.Initiatives) != 3 {
			t.Errorf("Expected 3 initiative entries")
		}
		if combat.Participants[0] != "char-1" {
			t.Errorf("Participant mismatch")
		}
	})

	t.Run("active effects", func(t *testing.T) {
		effect := &ActiveEffect{
			ID:         "effect-1",
			Name:       "Bless",
			TargetID:   "char-1",
			Duration:   3,
			Conditions: []string{"advantage on saves"},
		}

		combat := &CombatState{
			Round:         1,
			ActiveEffects: []*ActiveEffect{effect},
		}

		if len(combat.ActiveEffects) != 1 {
			t.Errorf("Expected 1 active effect")
		}
		if combat.ActiveEffects[0].Name != "Bless" {
			t.Errorf("Effect name mismatch")
		}
	})
}

func TestScenarioState(t *testing.T) {
	t.Run("scenario with flags", func(t *testing.T) {
		scenario := &ScenarioState{
			Name:    "Test Campaign",
			Chapter: "Chapter 1",
			Flags: map[string]interface{}{
				"met_king":      true,
				"found_treasure": false,
				"gold_amount":   100,
			},
			NPCs: map[string]*NPCState{
				"npc-1": {
					ID:          "npc-1",
					Name:        "King Aldric",
					Location:    "throne_room",
					Disposition: "friendly",
				},
			},
		}

		if scenario.Name != "Test Campaign" {
			t.Errorf("Scenario name mismatch")
		}
		if len(scenario.NPCs) != 1 {
			t.Errorf("Expected 1 NPC")
		}
		if scenario.Flags["met_king"] != true {
			t.Errorf("Flag value mismatch")
		}
	})

	t.Run("locations", func(t *testing.T) {
		scenario := &ScenarioState{
			Locations: map[string]*Location{
				"loc-1": {
					ID:          "loc-1",
					Name:        "Throne Room",
					Description: "A grand hall with a golden throne",
					Position: &Position{
						X: 10,
						Y: 10,
					},
				},
			},
		}

		loc := scenario.Locations["loc-1"]
		if loc.Name != "Throne Room" {
			t.Errorf("Location name mismatch")
		}
		if loc.Position.X != 10 || loc.Position.Y != 10 {
			t.Errorf("Position mismatch")
		}
	})
}

func TestNPCState(t *testing.T) {
	t.Run("NPC with health", func(t *testing.T) {
		npc := &NPCState{
			ID:          "npc-1",
			Name:        "Goblin",
			Location:    "cave",
			Disposition: "hostile",
			Health:      10,
			MaxHealth:   10,
			Conditions:  []string{},
		}

		if npc.Health != 10 {
			t.Errorf("Expected health 10")
		}
		if npc.Disposition != "hostile" {
			t.Errorf("Expected hostile disposition")
		}
	})

	t.Run("NPC with conditions", func(t *testing.T) {
		npc := &NPCState{
			ID:         "npc-1",
			Name:       "Guard",
			Location:   "gate",
			Conditions: []string{"poisoned", "frightened"},
		}

		if len(npc.Conditions) != 2 {
			t.Errorf("Expected 2 conditions")
		}
	})
}

func TestPosition(t *testing.T) {
	t.Run("position creation", func(t *testing.T) {
		pos := &Position{
			X: 5,
			Y: 10,
		}

		if pos.X != 5 || pos.Y != 10 {
			t.Errorf("Position values mismatch")
		}
	})
}

func TestGameMetadata(t *testing.T) {
	t.Run("metadata creation", func(t *testing.T) {
		metadata := &GameMetadata{
			CreatedAt:    1234567890,
			UpdatedAt:    1234567890,
			LastActivity: 1234567890,
			DM:           "dm-user-1",
		}

		if metadata.DM != "dm-user-1" {
			t.Errorf("DM mismatch")
		}
	})
}

func TestStateError(t *testing.T) {
	t.Run("error creation", func(t *testing.T) {
		err := &StateError{
			Code:    "TEST_ERROR",
			Message: "This is a test error",
		}

		if err.Error() != "This is a test error" {
			t.Errorf("Error message mismatch")
		}
		if err.Code != "TEST_ERROR" {
			t.Errorf("Error code mismatch")
		}
	})

	t.Run("ErrSessionNotFound", func(t *testing.T) {
		if ErrSessionNotFound.Code != "SESSION_NOT_FOUND" {
			t.Errorf("Session not found error code mismatch")
		}
		if ErrSessionNotFound.Message != "session not found" {
			t.Errorf("Session not found message mismatch")
		}
	})
}
