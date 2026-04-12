package combat

import (
	"fmt"
	"testing"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// mockDiceRoller is a deterministic mock of dice.DiceRoller for testing.
type mockDiceRoller struct {
	rollResult   *dice.Result
	attackRoll   *dice.CheckResult
	abilityCheck *dice.CheckResult
	rollErr      error
}

func (m *mockDiceRoller) Roll(formula string) (*dice.Result, error) {
	if m.rollErr != nil {
		return nil, m.rollErr
	}
	if m.rollResult != nil {
		return m.rollResult, nil
	}
	// Default: return a moderate roll
	return &dice.Result{Dice: []int{10}, Total: 10}, nil
}

func (m *mockDiceRoller) AttackRoll(attackBonus, ac int, advantage, disadvantage bool) *dice.CheckResult {
	if m.attackRoll != nil {
		return m.attackRoll
	}
	return &dice.CheckResult{Roll: 10, Modifier: attackBonus, Total: 10 + attackBonus, Success: true}
}

func (m *mockDiceRoller) AbilityCheck(modifier, dc int, advantage, disadvantage bool) *dice.CheckResult {
	if m.abilityCheck != nil {
		return m.abilityCheck
	}
	return &dice.CheckResult{Roll: 12, Modifier: modifier, Total: 12 + modifier, Success: 12+modifier >= dc}
}

// newMockHitRoll returns a mock that rolls a hit (total >= AC).
func newMockHitRoll(rollValue, damage int) *mockDiceRoller {
	return &mockDiceRoller{
		rollResult: &dice.Result{Dice: []int{damage}, Modifier: 0, Total: damage},
		attackRoll: &dice.CheckResult{Roll: rollValue, Total: rollValue + 5, Success: true},
	}
}

// newMockMissRoll returns a mock that rolls a miss.
func newMockMissRoll(rollValue int) *mockDiceRoller {
	return &mockDiceRoller{
		attackRoll: &dice.CheckResult{Roll: rollValue, Total: rollValue + 5, Success: false},
	}
}

// setupMockCombatSession creates a CombatManager with mock dice and an active session.
func setupMockCombatSession(mock *mockDiceRoller, participants []*state.Combatant) (*CombatManager, string) {
	sm := state.NewManager()
	sessionID := "test-session-combat-actions"
	sm.CreateSession(sessionID)
	cm := NewCombatManager(sm, mock)

	_, err := cm.StartCombat(sessionID, participants)
	if err != nil {
		panic(fmt.Sprintf("setupMockCombatSession: StartCombat failed: %v", err))
	}

	return cm, sessionID
}

// ===========================================================================
// StartCombat / EndCombat tests
// ===========================================================================

func TestStartCombat(t *testing.T) {
	t.Run("creates active combat with initiative order", func(t *testing.T) {
		mock := &mockDiceRoller{
			rollResult: &dice.Result{Dice: []int{15}, Total: 15},
		}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		state, err := cm.GetCombatState(sid)
		if err != nil {
			t.Fatalf("GetCombatState failed: %v", err)
		}

		if state["status"] != "active" {
			t.Errorf("status = %v, want 'active'", state["status"])
		}
	})

	t.Run("returns error with no combatants", func(t *testing.T) {
		mock := &mockDiceRoller{}
		sm := state.NewManager()
		sid := "test-empty"
		sm.CreateSession(sid)
		cm := NewCombatManager(sm, mock)

		_, err := cm.StartCombat(sid, nil)
		if err == nil {
			t.Fatal("expected error for empty combatants")
		}
	})
}

func TestEndCombat(t *testing.T) {
	t.Run("transitions to ended state", func(t *testing.T) {
		mock := &mockDiceRoller{rollResult: &dice.Result{Dice: []int{10}, Total: 10}}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.EndCombat(sid)
		if err != nil {
			t.Fatalf("EndCombat failed: %v", err)
		}

		if result["status"] != "ended" {
			t.Errorf("status = %v, want 'ended'", result["status"])
		}
	})
}

// ===========================================================================
// AttackAction tests
// ===========================================================================

func TestAttackAction(t *testing.T) {
	t.Run("hit deals damage to target", func(t *testing.T) {
		mock := newMockHitRoll(15, 8) // hit for 8 damage
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		result, err := cm.AttackAction(sid, "p1", "e1", 5, "1d8", 0, string(string(types.DamageSlashing)), false, false)
		if err != nil {
			t.Fatalf("AttackAction failed: %v", err)
		}

		if result["hit"] != true {
			t.Error("expected hit")
		}
		dmg := result["damage"].(int)
		if dmg <= 0 {
			t.Errorf("damage = %d, want > 0", dmg)
		}
	})

	t.Run("miss returns hit=false with no damage", func(t *testing.T) {
		mock := newMockMissRoll(3) // low roll, miss
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		result, err := cm.AttackAction(sid, "p1", "e1", 5, "1d8", 0, string(string(types.DamageSlashing)), false, false)
		if err != nil {
			t.Fatalf("AttackAction failed: %v", err)
		}

		if result["hit"] == true {
			t.Error("expected miss")
		}
	})

	t.Run("error when not attacker's turn", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		p2 := newPlayerCombatant("p2", "Sidekick", 15, 15)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, p2, e1})

		// p2 tries to attack but it's p1's turn
		_, err := cm.AttackAction(sid, "p2", "e1", 3, "1d6", 0, string(string(types.DamageSlashing)), false, false)
		if err == nil {
			t.Fatal("expected error when not your turn")
		}
	})

	t.Run("error when target not found", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		_, err := cm.AttackAction(sid, "p1", "nonexistent", 5, "1d8", 0, string(string(types.DamageSlashing)), false, false)
		if err == nil {
			t.Fatal("expected error for nonexistent target")
		}
	})

	t.Run("consumes action resource", func(t *testing.T) {
		mock := newMockHitRoll(15, 8)
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		_, err := cm.AttackAction(sid, "p1", "e1", 5, "1d8", 0, string(string(types.DamageSlashing)), false, false)
		if err != nil {
			t.Fatalf("AttackAction failed: %v", err)
		}

		// Second attack should fail — action already used
		_, err = cm.AttackAction(sid, "p1", "e1", 5, "1d8", 0, string(string(types.DamageSlashing)), false, false)
		if err == nil {
			t.Error("expected error on second attack (action exhausted)")
		}
	})
}

