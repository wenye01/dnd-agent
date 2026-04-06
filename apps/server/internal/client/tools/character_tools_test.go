package tools

import (
	"encoding/json"
	"strings"
	"sync"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// containsSubstring checks if s contains substr (case-insensitive helper for tests).
func containsSubstring(s, substr string) bool {
	return strings.Contains(s, substr)
}

// mockStateProvider implements CharacterStateProvider for testing.
type mockStateProvider struct {
	mu       sync.RWMutex
	sessions map[string]*state.GameState
}

func newMockStateProvider() *mockStateProvider {
	return &mockStateProvider{
		sessions: make(map[string]*state.GameState),
	}
}

func (m *mockStateProvider) createSession(sessionID string) *state.GameState {
	m.mu.Lock()
	defer m.mu.Unlock()
	gs := state.NewGameState(sessionID)
	m.sessions[sessionID] = gs
	return gs
}

func (m *mockStateProvider) GetGameState(sessionID string) *state.GameState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[sessionID]
}

func (m *mockStateProvider) UpdateGameState(sessionID string, updateFn func(*state.GameState)) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	gs, ok := m.sessions[sessionID]
	if !ok {
		return state.ErrSessionNotFound
	}
	updateFn(gs)
	return nil
}

// helper to register tools and get a registry + mock provider pair.
func setupTestRegistry() (*Registry, *mockStateProvider) {
	registry := NewRegistry()
	provider := newMockStateProvider()
	RegisterCharacterTools(registry, provider)
	return registry, provider
}

// helper to create a base character creation argument map.
func baseCreateArgs() map[string]interface{} {
	return map[string]interface{}{
		"session_id": "test-session",
		"name":       "TestHero",
		"race":       "human",
		"class":      "fighter",
		"background": "soldier",
		"ability_scores": map[string]interface{}{
			"str": float64(16), "dex": float64(14), "con": float64(12),
			"int": float64(10), "wis": float64(10), "cha": float64(10),
		},
	}
}

// ---------------------------------------------------------------------------
// Tool Registration Tests
// ---------------------------------------------------------------------------

func TestRegisterCharacterTools_AllToolsRegistered(t *testing.T) {
	registry, _ := setupTestRegistry()

	expectedTools := []string{
		"create_character",
		"get_character",
		"update_character",
		"add_to_inventory",
		"level_up",
	}

	for _, name := range expectedTools {
		_, ok := registry.Get(name)
		if !ok {
			t.Errorf("Expected tool %q to be registered", name)
		}
	}
}

func TestRegisterCharacterTools_ToolCount(t *testing.T) {
	registry, _ := setupTestRegistry()
	tools := registry.List()
	// Only character tools (dice tools are not registered in setupTestRegistry)
	charToolCount := 0
	for _, tool := range tools {
		switch tool.Name {
		case "create_character", "get_character", "update_character", "add_to_inventory", "level_up":
			charToolCount++
		}
	}
	if charToolCount != 5 {
		t.Errorf("Expected 5 character tools, found %d", charToolCount)
	}
}

