package tools

import (
	"testing"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/server/spell"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/pkg/dnd5e/spells"
)

// ---------------------------------------------------------------------------
// Test helpers for spell tool tests
// ---------------------------------------------------------------------------

// mockSpellDice is a dice service mock for spell tool tests.
type mockSpellDice struct {
	total int
}

func (m *mockSpellDice) Roll(formula string) (*dice.Result, error) {
	return &dice.Result{Total: m.total}, nil
}
func (m *mockSpellDice) AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}
func (m *mockSpellDice) AbilityCheck(modifier, dc int, advantage, disadvantage bool) *dice.CheckResult {
	return &dice.CheckResult{}
}

// testSpellData creates a minimal set of spell definitions for testing.
func testSpellDataForTools() map[string]*models.Spell {
	return map[string]*models.Spell{
		"magic_missile": {
			ID:            "magic_missile",
			Name:          "Magic Missile",
			Level:         1,
			School:        models.SpellSchoolEvocation,
			Classes:       []string{"wizard", "sorcerer"},
			Effects: []models.SpellEffect{
				{
					Type:       models.SpellEffectTypeDamage,
					DamageType: "force",
					DiceCount:  3,
					DiceSize:   4,
					BonusValue: 3,
				},
			},
		},
		"fireball": {
			ID:            "fireball",
			Name:          "Fireball",
			Level:         3,
			School:        models.SpellSchoolEvocation,
			Classes:       []string{"wizard", "sorcerer"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeDamage,
					DamageType:      "fire",
					SaveAbility:     "dexterity",
					DiceCount:       8,
					DiceSize:        6,
					ScalingType:     models.ScalingTypeSlotLevel,
					ScalingInterval: 1,
				},
			},
		},
		"cure_wounds": {
			ID:            "cure_wounds",
			Name:          "Cure Wounds",
			Level:         1,
			School:        models.SpellSchoolEvocation,
			Classes:       []string{"cleric"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeHeal,
					DiceCount:       1,
					DiceSize:        8,
					ScalingType:     models.ScalingTypeSlotLevel,
					ScalingInterval: 1,
				},
			},
		},
		"shield": {
			ID:            "shield",
			Name:          "Shield",
			Level:         1,
			School:        models.SpellSchoolAbjuration,
			Classes:       []string{"wizard"},
			Effects: []models.SpellEffect{
				{
					Type:       models.SpellEffectTypeBuff,
					BonusValue: 5,
				},
			},
		},
		"bless": {
			ID:             "bless",
			Name:           "Bless",
			Level:          1,
			School:         models.SpellSchoolEnchantment,
			Concentration:  true,
			Classes:        []string{"cleric"},
			Effects: []models.SpellEffect{
				{
					Type:      models.SpellEffectTypeBuff,
					DiceCount: 1,
					DiceSize:  4,
				},
			},
		},
		"fire_bolt": {
			ID:            "fire_bolt",
			Name:          "Fire Bolt",
			Level:         0,
			School:        models.SpellSchoolEvocation,
			Classes:       []string{"wizard"},
			Effects: []models.SpellEffect{
				{
					Type:            models.SpellEffectTypeDamage,
					DamageType:      "fire",
					DiceCount:       1,
					DiceSize:        10,
					ScalingType:     models.ScalingTypeCharacterLevel,
					ScalingInterval: 5,
				},
			},
		},
	}
}

// setupSpellTestRegistry creates a registry with spell tools, a state manager,
// and a casting manager for integration testing.
func setupSpellTestRegistry() (*Registry, *state.Manager) {
	registry := NewRegistry()
	stateMgr := state.NewManager()
	ds := &mockSpellDice{total: 10}

	spellStore := spells.NewSpellStore(testSpellDataForTools())
	slotMgr := spell.NewSlotManager()
	concMgr := spell.NewConcentrationManager(ds)
	effectCalc := spell.NewEffectApplier(ds)
	castingMgr := spell.NewCastingManager(spellStore, slotMgr, concMgr, effectCalc, ds)

	RegisterSpellTools(registry, stateMgr, castingMgr, spellStore)

	return registry, stateMgr
}