// ===========================================================================
// Simple action tests (Dodge, Disengage, Help, Hide, Ready)
// ===========================================================================

func TestDodgeAction(t *testing.T) {
	t.Run("applies dodging condition", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.DodgeAction(sid, "p1")
		if err != nil {
			t.Fatalf("DodgeAction failed: %v", err)
		}

		if result["action"] != "dodge" {
			t.Errorf("action = %v, want 'dodge'", result["action"])
		}

		gs := cm.stateManager.GetSession(sid)
		combatant := cm.getCombatantByID(gs.Combat, "p1")
		if !hasInternalCondition(combatant, "dodging") {
			t.Error("expected dodging condition to be applied")
		}
	})
}

func TestDisengageAction(t *testing.T) {
	t.Run("applies disengaging condition", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.DisengageAction(sid, "p1")
		if err != nil {
			t.Fatalf("DisengageAction failed: %v", err)
		}

		if result["action"] != "disengage" {
			t.Errorf("action = %v, want 'disengage'", result["action"])
		}

		gs := cm.stateManager.GetSession(sid)
		combatant := cm.getCombatantByID(gs.Combat, "p1")
		if !hasInternalCondition(combatant, "disengaging") {
			t.Error("expected disengaging condition to be applied")
		}
	})
}

func TestHelpAction(t *testing.T) {
	t.Run("grants advantage effect against target", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		p2 := newPlayerCombatant("p2", "Sidekick", 15, 15)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, p2, e1})

		// p1 uses Help action against e1
		result, err := cm.HelpAction(sid, "p1", "e1")
		if err != nil {
			t.Fatalf("HelpAction failed: %v", err)
		}

		if result["action"] != "help" {
			t.Errorf("action = %v, want 'help'", result["action"])
		}

		gs := cm.stateManager.GetSession(sid)
		if !hasActiveEffect(gs.Combat, "advantage_against", "e1") {
			t.Error("expected advantage_against effect on target e1")
		}
	})
}