func TestRegisterCharacterTools_InputSchemas(t *testing.T) {
	registry, _ := setupTestRegistry()

	tests := []struct {
		name             string
		requiredFields   []string
	}{
		{"create_character", []string{"session_id", "name", "race", "class", "background", "ability_scores"}},
		{"get_character", []string{"session_id", "character_id"}},
		{"update_character", []string{"session_id", "character_id"}},
		{"add_to_inventory", []string{"session_id", "character_id", "item_name"}},
		{"level_up", []string{"session_id", "character_id"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			tool, ok := registry.Get(tt.name)
			if !ok {
				t.Fatalf("Tool %q not found", tt.name)
			}

			schema, ok := tool.InputSchema["required"].([]string)
			if !ok {
				// InputSchema uses map[string]interface{}, required may be []interface{}
				rawRequired, ok := tool.InputSchema["required"]
				if !ok {
					t.Fatalf("No 'required' field in input schema for %s", tt.name)
				}
				requiredSlice, ok := rawRequired.([]string)
				if !ok {
					t.Fatalf("Cannot cast 'required' to []string for %s", tt.name)
				}
				schema = requiredSlice
			}

			for _, req := range tt.requiredFields {
				found := false
				for _, s := range schema {
					if s == req {
						found = true
						break
					}
				}
				if !found {
					t.Errorf("Required field %q not found in schema for %s", req, tt.name)
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// create_character Tests
// ---------------------------------------------------------------------------

func TestCreateCharacterTool_Success(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")
	result, err := tool.Handler(baseCreateArgs())
	if err != nil {
		t.Fatalf("create_character failed: %v", err)
	}

	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatal("Result is not a map")
	}

	if success, _ := resultMap["success"].(bool); !success {
		t.Error("Expected success to be true")
	}

	char, ok := resultMap["character"].(*models.Character)
	if !ok {
		t.Fatal("Character is not a *models.Character")
	}

	if char.Name != "TestHero" {
		t.Errorf("Expected name TestHero, got %s", char.Name)
	}
	if char.Race != "human" {
		t.Errorf("Expected race human, got %s", char.Race)
	}
	if char.Class != "fighter" {
		t.Errorf("Expected class fighter, got %s", char.Class)
	}
	if partySize, _ := resultMap["party_size"].(int); partySize != 1 {
		t.Errorf("Expected party_size 1, got %d", partySize)
	}

	// Verify character was added to the party
	gs := provider.GetGameState("test-session")
	if len(gs.Party) != 1 {
		t.Fatalf("Expected 1 party member, got %d", len(gs.Party))
	}
	if gs.Party[0].ID != char.ID {
		t.Error("Party member ID does not match created character ID")
	}
}

func TestCreateCharacterTool_MissingSessionID(t *testing.T) {
	registry, _ := setupTestRegistry()

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	args["session_id"] = ""

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for missing session_id")
	}
}

func TestCreateCharacterTool_MissingAbilityScores(t *testing.T) {
	registry, _ := setupTestRegistry()

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	delete(args, "ability_scores")

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for missing ability_scores")
	}
}

func TestCreateCharacterTool_InvalidRace(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	args["race"] = "invalid_race"

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for invalid race")
	}
}

func TestCreateCharacterTool_InvalidClass(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	args["class"] = "invalid_class"

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for invalid class")
	}
}

func TestCreateCharacterTool_AllNewRaces(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")

	races := []string{"human", "elf", "dwarf", "halfling", "dragonborn", "gnome", "half-elf", "half-orc", "tiefling"}
	for _, race := range races {
		t.Run(race, func(t *testing.T) {
			args := baseCreateArgs()
			args["name"] = "Test_" + race
			args["race"] = race
			result, err := tool.Handler(args)
			if err != nil {
				t.Fatalf("Failed for race %s: %v", race, err)
			}
			char := result.(map[string]interface{})["character"].(*models.Character)
			if char.Race != race {
				t.Errorf("Expected race %s, got %s", race, char.Race)
			}
		})
	}
}

func TestCreateCharacterTool_AllNewClasses(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")

	classes := []string{"fighter", "wizard", "rogue", "cleric", "bard", "druid", "monk", "paladin", "ranger", "sorcerer", "warlock"}
	for _, class := range classes {
		t.Run(class, func(t *testing.T) {
			args := baseCreateArgs()
			args["name"] = "Test_" + class
			args["class"] = class
			result, err := tool.Handler(args)
			if err != nil {
				t.Fatalf("Failed for class %s: %v", class, err)
			}
			char := result.(map[string]interface{})["character"].(*models.Character)
			if char.Class != class {
				t.Errorf("Expected class %s, got %s", class, char.Class)
			}
		})
	}
}

func TestCreateCharacterTool_WithSkillChoices(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	args["skill_choices"] = []interface{}{"perception", "survival"}

	result, err := tool.Handler(args)
	if err != nil {
		t.Fatalf("create_character with skill_choices failed: %v", err)
	}

	char := result.(map[string]interface{})["character"].(*models.Character)
	if !char.Skills[types.Perception] {
		t.Error("Expected Perception skill proficiency")
	}
	if !char.Skills[types.Survival] {
		t.Error("Expected Survival skill proficiency")
	}
}

func TestCreateCharacterTool_SessionNotFound(t *testing.T) {
	registry, _ := setupTestRegistry()

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	// Do not create a session -- provider has no session

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for non-existent session")
	}
}

func TestCreateCharacterTool_MultipleCharactersInParty(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")

	// Create first character
	args1 := baseCreateArgs()
	args1["name"] = "Hero1"
	result1, err := tool.Handler(args1)
	if err != nil {
		t.Fatalf("First create failed: %v", err)
	}

	// Create second character
	args2 := baseCreateArgs()
	args2["name"] = "Hero2"
	args2["race"] = "elf"
	args2["class"] = "wizard"
	result2, err := tool.Handler(args2)
	if err != nil {
		t.Fatalf("Second create failed: %v", err)
	}

	char1 := result1.(map[string]interface{})["character"].(*models.Character)
	char2 := result2.(map[string]interface{})["character"].(*models.Character)

	if char1.ID == char2.ID {
		t.Error("Two characters should have different IDs")
	}

	gs := provider.GetGameState("test-session")
	if len(gs.Party) != 2 {
		t.Errorf("Expected 2 party members, got %d", len(gs.Party))
	}
}