// setupSpellSession creates a session with a wizard and cleric in the party.
func setupSpellSession(stateMgr *state.Manager) string {
	sessionID := "spell-test-session"
	stateMgr.CreateSession(sessionID)

	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Party = append(gs.Party, &models.Character{
			ID:               "wizard1",
			Name:             "Gandalf",
			Class:            "wizard",
			Level:            5,
			HP:               28,
			MaxHP:            28,
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Intelligence: 16},
			KnownSpells:      []string{"magic_missile", "fireball", "shield", "fire_bolt"},
			PreparedSpells:   []string{"magic_missile", "fireball", "shield", "fire_bolt"},
			SpellSlots:       map[int]int{1: 4, 2: 3, 3: 2},
		})
		gs.Party = append(gs.Party, &models.Character{
			ID:               "cleric1",
			Name:             "Cleric",
			Class:            "cleric",
			Level:            5,
			HP:               30,
			MaxHP:            30,
			ProficiencyBonus: 3,
			Stats:            models.AbilityScores{Wisdom: 16},
			KnownSpells:      []string{"cure_wounds", "bless"},
			PreparedSpells:   []string{"cure_wounds", "bless"},
			SpellSlots:       map[int]int{1: 4, 2: 3, 3: 2},
		})
	})

	return sessionID
}

// ---------------------------------------------------------------------------
// Tool Registration Tests
// ---------------------------------------------------------------------------

func TestRegisterSpellTools_AllToolsRegistered(t *testing.T) {
	registry, _ := setupSpellTestRegistry()

	expectedTools := []string{"cast_spell", "prepare_spell", "unprepare_spell", "get_spell_info"}
	for _, name := range expectedTools {
		_, ok := registry.Get(name)
		if !ok {
			t.Errorf("expected tool %q to be registered", name)
		}
	}
}

func TestRegisterSpellTools_ToolCount(t *testing.T) {
	registry, _ := setupSpellTestRegistry()

	tools := registry.List()
	spellToolCount := 0
	for _, tool := range tools {
		switch tool.Name {
		case "cast_spell", "prepare_spell", "unprepare_spell", "get_spell_info":
			spellToolCount++
		}
	}
	if spellToolCount != 4 {
		t.Errorf("expected 4 spell tools, found %d", spellToolCount)
	}
}

// ---------------------------------------------------------------------------
// cast_spell Tool Tests
// ---------------------------------------------------------------------------

func TestCastSpellTool_Success(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, ok := registry.Get("cast_spell")
	if !ok {
		t.Fatal("cast_spell tool not found")
	}

	result, err := tool.Handler(map[string]interface{}{
		"session_id":  sessionID,
		"caster_id":   "wizard1",
		"spell_id":    "magic_missile",
		"slot_level":  float64(1),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// On success, cast_spell returns *spell.CastSpellResult directly.
	castResult, ok := result.(*spell.CastSpellResult)
	if !ok {
		t.Fatalf("expected *spell.CastSpellResult, got %T", result)
	}
	if !castResult.Success {
		t.Error("expected success to be true")
	}
	if castResult.SpellName != "Magic Missile" {
		t.Errorf("expected spell name Magic Missile, got %s", castResult.SpellName)
	}
}

func TestCastSpellTool_CantripNoSlot(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "fire_bolt",
		"slot_level": float64(0),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	castResult := result.(*spell.CastSpellResult)
	if !castResult.Success {
		t.Error("expected success for cantrip cast")
	}
	if castResult.SlotLevelUsed != 0 {
		t.Errorf("cantrip should use slot level 0, got %d", castResult.SlotLevelUsed)
	}

	// Verify spell slots were not consumed.
	gs := stateMgr.GetSession(sessionID)
	char := gs.Party[0]
	if char.SpellSlots[1] != 4 {
		t.Errorf("cantrip should not consume slots, expected 4 level-1 slots, got %d", char.SpellSlots[1])
	}
}

func TestCastSpellTool_ConsumesSlot(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "magic_missile",
		"slot_level": float64(1),
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	castResult := result.(*spell.CastSpellResult)
	if !castResult.Success {
		t.Error("expected success")
	}

	gs := stateMgr.GetSession(sessionID)
	char := gs.Party[0]
	if char.SpellSlots[1] != 3 {
		t.Errorf("expected 3 remaining level-1 slots, got %d", char.SpellSlots[1])
	}
}

func TestCastSpellTool_SetsConcentration(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "cleric1",
		"spell_id":   "bless",
		"slot_level": float64(1),
		"target_id":  "ally1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	castResult := result.(*spell.CastSpellResult)
	if !castResult.Concentrating {
		t.Error("expected concentrating=true for bless")
	}

	// Verify concentration is persisted on character.
	gs := stateMgr.GetSession(sessionID)
	cleric := gs.Party[1]
	if cleric.Concentration == nil {
		t.Fatal("expected concentration to be set on character")
	}
	if cleric.Concentration.SpellID != "bless" {
		t.Errorf("expected concentration on bless, got %s", cleric.Concentration.SpellID)
	}
}

func TestCastSpellTool_AppliesDamageInCombat(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	// Set up active combat with an enemy.
	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = &state.CombatState{
			Status: state.CombatActive,
			Participants: []*state.Combatant{
				{ID: "enemy1", Name: "Goblin", CurrentHP: 30, MaxHP: 30},
			},
		}
	})

	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "fireball",
		"slot_level": float64(3),
		"target_id":  "enemy1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify damage was applied to combatant.
	gs := stateMgr.GetSession(sessionID)
	enemy := gs.Combat.Participants[0]
	if enemy.CurrentHP >= 30 {
		t.Errorf("expected enemy to take damage, HP still %d", enemy.CurrentHP)
	}
	if enemy.CurrentHP < 0 {
		t.Errorf("enemy HP should not go below 0, got %d", enemy.CurrentHP)
	}
}