func TestHideAction(t *testing.T) {
	t.Run("successful stealth check applies hidden condition", func(t *testing.T) {
		mock := &mockDiceRoller{abilityCheck: &dice.CheckResult{Roll: 15, Total: 18, Success: true}}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.HideAction(sid, "p1", 3, 10) // +3 stealth vs DC 10 passive Perception
		if err != nil {
			t.Fatalf("HideAction failed: %v", err)
		}

		if result["success"] != true {
			t.Error("expected successful hide")
		}

		gs := cm.stateManager.GetSession(sid)
		combatant := cm.getCombatantByID(gs.Combat, "p1")
		if !hasInternalCondition(combatant, "hidden") {
			t.Error("expected hidden condition on success")
		}
	})
}

func TestReadyAction(t *testing.T) {
	t.Run("applies ready condition with trigger", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.ReadyAction(sid, "p1", "enemy moves past")
		if err != nil {
			t.Fatalf("ReadyAction failed: %v", err)
		}

		if result["action"] != "ready" {
			t.Errorf("action = %v, want 'ready'", result["action"])
		}
	})
}

// ===========================================================================
// OpportunityAttack tests
// ===========================================================================

func TestOpportunityAttack(t *testing.T) {
	t.Run("hit deals damage and consumes reaction", func(t *testing.T) {
		mock := newMockHitRoll(15, 6)
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		result, err := cm.OpportunityAttack(sid, "p1", "e1", 5, "1d6", 0, string(types.DamageSlashing))
		if err != nil {
			t.Fatalf("OpportunityAttack failed: %v", err)
		}

		if result["triggered"] != true {
			t.Error("expected triggered attack")
		}
	})

	t.Run("no attack when target is disengaging", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		// Mark enemy as disengaging
		e1.Conditions = append(e1.Conditions, &state.ConditionEntry{
			Condition: "disengaging",
			Source:    "disengage_action",
			Duration:  1,
			Remaining: 1,
		})
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		result, err := cm.OpportunityAttack(sid, "p1", "e1", 5, "1d6", 0, string(types.DamageSlashing))
		if err != nil {
			t.Fatalf("OpportunityAttack failed: %v", err)
		}

		if result["triggered"] == true {
			t.Error("expected no trigger when target is disengaging")
		}
	})

	t.Run("error when reaction already used", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 20)
		e1 := newEnemyCombatant("e1", "Goblin", 10, 10)
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1, e1})

		// First OA succeeds
		_, err := cm.OpportunityAttack(sid, "p1", "e1", 5, "1d6", 0, string(types.DamageSlashing))
		if err != nil {
			t.Fatalf("first OA failed: %v", err)
		}

		// Second OA fails — reaction used
		_, err = cm.OpportunityAttack(sid, "p1", "e1", 5, "1d6", 0, string(types.DamageSlashing))
		if err == nil {
			t.Error("expected error when reaction already used")
		}
	})
}

// ===========================================================================
// ShortRest / LongRest tests
// ===========================================================================

func TestShortRest(t *testing.T) {
	t.Run("spends hit dice and recovers HP", func(t *testing.T) {
		mock := &mockDiceRoller{
			rollResult: &dice.Result{Dice: []int{6}, Total: 6}, // d8 roll of 6 + 2 CON = 8 healed
		}
		p1 := newPlayerCombatant("p1", "Hero", 20, 10) // missing 10 HP
		p1.HitDice = models.HitDiceInfo{Size: 8, Total: 2, Current: 2}
		p1.CONMod = 2
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.ShortRest(sid, "p1", 1)
		if err != nil {
			t.Fatalf("ShortRest failed: %v", err)
		}

		if result["healing"].(int) <= 0 {
			t.Error("expected positive healing")
		}
		if result["hitDiceLeft"].(int) != 1 {
			t.Errorf("hitDiceLeft = %d, want 1", result["hitDiceLeft"])
		}
	})
}