func TestCreateCharacterTool_TooManyExtraAbilityBonuses(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")
	args := baseCreateArgs()
	args["extra_ability_bonuses"] = []interface{}{"str", "dex", "cha"}

	_, err := tool.Handler(args)
	if err == nil {
		t.Error("Expected error for more than 2 extra_ability_bonuses")
	}
	if err != nil && !containsSubstring(err.Error(), "extra_ability_bonuses") {
		t.Errorf("Expected error message to mention extra_ability_bonuses, got: %v", err)
	}
}

func TestCreateCharacterTool_DuplicateName(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tool, _ := registry.Get("create_character")

	// Create first character
	args1 := baseCreateArgs()
	args1["name"] = "DupHero"
	_, err := tool.Handler(args1)
	if err != nil {
		t.Fatalf("First create failed: %v", err)
	}

	// Try to create second character with same name — should fail
	args2 := baseCreateArgs()
	args2["name"] = "DupHero"
	args2["race"] = "elf"
	_, err = tool.Handler(args2)
	if err == nil {
		t.Error("Expected error for duplicate character name")
	}
}

// ---------------------------------------------------------------------------
// get_character Tests
// ---------------------------------------------------------------------------

func TestGetCharacterTool_Success(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// First create a character
	createTool, _ := registry.Get("create_character")
	createResult, err := createTool.Handler(baseCreateArgs())
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	// Now get the character
	getTool, _ := registry.Get("get_character")
	result, err := getTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	if err != nil {
		t.Fatalf("get_character failed: %v", err)
	}

	resultMap := result.(map[string]interface{})
	if success, _ := resultMap["success"].(bool); !success {
		t.Error("Expected success to be true")
	}

	foundChar := resultMap["character"].(*models.Character)
	if foundChar.ID != createdChar.ID {
		t.Errorf("Expected ID %s, got %s", createdChar.ID, foundChar.ID)
	}
	if foundChar.Name != "TestHero" {
		t.Errorf("Expected name TestHero, got %s", foundChar.Name)
	}
}

func TestGetCharacterTool_NotFound(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	getTool, _ := registry.Get("get_character")
	_, err := getTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  "nonexistent-id",
	})
	if err == nil {
		t.Error("Expected error for non-existent character")
	}
}

func TestGetCharacterTool_SessionNotFound(t *testing.T) {
	registry, _ := setupTestRegistry()

	getTool, _ := registry.Get("get_character")
	_, err := getTool.Handler(map[string]interface{}{
		"session_id":    "nonexistent-session",
		"character_id":  "some-id",
	})
	if err == nil {
		t.Error("Expected error for non-existent session")
	}
}

func TestGetCharacterTool_MissingRequiredArgs(t *testing.T) {
	registry, _ := setupTestRegistry()

	getTool, _ := registry.Get("get_character")

	// Missing session_id
	_, err := getTool.Handler(map[string]interface{}{
		"character_id": "some-id",
	})
	if err == nil {
		t.Error("Expected error for missing session_id")
	}

	// Missing character_id
	_, err = getTool.Handler(map[string]interface{}{
		"session_id": "test-session",
	})
	if err == nil {
		t.Error("Expected error for missing character_id")
	}
}

// ---------------------------------------------------------------------------
// update_character Tests
// ---------------------------------------------------------------------------

func TestUpdateCharacterTool_UpdateHP(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Create a character first
	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	// Update HP
	updateTool, _ := registry.Get("update_character")
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"hp":            float64(5),
	})
	if err != nil {
		t.Fatalf("update_character failed: %v", err)
	}

	resultMap := result.(map[string]interface{})
	if success, _ := resultMap["success"].(bool); !success {
		t.Error("Expected success to be true")
	}

	updatedChar := resultMap["character"].(*models.Character)
	if updatedChar.HP != 5 {
		t.Errorf("Expected HP 5, got %d", updatedChar.HP)
	}
}

func TestUpdateCharacterTool_UpdateMaxHPAndAC(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	updateTool, _ := registry.Get("update_character")
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"max_hp":        float64(30),
		"ac":            float64(18),
	})
	if err != nil {
		t.Fatalf("update_character failed: %v", err)
	}

	updatedChar := result.(map[string]interface{})["character"].(*models.Character)
	if updatedChar.MaxHP != 30 {
		t.Errorf("Expected MaxHP 30, got %d", updatedChar.MaxHP)
	}
	if updatedChar.AC != 18 {
		t.Errorf("Expected AC 18, got %d", updatedChar.AC)
	}
}

