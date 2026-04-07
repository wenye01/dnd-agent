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
			ID:        "char-1",
			Name:      "Test Hero",
			Race:      "human",
			Class:     "fighter",
			Level:     1,
			HP:        10,
			MaxHP:     10,
			AC:        15,
			Stats:     models.AbilityScores{Strength: 16, Dexterity: 12, Constitution: 14, Intelligence: 10, Wisdom: 10, Charisma: 10},
			Skills:    make(map[types.Skill]bool),
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
			Participants: []*Combatant{
				{ID: "char-1", Name: "Hero 1", Type: CombatantPlayer, MaxHP: 10, CurrentHP: 10, AC: 15},
				{ID: "char-2", Name: "Hero 2", Type: CombatantPlayer, MaxHP: 6, CurrentHP: 6, AC: 10},
				{ID: "enemy-1", Name: "Goblin", Type: CombatantEnemy, MaxHP: 7, CurrentHP: 7, AC: 12},
			},
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
				"goblin_king_defeated":  true,
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
			Participants: []*Combatant{
				{ID: "char-1", Name: "Hero 1", Type: CombatantPlayer, MaxHP: 10, CurrentHP: 10, AC: 15},
			},
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

// ===========================================================================
// Combatant.Validate tests
// ===========================================================================

func TestCombatant_Validate(t *testing.T) {
	t.Run("valid combatant", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 15,
			AC:        16,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 10},
		}
		if err := c.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("missing ID", func(t *testing.T) {
		c := &Combatant{
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 15,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for missing ID")
		}
	})

	t.Run("missing Name", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 15,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for missing Name")
		}
	})

	t.Run("negative MaxHP", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     -5,
			CurrentHP: 0,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for negative MaxHP")
		}
	})

	t.Run("zero MaxHP is valid", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Dead Hero",
			Type:      CombatantPlayer,
			MaxHP:     0,
			CurrentHP: 0,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
		}
		if err := c.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil for zero MaxHP", err)
		}
	})

	t.Run("invalid hit dice propagates error", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 15,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 10, Size: 8}, // current > total
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for invalid hit dice")
		}
	})

	t.Run("invalid death saves propagates error", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 0,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
			DeathSaves: &models.DeathSaves{
				Successes: 5, // exceeds max of 3
			},
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for invalid death saves")
		}
	})

	t.Run("nil death saves is valid", func(t *testing.T) {
		c := &Combatant{
			ID:        "enemy-1",
			Name:      "Goblin",
			Type:      CombatantEnemy,
			MaxHP:     7,
			CurrentHP: 7,
			HitDice:   models.HitDiceInfo{Total: 1, Current: 1, Size: 6},
		}
		if err := c.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("invalid condition propagates error", func(t *testing.T) {
		c := &Combatant{
			ID:        "player-1",
			Name:      "Hero",
			Type:      CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 15,
			HitDice:   models.HitDiceInfo{Total: 5, Current: 3, Size: 8},
			Conditions: []*ConditionEntry{
				{Condition: types.Condition("not_a_condition"), Duration: 0, Remaining: 0},
			},
		}
		if err := c.Validate(); err == nil {
			t.Error("Validate() should return error for invalid condition")
		}
	})
}

// ===========================================================================
// ConditionEntry.Validate tests
// ===========================================================================

func TestConditionEntry_Validate(t *testing.T) {
	t.Run("valid indefinite condition", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.ConditionBlinded,
			Source:    "spell",
			Duration:  0,
			Remaining: 0,
		}
		if err := ce.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("valid timed condition", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.ConditionPoisoned,
			Source:    "trap",
			Duration:  3,
			Remaining: 2,
		}
		if err := ce.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("invalid condition string", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.Condition("confused"),
			Duration:  0,
			Remaining: 0,
		}
		if err := ce.Validate(); err == nil {
			t.Error("Validate() should return error for invalid condition")
		}
	})

	t.Run("empty condition string", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.Condition(""),
			Duration:  0,
			Remaining: 0,
		}
		if err := ce.Validate(); err == nil {
			t.Error("Validate() should return error for empty condition")
		}
	})

	t.Run("negative remaining duration for timed condition", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.ConditionBlinded,
			Duration:  3,
			Remaining: -1,
		}
		if err := ce.Validate(); err == nil {
			t.Error("Validate() should return error for negative remaining duration on timed condition")
		}
	})

	t.Run("zero remaining is valid for indefinite", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.ConditionProne,
			Duration:  0,
			Remaining: 0,
		}
		if err := ce.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})

	t.Run("exhaustion condition is valid", func(t *testing.T) {
		ce := &ConditionEntry{
			Condition: types.ConditionExhaustion,
			Duration:  0,
			Remaining: 0,
			Level:     2,
		}
		if err := ce.Validate(); err != nil {
			t.Errorf("Validate() error = %v, want nil", err)
		}
	})
}

// ===========================================================================
// CombatStatus constant tests
// ===========================================================================

func TestCombatStatus_Constants(t *testing.T) {
	tests := []struct {
		name     string
		status   CombatStatus
		expected string
	}{
		{"idle", CombatIdle, "idle"},
		{"active", CombatActive, "active"},
		{"ended", CombatEnded, "ended"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.status) != tt.expected {
				t.Errorf("CombatStatus = %q, want %q", tt.status, tt.expected)
			}
		})
	}

	t.Run("all three statuses are distinct", func(t *testing.T) {
		statuses := map[CombatStatus]bool{
			CombatIdle:   true,
			CombatActive: true,
			CombatEnded:  true,
		}
		if len(statuses) != 3 {
			t.Errorf("Expected 3 distinct combat statuses, got %d", len(statuses))
		}
	})
}

// ===========================================================================
// CombatantType constant tests
// ===========================================================================

func TestCombatantType_Constants(t *testing.T) {
	tests := []struct {
		name         string
		combatantType CombatantType
		expected     string
	}{
		{"player", CombatantPlayer, "player"},
		{"npc", CombatantNPC, "npc"},
		{"enemy", CombatantEnemy, "enemy"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if string(tt.combatantType) != tt.expected {
				t.Errorf("CombatantType = %q, want %q", tt.combatantType, tt.expected)
			}
		})
	}

	t.Run("all three types are distinct", func(t *testing.T) {
		types := map[CombatantType]bool{
			CombatantPlayer: true,
			CombatantNPC:    true,
			CombatantEnemy:  true,
		}
		if len(types) != 3 {
			t.Errorf("Expected 3 distinct combatant types, got %d", len(types))
		}
	})
}