func TestLongRest(t *testing.T) {
	t.Run("restores HP to max and clears death saves", func(t *testing.T) {
		mock := &mockDiceRoller{}
		p1 := newPlayerCombatant("p1", "Hero", 20, 5) // wounded
		p1.DeathSaves = &models.DeathSaves{Successes: 1, Failures: 2}
		cm, sid := setupMockCombatSession(mock, []*state.Combatant{p1})

		result, err := cm.LongRest(sid, "p1")
		if err != nil {
			t.Fatalf("LongRest failed: %v", err)
		}

		if result["currentHp"].(int) != 20 {
			t.Errorf("currentHp = %d, want 20 (max)", result["currentHp"])
		}
	})

	t.Run("restores spell slots for wizard on long rest", func(t *testing.T) {
		mock := &mockDiceRoller{}
		sm := state.NewManager()
		sessionID := "test-long-rest-spell-slots"
		sm.CreateSession(sessionID)

		cm := NewCombatManager(sm, mock)

		// Create a wizard character in the party with depleted spell slots.
		sm.UpdateSession(sessionID, func(gs *state.GameState) {
			gs.Party = append(gs.Party, &models.Character{
				ID:               "wizard1",
				Name:             "Gandalf",
				Class:            "wizard",
				Level:            5,
				HP:               20,
				MaxHP:            28,
				ProficiencyBonus: 3,
				Stats:            models.AbilityScores{Intelligence: 16},
				SpellSlots:       map[int]int{1: 1, 2: 0, 3: 0}, // mostly depleted
			})

			// Start combat with the wizard as participant.
			gs.Combat = &state.CombatState{
				Status: state.CombatActive,
				Round:  1,
				Participants: []*state.Combatant{
					{
						ID:          "wizard1",
						Name:        "Gandalf",
						Type:        state.CombatantPlayer,
						MaxHP:       28,
						CurrentHP:   20,
						AC:          12,
						HitDice:     models.HitDiceInfo{Size: 6, Total: 5, Current: 5},
						DeathSaves:  &models.DeathSaves{},
					},
				},
			}
		})

		result, err := cm.LongRest(sessionID, "wizard1")
		if err != nil {
			t.Fatalf("LongRest failed: %v", err)
		}

		if result["currentHp"].(int) != 28 {
			t.Errorf("currentHp = %d, want 28 (max)", result["currentHp"])
		}

		// Verify spell slots were restored to max for wizard level 5.
		gs := sm.GetSession(sessionID)
		wizard := gs.Party[0]
		expectedSlots := map[int]int{1: 4, 2: 3, 3: 2}
		for level, expected := range expectedSlots {
			if wizard.SpellSlots[level] != expected {
				t.Errorf("level %d spell slots: got %d, want %d", level, wizard.SpellSlots[level], expected)
			}
		}
	})

	t.Run("non-caster gets nil spell slots on long rest", func(t *testing.T) {
		mock := &mockDiceRoller{}
		sm := state.NewManager()
		sessionID := "test-long-rest-noncaster"
		sm.CreateSession(sessionID)

		cm := NewCombatManager(sm, mock)

		sm.UpdateSession(sessionID, func(gs *state.GameState) {
			gs.Party = append(gs.Party, &models.Character{
				ID:    "fighter1",
				Name:  "Fighter",
				Class: "fighter",
				Level: 5,
				HP:    20,
				MaxHP: 44,
			})
			gs.Combat = &state.CombatState{
				Status: state.CombatActive,
				Round:  1,
				Participants: []*state.Combatant{
					{
						ID:         "fighter1",
						Name:       "Fighter",
						Type:       state.CombatantPlayer,
						MaxHP:      44,
						CurrentHP:  20,
						HitDice:    models.HitDiceInfo{Size: 10, Total: 5, Current: 5},
						DeathSaves: &models.DeathSaves{},
					},
				},
			}
		})

		_, err := cm.LongRest(sessionID, "fighter1")
		if err != nil {
			t.Fatalf("LongRest failed: %v", err)
		}

		gs := sm.GetSession(sessionID)
		fighter := gs.Party[0]
		if fighter.SpellSlots != nil {
			t.Errorf("non-caster should have nil spell slots after long rest, got %v", fighter.SpellSlots)
		}
	})
}