func TestUpdateCharacterTool_UpdateGold(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	updateTool, _ := registry.Get("update_character")
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"gold":          float64(500),
	})
	if err != nil {
		t.Fatalf("update_character failed: %v", err)
	}

	updatedChar := result.(map[string]interface{})["character"].(*models.Character)
	if updatedChar.Gold != 500 {
		t.Errorf("Expected gold 500, got %d", updatedChar.Gold)
	}
}

func TestUpdateCharacterTool_AddConditions(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	updateTool, _ := registry.Get("update_character")
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"conditions_add": []interface{}{"poisoned", "blinded"},
	})
	if err != nil {
		t.Fatalf("update_character failed: %v", err)
	}

	updatedChar := result.(map[string]interface{})["character"].(*models.Character)
	foundPoisoned := false
	foundBlinded := false
	for _, c := range updatedChar.Conditions {
		if string(c) == "poisoned" {
			foundPoisoned = true
		}
		if string(c) == "blinded" {
			foundBlinded = true
		}
	}
	if !foundPoisoned {
		t.Error("Expected 'poisoned' condition")
	}
	if !foundBlinded {
		t.Error("Expected 'blinded' condition")
	}
}

func TestUpdateCharacterTool_RemoveConditions(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	updateTool, _ := registry.Get("update_character")

	// Add conditions first
	updateTool.Handler(map[string]interface{}{
		"session_id":     "test-session",
		"character_id":   createdChar.ID,
		"conditions_add": []interface{}{"poisoned", "blinded", "stunned"},
	})

	// Remove some conditions
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":        "test-session",
		"character_id":      createdChar.ID,
		"conditions_remove": []interface{}{"poisoned", "stunned"},
	})
	if err != nil {
		t.Fatalf("update_character remove conditions failed: %v", err)
	}

	updatedChar := result.(map[string]interface{})["character"].(*models.Character)
	for _, c := range updatedChar.Conditions {
		if string(c) == "poisoned" {
			t.Error("poisoned should have been removed")
		}
		if string(c) == "stunned" {
			t.Error("stunned should have been removed")
		}
	}

	// blinded should still be present
	foundBlinded := false
	for _, c := range updatedChar.Conditions {
		if string(c) == "blinded" {
			foundBlinded = true
		}
	}
	if !foundBlinded {
		t.Error("blinded should still be present")
	}
}

func TestUpdateCharacterTool_CharacterNotFound(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	updateTool, _ := registry.Get("update_character")
	_, err := updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  "nonexistent-id",
		"hp":            float64(5),
	})
	if err == nil {
		t.Error("Expected error for non-existent character")
	}
}

func TestUpdateCharacterTool_InvalidHP(t *testing.T) {
	// Each sub-test uses its own session+character to avoid state leakage,
	// since update_character applies mutations to the pointer before validating.
	tests := []struct {
		name        string
		updateArgs  func(sessionID, charID string) map[string]interface{}
		errContains string
	}{
		{
			name: "HP exceeds MaxHP",
			updateArgs: func(sid, cid string) map[string]interface{} {
				return map[string]interface{}{
					"session_id":    sid,
					"character_id":  cid,
					"hp":            float64(999),
				}
			},
			errContains: "cannot exceed max_hp",
		},
		{
			name: "HP negative",
			updateArgs: func(sid, cid string) map[string]interface{} {
				return map[string]interface{}{
					"session_id":    sid,
					"character_id":  cid,
					"hp":            float64(-1),
				}
			},
			errContains: "hp must be >= 0",
		},
		{
			name: "MaxHP less than 1",
			updateArgs: func(sid, cid string) map[string]interface{} {
				return map[string]interface{}{
					"session_id":    sid,
					"character_id":  cid,
					"max_hp":        float64(0),
				}
			},
			errContains: "max_hp must be >= 1",
		},
		{
			name: "AC negative",
			updateArgs: func(sid, cid string) map[string]interface{} {
				return map[string]interface{}{
					"session_id":    sid,
					"character_id":  cid,
					"ac":            float64(-1),
				}
			},
			errContains: "ac must be >= 0",
		},
		{
			name: "Gold negative",
			updateArgs: func(sid, cid string) map[string]interface{} {
				return map[string]interface{}{
					"session_id":    sid,
					"character_id":  cid,
					"gold":          float64(-5),
				}
			},
			errContains: "gold must be >= 0",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			registry, provider := setupTestRegistry()
			sessionID := "test-session-" + tt.name
			provider.createSession(sessionID)

			createTool, _ := registry.Get("create_character")
			createArgs := baseCreateArgs()
			createArgs["session_id"] = sessionID
			createArgs["name"] = "Test_" + tt.name
			createResult, _ := createTool.Handler(createArgs)
			createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

			updateTool, _ := registry.Get("update_character")
			_, err := updateTool.Handler(tt.updateArgs(sessionID, createdChar.ID))
			if err == nil {
				t.Errorf("Expected error for %s", tt.name)
			} else if !containsSubstring(err.Error(), tt.errContains) {
				t.Errorf("Expected error containing %q, got %q", tt.errContains, err.Error())
			}
		})
	}
}