func TestCastSpellTool_DamageClampedAtZero(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	// Enemy with low HP to test clamping.
	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = &state.CombatState{
			Status: state.CombatActive,
			Participants: []*state.Combatant{
				{ID: "enemy1", Name: "Weak Goblin", CurrentHP: 1, MaxHP: 1},
			},
		}
	})

	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "fireball",
		"slot_level": float64(3),
		"target_id":  "enemy1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	gs := stateMgr.GetSession(sessionID)
	enemy := gs.Combat.Participants[0]
	if enemy.CurrentHP != 0 {
		t.Errorf("expected enemy HP clamped to 0, got %d", enemy.CurrentHP)
	}
}

func TestCastSpellTool_AppliesHealingInCombat(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = &state.CombatState{
			Status: state.CombatActive,
			Participants: []*state.Combatant{
				{ID: "wizard1", Name: "Gandalf", CurrentHP: 10, MaxHP: 28},
			},
		}
		// Reduce wizard HP for heal test.
		gs.Party[0].HP = 10
	})

	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "cleric1",
		"spell_id":   "cure_wounds",
		"slot_level": float64(1),
		"target_id":  "wizard1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Verify healing was applied to combatant.
	gs := stateMgr.GetSession(sessionID)
	wizard := gs.Combat.Participants[0]
	if wizard.CurrentHP <= 10 {
		t.Errorf("expected wizard to be healed, HP is %d", wizard.CurrentHP)
	}
}

func TestCastSpellTool_HealingClampedAtMaxHP(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = &state.CombatState{
			Status: state.CombatActive,
			Participants: []*state.Combatant{
				{ID: "wizard1", Name: "Gandalf", CurrentHP: 27, MaxHP: 28},
			},
		}
		gs.Party[0].HP = 27
	})

	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "cleric1",
		"spell_id":   "cure_wounds",
		"slot_level": float64(1),
		"target_id":  "wizard1",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	gs := stateMgr.GetSession(sessionID)
	wizard := gs.Combat.Participants[0]
	if wizard.CurrentHP > wizard.MaxHP {
		t.Errorf("healing should not exceed MaxHP, got %d/%d", wizard.CurrentHP, wizard.MaxHP)
	}
}

func TestCastSpellTool_MissingSessionID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"caster_id":  "wizard1",
		"spell_id":   "magic_missile",
		"slot_level": float64(1),
	})
	if err == nil {
		t.Error("expected error for missing session_id")
	}
}

func TestCastSpellTool_MissingCasterID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": "test",
		"spell_id":   "magic_missile",
		"slot_level": float64(1),
	})
	if err == nil {
		t.Error("expected error for missing caster_id")
	}
}

