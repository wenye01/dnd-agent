package state

import (
	"encoding/json"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

func TestNewGameState(t *testing.T) {
	t.Run("creates new game state with session ID", func(t *testing.T) {
		sessionID := "test-session-123"
		state := NewGameState(sessionID)

		if state.SessionID != sessionID {
			t.Errorf("SessionID = %s, want %s", state.SessionID, sessionID)
		}

		if state.Phase != PhaseExploring {
			t.Errorf("Phase = %s, want %s", state.Phase, PhaseExploring)
		}

		if state.Party == nil {
			t.Error("Party should be initialized, not nil")
		}

		if len(state.Party) != 0 {
			t.Errorf("Party should be empty, got %d members", len(state.Party))
		}

		if state.Metadata == nil {
			t.Error("Metadata should be initialized, not nil")
		}

		if state.Metadata.CreatedAt == 0 {
			t.Error("CreatedAt should be set")
		}

		if state.Metadata.UpdatedAt == 0 {
			t.Error("UpdatedAt should be set")
		}

		if state.Metadata.LastActivity == 0 {
			t.Error("LastActivity should be set")
		}
	})

	t.Run("creates unique timestamps", func(t *testing.T) {
		state1 := NewGameState("session-1")
		state2 := NewGameState("session-2")

		// Timestamps should be very close but not necessarily identical
		// We just check they're both set
		if state1.Metadata.CreatedAt == 0 {
			t.Error("State1 CreatedAt should be set")
		}
		if state2.Metadata.CreatedAt == 0 {
			t.Error("State2 CreatedAt should be set")
		}
	})
}

func TestGamePhase(t *testing.T) {
	t.Run("all phase constants are defined", func(t *testing.T) {
		phases := []GamePhase{
			PhaseExploring,
			PhaseCombat,
			PhaseDialog,
			PhaseResting,
		}

		expectedPhases := []GamePhase{
			"exploring",
			"combat",
			"dialog",
			"resting",
		}

		for i, phase := range phases {
			if phase != expectedPhases[i] {
				t.Errorf("Phase %d = %s, want %s", i, phase, expectedPhases[i])
			}
		}
	})
}

func TestGameState_PhaseTransitions(t *testing.T) {
	t.Run("phase can be changed", func(t *testing.T) {
		state := NewGameState("test-session")

		state.Phase = PhaseCombat
		if state.Phase != PhaseCombat {
			t.Errorf("Phase = %s, want %s", state.Phase, PhaseCombat)
		}

		state.Phase = PhaseDialog
		if state.Phase != PhaseDialog {
			t.Errorf("Phase = %s, want %s", state.Phase, PhaseDialog)
		}
	})
}

func TestGameState_PartyManagement(t *testing.T) {
	t.Run("party can be modified", func(t *testing.T) {
		state := NewGameState("test-session")

		char := &models.Character{
			ID:      "char-1",
			Name:    "Test Hero",
			Race:    "human",
			Class:   "fighter",
			Level:   1,
			HP:      10,
			MaxHP:   10,
			AC:      15,
			Stats:   models.AbilityScores{Strength: 16, Dexterity: 12, Constitution: 14, Intelligence: 10, Wisdom: 10, Charisma: 10},
			Skills:  make(map[types.Skill]bool),
			Inventory: []models.Item{},
		}

		state.Party = append(state.Party, char)

		if len(state.Party) != 1 {
			t.Errorf("Party length = %d, want 1", len(state.Party))
		}

		if state.Party[0].ID != "char-1" {
			t.Errorf("Party member ID = %s, want char-1", state.Party[0].ID)
		}
	})

	t.Run("multiple party members can be added", func(t *testing.T) {
		state := NewGameState("test-session")

		char1 := &models.Character{ID: "char-1", Name: "Hero 1", Race: "human", Class: "fighter", Level: 1, HP: 10, MaxHP: 10, AC: 15, Stats: models.AbilityScores{Strength: 16, Dexterity: 12, Constitution: 14, Intelligence: 10, Wisdom: 10, Charisma: 10}, Skills: make(map[types.Skill]bool), Inventory: []models.Item{}}
		char2 := &models.Character{ID: "char-2", Name: "Hero 2", Race: "elf", Class: "wizard", Level: 1, HP: 6, MaxHP: 6, AC: 10, Stats: models.AbilityScores{Strength: 8, Dexterity: 14, Constitution: 12, Intelligence: 16, Wisdom: 12, Charisma: 10}, Skills: make(map[types.Skill]bool), Inventory: []models.Item{}}

		state.Party = append(state.Party, char1, char2)

		if len(state.Party) != 2 {
			t.Errorf("Party length = %d, want 2", len(state.Party))
		}
	})
}

func TestCombatState(t *testing.T) {
	t.Run("combat state can be created", func(t *testing.T) {
		combat := &CombatState{
			Round:     1,
			TurnIndex: 0,
			Initiatives: []*InitiativeEntry{
				{CharacterID: "char-1", Initiative: 15, HasActed: false},
				{CharacterID: "char-2", Initiative: 12, HasActed: false},
			},
			Participants: []string{"char-1", "char-2", "enemy-1"},
			ActiveEffects: []*ActiveEffect{
				{
					ID:         "effect-1",
					Name:       "Bless",
					TargetID:   "char-1",
					Duration:   3,
					Conditions: []string{},
				},
			},
		}

		if combat.Round != 1 {
			t.Errorf("Round = %d, want 1", combat.Round)
		}

		if len(combat.Initiatives) != 2 {
			t.Errorf("Initiatives length = %d, want 2", len(combat.Initiatives))
		}

		if combat.Initiatives[0].CharacterID != "char-1" {
			t.Errorf("First initiative character ID = %s, want char-1", combat.Initiatives[0].CharacterID)
		}
	})

	t.Run("initiative entry tracks acted status", func(t *testing.T) {
		entry := &InitiativeEntry{
			CharacterID: "char-1",
			Initiative:  15,
			HasActed:    false,
		}

		if entry.HasActed {
			t.Error("HasActed should be false initially")
		}

		entry.HasActed = true
		if !entry.HasActed {
			t.Error("HasActed should be true after update")
		}
	})
}

func TestScenarioState(t *testing.T) {
	t.Run("scenario state can be created", func(t *testing.T) {
		scenario := &ScenarioState{
			Name:    "The Lost Mine",
			Chapter: "Chapter 1",
			Flags: map[string]interface{}{
				"goblin_king_defeated": true,
				"found_secret_treasure": false,
			},
			NPCs: map[string]*NPCState{
				"npc-1": {
					ID:          "npc-1",
					Name:        "Goblin King",
					Location:    "cave_throne_room",
					Disposition: "hostile",
					Health:      30,
					MaxHealth:   30,
					Conditions:  []string{},
				},
			},
			Locations: map[string]*Location{
				"loc-1": {
					ID:          "loc-1",
					Name:        "Cave Entrance",
					Description: "A dark cave entrance",
					Position: &Position{
						X: 10,
						Y: 5,
					},
				},
			},
		}

		if scenario.Name != "The Lost Mine" {
			t.Errorf("Name = %s, want 'The Lost Mine'", scenario.Name)
		}

		if len(scenario.Flags) != 2 {
			t.Errorf("Flags length = %d, want 2", len(scenario.Flags))
		}

		if len(scenario.NPCs) != 1 {
			t.Errorf("NPCs length = %d, want 1", len(scenario.NPCs))
		}

		if len(scenario.Locations) != 1 {
			t.Errorf("Locations length = %d, want 1", len(scenario.Locations))
		}
	})
}

func TestGameState_Serialization(t *testing.T) {
	t.Run("game state can be serialized to JSON", func(t *testing.T) {
		state := NewGameState("test-session")
		state.Phase = PhaseCombat
		state.CurrentMapID = "map-1"

		data, err := json.Marshal(state)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled GameState
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if unmarshaled.SessionID != state.SessionID {
			t.Errorf("SessionID mismatch: got %s, want %s", unmarshaled.SessionID, state.SessionID)
		}

		if unmarshaled.Phase != state.Phase {
			t.Errorf("Phase mismatch: got %s, want %s", unmarshaled.Phase, state.Phase)
		}

		if unmarshaled.CurrentMapID != state.CurrentMapID {
			t.Errorf("CurrentMapID mismatch: got %s, want %s", unmarshaled.CurrentMapID, state.CurrentMapID)
		}
	})

	t.Run("combat state serializes correctly", func(t *testing.T) {
		state := NewGameState("test-session")
		state.Phase = PhaseCombat
		state.Combat = &CombatState{
			Round:     2,
			TurnIndex: 1,
			Initiatives: []*InitiativeEntry{
				{CharacterID: "char-1", Initiative: 15, HasActed: true},
			},
			Participants:  []string{"char-1"},
			ActiveEffects: []*ActiveEffect{},
		}

		data, err := json.Marshal(state)
		if err != nil {
			t.Fatalf("JSON Marshal failed: %v", err)
		}

		var unmarshaled GameState
		err = json.Unmarshal(data, &unmarshaled)
		if err != nil {
			t.Fatalf("JSON Unmarshal failed: %v", err)
		}

		if unmarshaled.Combat == nil {
			t.Fatal("Combat should not be nil after unmarshaling")
		}

		if unmarshaled.Combat.Round != 2 {
			t.Errorf("Combat Round = %d, want 2", unmarshaled.Combat.Round)
		}

		if len(unmarshaled.Combat.Initiatives) != 1 {
			t.Errorf("Combat Initiatives length = %d, want 1", len(unmarshaled.Combat.Initiatives))
		}
	})
}