func TestUpdateCharacterTool_DuplicateConditions(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Create a character first
	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	updateTool, _ := registry.Get("update_character")

	// Add "poisoned" twice in the same call
	result, err := updateTool.Handler(map[string]interface{}{
		"session_id":     "test-session",
		"character_id":   createdChar.ID,
		"conditions_add": []interface{}{"poisoned", "poisoned"},
	})
	if err != nil {
		t.Fatalf("update_character failed: %v", err)
	}

	updatedChar := result.(map[string]interface{})["character"].(*models.Character)
	poisonedCount := 0
	for _, c := range updatedChar.Conditions {
		if string(c) == "poisoned" {
			poisonedCount++
		}
	}
	if poisonedCount != 1 {
		t.Errorf("Expected exactly 1 'poisoned' condition, got %d", poisonedCount)
	}
}

func TestUpdateCharacterTool_MissingRequiredArgs(t *testing.T) {
	registry, _ := setupTestRegistry()

	updateTool, _ := registry.Get("update_character")

	_, err := updateTool.Handler(map[string]interface{}{
		"session_id": "test-session",
	})
	if err == nil {
		t.Error("Expected error for missing character_id")
	}

	_, err = updateTool.Handler(map[string]interface{}{
		"character_id": "some-id",
	})
	if err == nil {
		t.Error("Expected error for missing session_id")
	}
}

// ---------------------------------------------------------------------------
// add_to_inventory Tests
// ---------------------------------------------------------------------------

func TestAddToInventoryTool_Success(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Create a character
	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	// Add item
	addTool, _ := registry.Get("add_to_inventory")
	result, err := addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"item_name":     "Longsword",
		"item_type":     "weapon",
		"description":   "A finely crafted steel longsword",
	})
	if err != nil {
		t.Fatalf("add_to_inventory failed: %v", err)
	}

	resultMap := result.(map[string]interface{})
	if success, _ := resultMap["success"].(bool); !success {
		t.Error("Expected success to be true")
	}
	if itemAdded, _ := resultMap["item_added"].(string); itemAdded != "Longsword" {
		t.Errorf("Expected item_added 'Longsword', got %q", itemAdded)
	}
	if count, _ := resultMap["inventory_count"].(int); count != 1 {
		t.Errorf("Expected inventory_count 1, got %d", count)
	}
}

func TestAddToInventoryTool_InvalidItemType(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	addTool, _ := registry.Get("add_to_inventory")
	_, err := addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"item_name":     "Invalid Thing",
		"item_type":     "invalid_type",
	})
	if err == nil {
		t.Error("Expected error for invalid item_type")
	}
	if err != nil && !containsSubstring(err.Error(), "invalid item_type") {
		t.Errorf("Expected error to mention invalid item_type, got: %v", err)
	}
}

func TestAddToInventoryTool_DefaultType(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	addTool, _ := registry.Get("add_to_inventory")
	// Don't specify item_type -- should default to "gear"
	addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"item_name":     "Backpack",
	})

	gs := provider.GetGameState("test-session")
	if gs.Party[0].Inventory[0].Type != "gear" {
		t.Errorf("Expected default type 'gear', got %s", gs.Party[0].Inventory[0].Type)
	}
}

func TestAddToInventoryTool_MultipleItems(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	addTool, _ := registry.Get("add_to_inventory")
	items := []map[string]interface{}{
		{"item_name": "Longsword", "item_type": "weapon"},
		{"item_name": "Shield", "item_type": "armor"},
		{"item_name": "Health Potion", "item_type": "potion"},
	}
	for _, item := range items {
		args := map[string]interface{}{
			"session_id":    "test-session",
			"character_id":  createdChar.ID,
			"item_name":     item["item_name"],
			"item_type":     item["item_type"],
		}
		_, err := addTool.Handler(args)
		if err != nil {
			t.Fatalf("Failed to add %s: %v", item["item_name"], err)
		}
	}

	gs := provider.GetGameState("test-session")
	if len(gs.Party[0].Inventory) != 3 {
		t.Errorf("Expected 3 inventory items, got %d", len(gs.Party[0].Inventory))
	}
}

func TestAddToInventoryTool_CharacterNotFound(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	addTool, _ := registry.Get("add_to_inventory")
	_, err := addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  "nonexistent-id",
		"item_name":     "Sword",
	})
	if err == nil {
		t.Error("Expected error for non-existent character")
	}
}