func TestCastSpellTool_MissingSpellID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": "test",
		"caster_id":  "wizard1",
		"slot_level": float64(1),
	})
	if err == nil {
		t.Error("expected error for missing spell_id")
	}
}

func TestCastSpellTool_SessionNotFound(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("cast_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": "nonexistent",
		"caster_id":  "wizard1",
		"spell_id":   "magic_missile",
		"slot_level": float64(1),
	})
	if err == nil {
		t.Error("expected error for nonexistent session")
	}
}

func TestCastSpellTool_CharacterNotFound(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "nonexistent_char",
		"spell_id":   "magic_missile",
		"slot_level": float64(1),
	})
	if err != nil {
		t.Fatalf("handler should not return go error for business logic failure: %v", err)
	}

	// On failure, returns map[string]interface{}.
	resultMap, ok := result.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map[string]interface{} for failure, got %T", result)
	}
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for nonexistent character")
	}
}

func TestCastSpellTool_SpellNotKnown(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "cure_wounds", // cleric spell, not known by wizard
		"slot_level": float64(1),
	})
	if err != nil {
		t.Fatalf("unexpected go error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for spell not known")
	}
}

func TestCastSpellTool_NoAvailableSlot(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	// Exhaust level 3 slots.
	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Party[0].SpellSlots[3] = 0
	})

	tool, _ := registry.Get("cast_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "fireball",
		"slot_level": float64(3),
	})
	if err != nil {
		t.Fatalf("unexpected go error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for no available slot")
	}
}

// ---------------------------------------------------------------------------
// prepare_spell Tool Tests
// ---------------------------------------------------------------------------

func TestPrepareSpellTool_Success(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	// Make a wizard who knows shield but has not prepared it.
	stateMgr.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Party[0].PreparedSpells = []string{"magic_missile", "fireball", "fire_bolt"}
	})

	tool, _ := registry.Get("prepare_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "shield",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if !success {
		t.Error("expected success to be true")
	}

	// Verify spell was added to prepared list in state.
	gs := stateMgr.GetSession(sessionID)
	wizard := gs.Party[0]
	found := false
	for _, s := range wizard.PreparedSpells {
		if s == "shield" {
			found = true
		}
	}
	if !found {
		t.Error("shield should be in prepared spells after prepare_spell")
	}
}

func TestPrepareSpellTool_SpellNotKnown(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("prepare_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "cure_wounds", // Not in KnownSpells
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for spell not known")
	}
}

func TestPrepareSpellTool_SpellNotFound(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("prepare_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "nonexistent_spell",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for nonexistent spell")
	}
}

func TestPrepareSpellTool_MissingSessionID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("prepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"character_id": "wizard1",
		"spell_id":     "shield",
	})
	if err == nil {
		t.Error("expected error for missing session_id")
	}
}

func TestPrepareSpellTool_MissingCharacterID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("prepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": "test",
		"spell_id":   "shield",
	})
	if err == nil {
		t.Error("expected error for missing character_id")
	}
}

func TestPrepareSpellTool_MissingSpellID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("prepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   "test",
		"character_id": "wizard1",
	})
	if err == nil {
		t.Error("expected error for missing spell_id")
	}
}

func TestPrepareSpellTool_SessionNotFound(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("prepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   "nonexistent",
		"character_id": "wizard1",
		"spell_id":     "shield",
	})
	if err == nil {
		t.Error("expected error for nonexistent session")
	}
}

func TestPrepareSpellTool_CharacterNotFound(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("prepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "nonexistent",
		"spell_id":     "shield",
	})
	if err == nil {
		t.Error("expected error for nonexistent character")
	}
}

// ---------------------------------------------------------------------------
// unprepare_spell Tool Tests
// ---------------------------------------------------------------------------

func TestUnprepareSpellTool_Success(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("unprepare_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "magic_missile",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if !success {
		t.Error("expected success to be true")
	}

	// Verify spell was removed from prepared list in state.
	gs := stateMgr.GetSession(sessionID)
	wizard := gs.Party[0]
	for _, s := range wizard.PreparedSpells {
		if s == "magic_missile" {
			t.Error("magic_missile should not be in prepared spells after unprepare")
		}
	}
}

func TestUnprepareSpellTool_SpellNotPrepared(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("unprepare_spell")

	result, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "cure_wounds", // Not in PreparedSpells
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for spell not prepared")
	}
}