func TestAddToInventoryTool_MissingRequiredArgs(t *testing.T) {
	registry, _ := setupTestRegistry()

	addTool, _ := registry.Get("add_to_inventory")

	// Missing item_name
	_, err := addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  "some-id",
	})
	if err == nil {
		t.Error("Expected error for missing item_name")
	}

	// Missing session_id
	_, err = addTool.Handler(map[string]interface{}{
		"character_id":  "some-id",
		"item_name":     "Sword",
	})
	if err == nil {
		t.Error("Expected error for missing session_id")
	}

	// Missing character_id
	_, err = addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"item_name":     "Sword",
	})
	if err == nil {
		t.Error("Expected error for missing character_id")
	}
}

// ---------------------------------------------------------------------------
// level_up Tests
// ---------------------------------------------------------------------------

func TestLevelUpTool_Success(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Create a human fighter with CON 12 -> +1 human bonus -> CON 13, modifier +1
	// Fighter hit dice = 10, so initial HP = 10 + 1 = 11
	createTool, _ := registry.Get("create_character")
	createArgs := baseCreateArgs()
	createArgs["ability_scores"] = map[string]interface{}{
		"str": float64(16), "dex": float64(14), "con": float64(12),
		"int": float64(10), "wis": float64(10), "cha": float64(10),
	}
	createResult, _ := createTool.Handler(createArgs)
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	initialHP := createdChar.MaxHP
	if createdChar.Level != 1 {
		t.Fatalf("Expected initial level 1, got %d", createdChar.Level)
	}

	// Level up
	levelUpTool, _ := registry.Get("level_up")
	result, err := levelUpTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	if err != nil {
		t.Fatalf("level_up failed: %v", err)
	}

	resultMap := result.(map[string]interface{})
	if success, _ := resultMap["success"].(bool); !success {
		t.Error("Expected success to be true")
	}

	updatedChar := resultMap["character"].(*models.Character)
	if updatedChar.Level != 2 {
		t.Errorf("Expected level 2, got %d", updatedChar.Level)
	}

	// HP should increase by (hitDice/2 + 1) + CON mod
	// Fighter hit dice=10, CON 13 (+1 mod after human racial bonus): hpGain = 10/2 + 1 + 1 = 6
	hpGain := (10/2 + 1) + 1 // = 6
	expectedNewHP := initialHP + hpGain
	if updatedChar.MaxHP != expectedNewHP {
		t.Errorf("Expected MaxHP %d, got %d", expectedNewHP, updatedChar.MaxHP)
	}

	if newLevel, _ := resultMap["new_level"].(int); newLevel != 2 {
		t.Errorf("Expected new_level 2, got %d", newLevel)
	}
}

func TestLevelUpTool_ProficiencyBonusIncrease(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	createTool, _ := registry.Get("create_character")
	createResult, _ := createTool.Handler(baseCreateArgs())
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	levelUpTool, _ := registry.Get("level_up")

	// Level up to level 5 (4 level ups)
	for i := 0; i < 4; i++ {
		result, err := levelUpTool.Handler(map[string]interface{}{
			"session_id":    "test-session",
			"character_id":  createdChar.ID,
		})
		if err != nil {
			t.Fatalf("level_up %d failed: %v", i+1, err)
		}
		updatedChar := result.(map[string]interface{})["character"].(*models.Character)
		if updatedChar.Level != i+2 {
			t.Errorf("Expected level %d, got %d", i+2, updatedChar.Level)
		}
	}

	// At level 5, proficiency bonus should be +3
	gs := provider.GetGameState("test-session")
	finalChar := gs.Party[0]
	if finalChar.Level != 5 {
		t.Errorf("Expected level 5, got %d", finalChar.Level)
	}
	if finalChar.ProficiencyBonus != 3 {
		t.Errorf("Expected proficiency bonus +3 at level 5, got %d", finalChar.ProficiencyBonus)
	}
}

func TestLevelUpTool_CharacterNotFound(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	levelUpTool, _ := registry.Get("level_up")
	_, err := levelUpTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  "nonexistent-id",
	})
	if err == nil {
		t.Error("Expected error for non-existent character")
	}
}

func TestLevelUpTool_MissingRequiredArgs(t *testing.T) {
	registry, _ := setupTestRegistry()

	levelUpTool, _ := registry.Get("level_up")

	_, err := levelUpTool.Handler(map[string]interface{}{
		"session_id": "test-session",
	})
	if err == nil {
		t.Error("Expected error for missing character_id")
	}

	_, err = levelUpTool.Handler(map[string]interface{}{
		"character_id": "some-id",
	})
	if err == nil {
		t.Error("Expected error for missing session_id")
	}
}

func TestLevelUpTool_DifferentClasses(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	tests := []struct {
		class         string
		hitDice       int
		expectedGain  int // (hitDice/2 + 1) + 0 (CON 11 human -> mod 0)
	}{
		{"wizard", 6, 4},    // (6/2 + 1) + 0 = 4
		{"sorcerer", 6, 4},  // (6/2 + 1) + 0 = 4
		{"fighter", 10, 6},  // (10/2 + 1) + 0 = 6
		{"paladin", 10, 6},  // (10/2 + 1) + 0 = 6
		{"rogue", 8, 5},     // (8/2 + 1) + 0 = 5
		{"cleric", 8, 5},    // (8/2 + 1) + 0 = 5
	}

	for _, tt := range tests {
		t.Run(tt.class, func(t *testing.T) {
			// Use a unique session for each test
			sessionID := "test-session-" + tt.class
			provider.createSession(sessionID)

			createTool, _ := registry.Get("create_character")
			createResult, err := createTool.Handler(map[string]interface{}{
				"session_id":    sessionID,
				"name":          "Test",
				"race":          "human",
				"class":         tt.class,
				"background":    "soldier",
				"ability_scores": map[string]interface{}{
					"str": float64(10), "dex": float64(10), "con": float64(10),
					"int": float64(10), "wis": float64(10), "cha": float64(10),
				},
			})
			if err != nil {
				t.Fatalf("Create failed: %v", err)
			}
			createdChar := createResult.(map[string]interface{})["character"].(*models.Character)
			initialHP := createdChar.MaxHP

			levelUpTool, _ := registry.Get("level_up")
			result, err := levelUpTool.Handler(map[string]interface{}{
				"session_id":    sessionID,
				"character_id":  createdChar.ID,
			})
			if err != nil {
				t.Fatalf("level_up failed: %v", err)
			}

			updatedChar := result.(map[string]interface{})["character"].(*models.Character)
			actualGain := updatedChar.MaxHP - initialHP
			if actualGain != tt.expectedGain {
				t.Errorf("Expected HP gain %d for %s, got %d (initial %d, final %d)",
					tt.expectedGain, tt.class, actualGain, initialHP, updatedChar.MaxHP)
			}
		})
	}
}

// ---------------------------------------------------------------------------
// Integration Tests - Cross-tool workflows
// ---------------------------------------------------------------------------

func TestIntegration_CreateGetUpdate(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Step 1: Create
	createTool, _ := registry.Get("create_character")
	createResult, err := createTool.Handler(baseCreateArgs())
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	// Step 2: Get
	getTool, _ := registry.Get("get_character")
	getResult, err := getTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}
	getChar := getResult.(map[string]interface{})["character"].(*models.Character)
	if getChar.Name != "TestHero" {
		t.Errorf("Expected name TestHero, got %s", getChar.Name)
	}

	// Step 3: Update
	updateTool, _ := registry.Get("update_character")
	updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"hp":            float64(3),
		"conditions_add": []interface{}{"unconscious"},
	})

	// Step 4: Get again and verify
	getResult2, _ := getTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	updatedChar := getResult2.(map[string]interface{})["character"].(*models.Character)
	if updatedChar.HP != 3 {
		t.Errorf("Expected HP 3 after update, got %d", updatedChar.HP)
	}
	foundUnconscious := false
	for _, c := range updatedChar.Conditions {
		if string(c) == "unconscious" {
			foundUnconscious = true
		}
	}
	if !foundUnconscious {
		t.Error("Expected unconscious condition")
	}
}