func TestUnprepareSpellTool_MissingSessionID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("unprepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"character_id": "wizard1",
		"spell_id":     "magic_missile",
	})
	if err == nil {
		t.Error("expected error for missing session_id")
	}
}

func TestUnprepareSpellTool_MissingCharacterID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("unprepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id": "test",
		"spell_id":   "magic_missile",
	})
	if err == nil {
		t.Error("expected error for missing character_id")
	}
}

func TestUnprepareSpellTool_MissingSpellID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("unprepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   "test",
		"character_id": "wizard1",
	})
	if err == nil {
		t.Error("expected error for missing spell_id")
	}
}

func TestUnprepareSpellTool_SessionNotFound(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("unprepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   "nonexistent",
		"character_id": "wizard1",
		"spell_id":     "magic_missile",
	})
	if err == nil {
		t.Error("expected error for nonexistent session")
	}
}

func TestUnprepareSpellTool_CharacterNotFound(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	tool, _ := registry.Get("unprepare_spell")

	_, err := tool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "nonexistent",
		"spell_id":     "magic_missile",
	})
	if err == nil {
		t.Error("expected error for nonexistent character")
	}
}

// ---------------------------------------------------------------------------
// get_spell_info Tool Tests
// ---------------------------------------------------------------------------

func TestGetSpellInfoTool_Success(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("get_spell_info")

	result, err := tool.Handler(map[string]interface{}{
		"spell_id": "fireball",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if !success {
		t.Error("expected success to be true")
	}

	spellData, ok := resultMap["spell"].(*models.Spell)
	if !ok {
		t.Fatal("expected spell to be a *models.Spell")
	}
	if spellData.Name != "Fireball" {
		t.Errorf("expected spell name Fireball, got %s", spellData.Name)
	}
	if spellData.Level != 3 {
		t.Errorf("expected spell level 3, got %d", spellData.Level)
	}
}

func TestGetSpellInfoTool_Cantrip(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("get_spell_info")

	result, err := tool.Handler(map[string]interface{}{
		"spell_id": "fire_bolt",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if !success {
		t.Error("expected success for cantrip lookup")
	}

	spellData := resultMap["spell"].(*models.Spell)
	if spellData.Level != 0 {
		t.Errorf("expected level 0 for cantrip, got %d", spellData.Level)
	}
}

func TestGetSpellInfoTool_NotFound(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("get_spell_info")

	result, err := tool.Handler(map[string]interface{}{
		"spell_id": "nonexistent_spell",
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	resultMap := result.(map[string]interface{})
	success, _ := resultMap["success"].(bool)
	if success {
		t.Error("expected success=false for nonexistent spell")
	}
}

func TestGetSpellInfoTool_MissingSpellID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("get_spell_info")

	_, err := tool.Handler(map[string]interface{}{})
	if err == nil {
		t.Error("expected error for missing spell_id")
	}
}

func TestGetSpellInfoTool_EmptySpellID(t *testing.T) {
	registry, _ := setupSpellTestRegistry()
	tool, _ := registry.Get("get_spell_info")

	_, err := tool.Handler(map[string]interface{}{
		"spell_id": "",
	})
	if err == nil {
		t.Error("expected error for empty spell_id")
	}
}

// ---------------------------------------------------------------------------
// findCharacterInParty helper tests
// ---------------------------------------------------------------------------

func TestFindCharacterInParty_Found(t *testing.T) {
	gs := &state.GameState{
		Party: []*models.Character{
			{ID: "wizard1", Name: "Gandalf"},
			{ID: "cleric1", Name: "Cleric"},
		},
	}

	ch := findCharacterInParty(gs, "cleric1")
	if ch == nil {
		t.Fatal("expected to find cleric1")
	}
	if ch.Name != "Cleric" {
		t.Errorf("expected name Cleric, got %s", ch.Name)
	}
}

func TestFindCharacterInParty_NotFound(t *testing.T) {
	gs := &state.GameState{
		Party: []*models.Character{
			{ID: "wizard1", Name: "Gandalf"},
		},
	}

	ch := findCharacterInParty(gs, "nonexistent")
	if ch != nil {
		t.Error("expected nil for nonexistent character")
	}
}

func TestFindCharacterInParty_EmptyParty(t *testing.T) {
	gs := &state.GameState{
		Party: []*models.Character{},
	}

	ch := findCharacterInParty(gs, "anyone")
	if ch != nil {
		t.Error("expected nil for empty party")
	}
}

func TestFindCharacterInParty_Mutation(t *testing.T) {
	gs := &state.GameState{
		Party: []*models.Character{
			{ID: "wizard1", Name: "Gandalf", HP: 28},
		},
	}

	ch := findCharacterInParty(gs, "wizard1")
	ch.HP = 10

	// The returned pointer should be the same as in the party slice,
	// so mutations should be visible.
	if gs.Party[0].HP != 10 {
		t.Error("findCharacterInParty should return a pointer to the actual character for mutation")
	}
}

// ---------------------------------------------------------------------------
// Integration: full spell workflow
// ---------------------------------------------------------------------------

func TestIntegration_SpellWorkflow(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	// Step 1: Look up spell info.
	getSpellTool, _ := registry.Get("get_spell_info")
	infoResult, err := getSpellTool.Handler(map[string]interface{}{
		"spell_id": "fireball",
	})
	if err != nil {
		t.Fatalf("get_spell_info failed: %v", err)
	}
	infoMap := infoResult.(map[string]interface{})
	if success, _ := infoMap["success"].(bool); !success {
		t.Fatal("get_spell_info should succeed for fireball")
	}

	// Step 2: Cast the spell.
	castTool, _ := registry.Get("cast_spell")
	castResult, err := castTool.Handler(map[string]interface{}{
		"session_id": sessionID,
		"caster_id":  "wizard1",
		"spell_id":   "fireball",
		"slot_level": float64(3),
		"target_id":  "enemy1",
	})
	if err != nil {
		t.Fatalf("cast_spell failed: %v", err)
	}
	castRes := castResult.(*spell.CastSpellResult)
	if !castRes.Success {
		t.Fatal("cast_spell should succeed for fireball")
	}

	// Verify slot consumed.
	gs := stateMgr.GetSession(sessionID)
	if gs.Party[0].SpellSlots[3] != 1 {
		t.Errorf("expected 1 remaining level-3 slot, got %d", gs.Party[0].SpellSlots[3])
	}

	// Step 3: Unprepare the spell.
	unprepTool, _ := registry.Get("unprepare_spell")
	unprepResult, err := unprepTool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "fireball",
	})
	if err != nil {
		t.Fatalf("unprepare_spell failed: %v", err)
	}
	unprepMap := unprepResult.(map[string]interface{})
	if success, _ := unprepMap["success"].(bool); !success {
		t.Fatal("unprepare_spell should succeed")
	}

	// Step 4: Re-prepare the spell.
	prepTool, _ := registry.Get("prepare_spell")
	prepResult, err := prepTool.Handler(map[string]interface{}{
		"session_id":   sessionID,
		"character_id": "wizard1",
		"spell_id":     "fireball",
	})
	if err != nil {
		t.Fatalf("prepare_spell failed: %v", err)
	}
	prepMap := prepResult.(map[string]interface{})
	if success, _ := prepMap["success"].(bool); !success {
		t.Fatal("prepare_spell should succeed")
	}
}

func TestIntegration_CastMultipleSpells(t *testing.T) {
	registry, stateMgr := setupSpellTestRegistry()
	sessionID := setupSpellSession(stateMgr)

	castTool, _ := registry.Get("cast_spell")

	// Cast magic missile twice.
	for i := 0; i < 2; i++ {
		result, err := castTool.Handler(map[string]interface{}{
			"session_id": sessionID,
			"caster_id":  "wizard1",
			"spell_id":   "magic_missile",
			"slot_level": float64(1),
		})
		if err != nil {
			t.Fatalf("cast %d failed: %v", i+1, err)
		}
		castRes := result.(*spell.CastSpellResult)
		if !castRes.Success {
			t.Fatalf("cast %d should succeed", i+1)
		}
	}

	// Verify slots consumed correctly.
	gs := stateMgr.GetSession(sessionID)
	if gs.Party[0].SpellSlots[1] != 2 {
		t.Errorf("expected 2 remaining level-1 slots after 2 casts, got %d", gs.Party[0].SpellSlots[1])
	}
}