func TestIntegration_FullCharacterLifecycle(t *testing.T) {
	registry, provider := setupTestRegistry()
	provider.createSession("test-session")

	// Create an elf wizard
	createTool, _ := registry.Get("create_character")
	createResult, err := createTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"name":          "Elara",
		"race":          "elf",
		"class":         "wizard",
		"background":    "sage",
		"ability_scores": map[string]interface{}{
			"str": float64(8), "dex": float64(14), "con": float64(12),
			"int": float64(16), "wis": float64(12), "cha": float64(10),
		},
	})
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	createdChar := createResult.(map[string]interface{})["character"].(*models.Character)

	// Verify elf wizard stats
	if createdChar.Stats.Dexterity != 16 { // 14 + 2 elf
		t.Errorf("Expected DEX 16, got %d", createdChar.Stats.Dexterity)
	}
	if createdChar.MaxHP != 7 { // 6 (wizard) + 1 (CON 12)
		t.Errorf("Expected MaxHP 7, got %d", createdChar.MaxHP)
	}

	// Add items to inventory
	addTool, _ := registry.Get("add_to_inventory")
	addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"item_name":     "Spellbook",
		"item_type":     "tool",
		"description":   "Contains all known spells",
	})
	addTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"item_name":     "Arcane Focus",
		"item_type":     "gear",
	})

	// Level up twice
	levelUpTool, _ := registry.Get("level_up")
	levelUpTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	levelUpResult, _ := levelUpTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	leveledChar := levelUpResult.(map[string]interface{})["character"].(*models.Character)

	if leveledChar.Level != 3 {
		t.Errorf("Expected level 3, got %d", leveledChar.Level)
	}

	// Verify inventory persisted through level ups
	if len(leveledChar.Inventory) != 2 {
		t.Errorf("Expected 2 inventory items after level ups, got %d", len(leveledChar.Inventory))
	}

	// Take damage and update
	updateTool, _ := registry.Get("update_character")
	updateTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
		"hp":            float64(2),
		"conditions_add": []interface{}{"wounded"},
	})

	// Final get to verify everything
	getTool, _ := registry.Get("get_character")
	finalResult, _ := getTool.Handler(map[string]interface{}{
		"session_id":    "test-session",
		"character_id":  createdChar.ID,
	})
	finalChar := finalResult.(map[string]interface{})["character"].(*models.Character)

	if finalChar.HP != 2 {
		t.Errorf("Expected HP 2, got %d", finalChar.HP)
	}
	if finalChar.Level != 3 {
		t.Errorf("Expected level 3, got %d", finalChar.Level)
	}
	if len(finalChar.Inventory) != 2 {
		t.Errorf("Expected 2 inventory items, got %d", len(finalChar.Inventory))
	}
}

// ---------------------------------------------------------------------------
// Helper function tests (toInt, skillFromString, conditionFromString)
// ---------------------------------------------------------------------------

func TestToInt_Conversions(t *testing.T) {
	// Positive cases: valid numeric inputs should convert correctly
	validCases := []struct {
		input    interface{}
		expected int
	}{
		{float64(42), 42},
		{int(42), 42},
		{float32(42), 42},
		{json.Number("42"), 42},
	}
	for _, tc := range validCases {
		result := toInt(tc.input, 0)
		if result != tc.expected {
			t.Errorf("toInt(%v, 0) = %d, want %d", tc.input, result, tc.expected)
		}
	}

	// Negative cases: invalid inputs should return the default fallback
	invalidCases := []struct {
		input        interface{}
		defaultValue int
	}{
		{"not a number", 10},
		{nil, 99},
		{true, 5},
	}
	for _, tc := range invalidCases {
		result := toInt(tc.input, tc.defaultValue)
		if result != tc.defaultValue {
			t.Errorf("toInt(%v, %d) = %d, want default %d", tc.input, tc.defaultValue, result, tc.defaultValue)
		}
	}
}

func TestSkillFromString(t *testing.T) {
	tests := []struct {
		input          string
		expectedSkill  types.Skill
		expectedValid  bool
	}{
		{"Perception", types.Perception, true},
		{"perception", types.Perception, true},
		{"PERCEPTION", types.Perception, true},
		{"stealth", types.Stealth, true},
		{"Arcana", types.Arcana, true},
		{"not_a_skill", types.Skill(""), false}, // invalid skill returns false
	}
	for _, tt := range tests {
		result, valid := skillFromString(tt.input)
		if valid != tt.expectedValid || result != tt.expectedSkill {
			t.Errorf("skillFromString(%q) = (%q, %v), expected (%q, %v)", tt.input, result, valid, tt.expectedSkill, tt.expectedValid)
		}
	}
}

func TestAbilityFromString(t *testing.T) {
	tests := []struct {
		input         string
		expectedAb    types.Ability
		expectedValid bool
	}{
		{"str", types.Strength, true},
		{"Strength", types.Strength, true},
		{"STRENGTH", types.Strength, true},
		{"dex", types.Dexterity, true},
		{"intelligence", types.Intelligence, true},
		{"cha", types.Charisma, true},
		{"not_an_ability", types.Ability(""), false}, // invalid ability returns false
	}
	for _, tt := range tests {
		result, valid := abilityFromString(tt.input)
		if valid != tt.expectedValid || result != tt.expectedAb {
			t.Errorf("abilityFromString(%q) = (%v, %v), expected (%v, %v)", tt.input, result, valid, tt.expectedAb, tt.expectedValid)
		}
	}
}

func TestConditionFromString(t *testing.T) {
	tests := []struct {
		input    string
		expected types.Condition
	}{
		{"Poisoned", "poisoned"},
		{"POISONED", "poisoned"},
		{"Blinded", "blinded"},
		{"stunned", "stunned"},
	}
	for _, tt := range tests {
		result, valid := conditionFromString(tt.input)
		if !valid || result != tt.expected {
			t.Errorf("conditionFromString(%q) = (%q, %v), expected (%q, true)", tt.input, result, valid, tt.expected)
		}
	}
}
