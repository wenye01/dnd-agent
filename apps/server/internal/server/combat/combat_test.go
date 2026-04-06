package combat

import (
	"testing"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
)

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

// newPlayerCombatant creates a player combatant with sensible defaults.
func newPlayerCombatant(id, name string, maxHP, currentHP int) *state.Combatant {
	return &state.Combatant{
		ID:        id,
		Name:      name,
		Type:      state.CombatantPlayer,
		MaxHP:     maxHP,
		CurrentHP: currentHP,
		AC:        15,
		DexScore:  10,
		DeathSaves: &models.DeathSaves{
			Successes: 0,
			Failures:  0,
		},
	}
}

// newEnemyCombatant creates an enemy combatant with sensible defaults.
func newEnemyCombatant(id, name string, maxHP, currentHP int) *state.Combatant {
	return &state.Combatant{
		ID:        id,
		Name:      name,
		Type:      state.CombatantEnemy,
		MaxHP:     maxHP,
		CurrentHP: currentHP,
		AC:        12,
		DexScore:  10,
	}
}

// hasConditionInList is a test helper that checks whether a named condition
// exists in the combatant's condition list.
func hasConditionInList(c *state.Combatant, name string) bool {
	for _, cond := range c.Conditions {
		if cond.Condition == name {
			return true
		}
	}
	return false
}

// countConditionEntries counts how many condition entries with the given name exist.
func countConditionEntries(c *state.Combatant, name string) int {
	n := 0
	for _, cond := range c.Conditions {
		if cond.Condition == name {
			n++
		}
	}
	return n
}

// setupCombatSession creates a CombatManager with a real state manager and dice service,
// along with an active combat session containing the given participants.
func setupCombatSession(participants []*state.Combatant) (*CombatManager, string) {
	sm := state.NewManager()
	gs := sm.CreateSession("test-session")
	gs.Combat = &state.CombatState{
		Status:       state.CombatActive,
		Round:        1,
		Participants: participants,
		Initiatives:  make([]*state.InitiativeEntry, 0),
	}
	for _, p := range participants {
		gs.Combat.Initiatives = append(gs.Combat.Initiatives, &state.InitiativeEntry{
			CharacterID: p.ID,
			Initiative:  10,
		})
	}

	diceSvc := dice.NewService()
	cm := NewCombatManager(sm, diceSvc)
	return cm, "test-session"
}

// ===========================================================================
// 1. Damage Calculation Tests (ApplyDamageToCombatant)
// ===========================================================================

func TestApplyDamageToCombatant(t *testing.T) {
	t.Run("normal damage reduces HP", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 20, 20)
		result := ApplyDamageToCombatant(c, 5, "slashing")

		if result.OriginalDamage != 5 {
			t.Errorf("OriginalDamage = %d, want 5", result.OriginalDamage)
		}
		if result.ModifiedDamage != 5 {
			t.Errorf("ModifiedDamage = %d, want 5", result.ModifiedDamage)
		}
		if result.CurrentHP != 15 {
			t.Errorf("CurrentHP = %d, want 15", result.CurrentHP)
		}
		if result.ResistanceApplied {
			t.Error("ResistanceApplied should be false")
		}
		if result.ImmunityApplied {
			t.Error("ImmunityApplied should be false")
		}
		if result.Dead || result.Unconscious {
			t.Error("Combatant should not be dead or unconscious")
		}
	})

	t.Run("damage resistance halves damage", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 20, 20)
		c.DamageResistances = []string{"fire"}

		result := ApplyDamageToCombatant(c, 10, "fire")

		if !result.ResistanceApplied {
			t.Error("ResistanceApplied should be true")
		}
		if result.ModifiedDamage != 5 {
			t.Errorf("ModifiedDamage = %d, want 5 (10/2)", result.ModifiedDamage)
		}
		if result.CurrentHP != 15 {
			t.Errorf("CurrentHP = %d, want 15", result.CurrentHP)
		}
	})

	t.Run("damage resistance odd number rounds down", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 20, 20)
		c.DamageResistances = []string{"fire"}

		result := ApplyDamageToCombatant(c, 7, "fire")

		// 7 / 2 = 3 (integer division rounds down)
		if result.ModifiedDamage != 3 {
			t.Errorf("ModifiedDamage = %d, want 3 (7/2 rounded down)", result.ModifiedDamage)
		}
		if result.CurrentHP != 17 {
			t.Errorf("CurrentHP = %d, want 17", result.CurrentHP)
		}
	})

	t.Run("damage immunity results in zero damage", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Fire Elemental", 20, 20)
		c.DamageImmunities = []string{"fire"}

		result := ApplyDamageToCombatant(c, 15, "fire")

		if !result.ImmunityApplied {
			t.Error("ImmunityApplied should be true")
		}
		if result.ModifiedDamage != 0 {
			t.Errorf("ModifiedDamage = %d, want 0", result.ModifiedDamage)
		}
		if result.CurrentHP != 20 {
			t.Errorf("CurrentHP = %d, want 20 (unchanged)", result.CurrentHP)
		}
		if result.ResistanceApplied {
			t.Error("ResistanceApplied should be false when immunity applies")
		}
	})

	t.Run("temporary HP absorbs damage first", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 20, 18)
		c.TemporaryHP = 5

		result := ApplyDamageToCombatant(c, 7, "slashing")

		if result.TempHPAbsorbed != 5 {
			t.Errorf("TempHPAbsorbed = %d, want 5", result.TempHPAbsorbed)
		}
		if result.ModifiedDamage != 2 {
			t.Errorf("ModifiedDamage = %d, want 2 (7 - 5 temp)", result.ModifiedDamage)
		}
		if result.TemporaryHP != 0 {
			t.Errorf("TemporaryHP = %d, want 0", result.TemporaryHP)
		}
		if result.CurrentHP != 16 {
			t.Errorf("CurrentHP = %d, want 16 (18 - 2)", result.CurrentHP)
		}
	})

	t.Run("temporary HP fully absorbs damage", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 20, 18)
		c.TemporaryHP = 10

		result := ApplyDamageToCombatant(c, 5, "slashing")

		if result.TempHPAbsorbed != 5 {
			t.Errorf("TempHPAbsorbed = %d, want 5", result.TempHPAbsorbed)
		}
		if result.ModifiedDamage != 0 {
			t.Errorf("ModifiedDamage = %d, want 0", result.ModifiedDamage)
		}
		if result.TemporaryHP != 5 {
			t.Errorf("TemporaryHP = %d, want 5 (10 - 5)", result.TemporaryHP)
		}
		if result.CurrentHP != 18 {
			t.Errorf("CurrentHP = %d, want 18 (unchanged)", result.CurrentHP)
		}
	})

	t.Run("damage reduces player to 0 HP causes unconscious", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 5)

		result := ApplyDamageToCombatant(c, 5, "slashing")

		if result.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0", result.CurrentHP)
		}
		if !result.Unconscious {
			t.Error("Player at 0 HP should be unconscious")
		}
		if result.Dead {
			t.Error("Player at 0 HP should not be dead")
		}
	})

	t.Run("overkill damage sets HP to 0 and causes unconscious", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 3)

		result := ApplyDamageToCombatant(c, 50, "slashing")

		if result.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0 (clamped)", result.CurrentHP)
		}
		if !result.Unconscious {
			t.Error("Player should be unconscious")
		}
	})

	t.Run("damage reduces enemy to 0 HP causes death", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 7, 7)

		result := ApplyDamageToCombatant(c, 7, "slashing")

		if result.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0", result.CurrentHP)
		}
		if !result.Dead {
			t.Error("Enemy at 0 HP should be dead")
		}
		if result.Unconscious {
			t.Error("Enemy should not be unconscious")
		}
	})

	t.Run("enemy overkill also dead", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 7, 3)

		result := ApplyDamageToCombatant(c, 100, "slashing")

		if result.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0", result.CurrentHP)
		}
	})

	t.Run("resistance plus temporary HP combined", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Fire Elemental", 20, 15)
		c.DamageResistances = []string{"fire"}
		c.TemporaryHP = 3

		// 10 fire damage -> 5 from resistance, then 3 absorbed by temp HP -> 2 real damage
		result := ApplyDamageToCombatant(c, 10, "fire")

		if !result.ResistanceApplied {
			t.Error("ResistanceApplied should be true")
		}
		if result.ModifiedDamage != 2 {
			t.Errorf("ModifiedDamage = %d, want 2", result.ModifiedDamage)
		}
		if result.TempHPAbsorbed != 3 {
			t.Errorf("TempHPAbsorbed = %d, want 3", result.TempHPAbsorbed)
		}
		if result.TemporaryHP != 0 {
			t.Errorf("TemporaryHP = %d, want 0", result.TemporaryHP)
		}
		if result.CurrentHP != 13 {
			t.Errorf("CurrentHP = %d, want 13 (15 - 2)", result.CurrentHP)
		}
	})

	t.Run("NPC type at 0 HP is dead", func(t *testing.T) {
		c := &state.Combatant{
			ID:        "npc1",
			Name:      "Villager",
			Type:      state.CombatantNPC,
			MaxHP:     10,
			CurrentHP: 5,
		}

		result := ApplyDamageToCombatant(c, 5, "slashing")

		if result.Unconscious {
			t.Error("NPC should not be unconscious")
		}
		if !result.Dead {
			t.Error("NPC at 0 HP should be dead")
		}
	})

	t.Run("player without DeathSaves at 0 HP is dead", func(t *testing.T) {
		c := &state.Combatant{
			ID:        "p1",
			Name:      "Hero",
			Type:      state.CombatantPlayer,
			MaxHP:     10,
			CurrentHP: 5,
			// DeathSaves is nil
		}

		result := ApplyDamageToCombatant(c, 5, "slashing")

		if result.Unconscious {
			t.Error("Player without DeathSaves should not be unconscious")
		}
		if !result.Dead {
			t.Error("Player without DeathSaves at 0 HP should be dead")
		}
	})
}

// ===========================================================================
// 2. Healing Tests (applyHealingToCombatant)
// ===========================================================================

func TestApplyHealingToCombatant(t *testing.T) {
	t.Run("normal healing increases HP", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 10)

		result := applyHealingToCombatant(c, 5)

		if result.Healing != 5 {
			t.Errorf("Healing = %d, want 5", result.Healing)
		}
		if result.CurrentHP != 15 {
			t.Errorf("CurrentHP = %d, want 15", result.CurrentHP)
		}
	})

	t.Run("healing caps at MaxHP", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 18)

		result := applyHealingToCombatant(c, 10)

		if result.Healing != 2 {
			t.Errorf("Healing = %d, want 2 (capped at MaxHP)", result.Healing)
		}
		if result.CurrentHP != 20 {
			t.Errorf("CurrentHP = %d, want 20 (MaxHP)", result.CurrentHP)
		}
	})

	t.Run("healing at full HP does nothing", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)

		result := applyHealingToCombatant(c, 5)

		if result.Healing != 0 {
			t.Errorf("Healing = %d, want 0", result.Healing)
		}
		if result.CurrentHP != 20 {
			t.Errorf("CurrentHP = %d, want 20", result.CurrentHP)
		}
	})

	t.Run("healing restores consciousness from 0 HP", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 0)
		c.Conditions = append(c.Conditions, &state.ConditionEntry{
			Condition: "unconscious",
			Source:    "damage",
			Duration:  0,
			Remaining: 0,
		})
		c.DeathSaves.Successes = 2
		c.DeathSaves.Failures = 1

		result := applyHealingToCombatant(c, 5)

		if !result.Conscious {
			t.Error("Conscious should be true when healed above 0 HP")
		}
		if result.CurrentHP != 5 {
			t.Errorf("CurrentHP = %d, want 5", result.CurrentHP)
		}
		if hasConditionInList(c, "unconscious") {
			t.Error("unconscious condition should be removed")
		}
		if c.DeathSaves.Successes != 0 {
			t.Errorf("DeathSaves.Successes = %d, want 0 (cleared)", c.DeathSaves.Successes)
		}
		if c.DeathSaves.Failures != 0 {
			t.Errorf("DeathSaves.Failures = %d, want 0 (cleared)", c.DeathSaves.Failures)
		}
	})

	t.Run("healing at 0 HP with 0 healing does not restore consciousness", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 0)

		result := applyHealingToCombatant(c, 0)

		if result.Conscious {
			t.Error("Conscious should be false with 0 healing")
		}
		if result.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0", result.CurrentHP)
		}
	})

	t.Run("healing enemy from 0 HP", func(t *testing.T) {
		c := newEnemyCombatant("e1", "Goblin", 7, 0)

		result := applyHealingToCombatant(c, 3)

		if result.CurrentHP != 3 {
			t.Errorf("CurrentHP = %d, want 3", result.CurrentHP)
		}
		// For enemies at 0 HP, Conscious is wasUnconscious (CurrentHP==0) && c.CurrentHP > 0
		if !result.Conscious {
			t.Error("Healing from 0 HP should report Conscious = true")
		}
	})
}

// ===========================================================================
// 3. Death Save Tests
//
// Since CombatManager uses *dice.Service (concrete type, not an interface),
// we cannot inject a mock. Instead we test state invariants: after a DeathSave
// call, the roll outcome (success/failure/nat1/nat20) determines the state
// change. We verify the state is internally consistent regardless of the roll.
// ===========================================================================

func TestDeathSave(t *testing.T) {
	t.Run("single death save changes state correctly", func(t *testing.T) {
		player := &state.Combatant{
			ID:         "p1",
			Name:       "Hero",
			Type:       state.CombatantPlayer,
			MaxHP:      20,
			CurrentHP:  0,
			DexScore:   10,
			DeathSaves: &models.DeathSaves{},
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{player})

		result, err := cm.DeathSave(sessionID, "p1")
		if err != nil {
			t.Fatalf("DeathSave() error = %v", err)
		}

		roll := result["roll"].(int)
		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]

		if roll == 20 {
			// Natural 20: regain 1 HP, clear death saves
			if result["special"] != "natural_20" {
				t.Errorf("special = %v, want 'natural_20'", result["special"])
			}
			if c.CurrentHP != 1 {
				t.Errorf("CurrentHP = %d, want 1 (nat 20)", c.CurrentHP)
			}
			if c.DeathSaves.Successes != 0 || c.DeathSaves.Failures != 0 {
				t.Errorf("Death saves should be cleared: successes=%d failures=%d",
					c.DeathSaves.Successes, c.DeathSaves.Failures)
			}
		} else if roll == 1 {
			// Natural 1: 2 failures
			if result["special"] != "natural_1" {
				t.Errorf("special = %v, want 'natural_1'", result["special"])
			}
			if c.DeathSaves.Failures != 2 {
				t.Errorf("Failures = %d, want 2 (nat 1)", c.DeathSaves.Failures)
			}
		} else if roll >= 10 {
			// Success
			if result["isSuccess"] != true {
				t.Error("roll >= 10 should be isSuccess = true")
			}
			if c.DeathSaves.Successes != 1 {
				t.Errorf("Successes = %d, want 1", c.DeathSaves.Successes)
			}
		} else {
			// Failure (roll < 10, not nat 1)
			if result["isSuccess"] != false {
				t.Error("roll < 10 should be isSuccess = false")
			}
			if c.DeathSaves.Failures != 1 {
				t.Errorf("Failures = %d, want 1", c.DeathSaves.Failures)
			}
		}
	})

	t.Run("3 failures cause death", func(t *testing.T) {
		player := &state.Combatant{
			ID:        "p1",
			Name:      "Hero",
			Type:      state.CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 0,
			DexScore:  10,
			DeathSaves: &models.DeathSaves{
				Successes: 0,
				Failures:  2, // 2 failures already
			},
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{player})

		result, err := cm.DeathSave(sessionID, "p1")
		if err != nil {
			t.Fatalf("DeathSave() error = %v", err)
		}

		roll := result["roll"].(int)
		if roll == 20 {
			t.Skip("Skipped: got natural 20 (1/20 chance), which resets instead of death")
		}

		if roll == 1 {
			// Nat 1 adds 2 failures -> 4 total -> death
			if result["dead"] == nil || !result["dead"].(bool) {
				t.Error("Expected dead after nat 1 with 2 prior failures")
			}
		} else if roll < 10 {
			// Normal failure adds 1 -> 3 total -> death
			if result["dead"] == nil || !result["dead"].(bool) {
				t.Error("Expected dead after failure with 2 prior failures")
			}
		} else {
			// Roll >= 10 is a success, so no death yet
			if result["dead"] != nil && result["dead"].(bool) {
				t.Error("Success should not cause death")
			}
		}
	})

	t.Run("3 successes stabilize", func(t *testing.T) {
		player := &state.Combatant{
			ID:        "p1",
			Name:      "Hero",
			Type:      state.CombatantPlayer,
			MaxHP:     20,
			CurrentHP: 0,
			DexScore:  10,
			DeathSaves: &models.DeathSaves{
				Successes: 2, // 2 successes already
				Failures:  0,
			},
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{player})

		result, err := cm.DeathSave(sessionID, "p1")
		if err != nil {
			t.Fatalf("DeathSave() error = %v", err)
		}

		roll := result["roll"].(int)
		if roll == 20 {
			// Nat 20 resets everything and regains 1 HP (stronger than stabilize)
			if c := cm.GetStateManager().GetSession(sessionID).Combat.Participants[0]; c.CurrentHP != 1 {
				t.Errorf("Nat 20 with 2 prior successes: should regain 1 HP, got %d", c.CurrentHP)
			}
		} else if roll == 1 {
			// Nat 1 adds 2 failures, not a success -> no stabilize
			if result["stable"] != nil && result["stable"].(bool) {
				t.Error("Nat 1 should not stabilize")
			}
		} else if roll >= 10 {
			// Success: 3rd success -> stabilize
			if result["stable"] == nil || !result["stable"].(bool) {
				t.Error("3rd success should stabilize")
			}
		} else {
			// Failure: not stabilize
			if result["stable"] != nil && result["stable"].(bool) {
				t.Error("Failure should not stabilize")
			}
		}
	})

	t.Run("cannot death save when HP > 0", func(t *testing.T) {
		player := &state.Combatant{
			ID:         "p1",
			Name:       "Hero",
			Type:       state.CombatantPlayer,
			MaxHP:      20,
			CurrentHP:  5,
			DexScore:   10,
			DeathSaves: &models.DeathSaves{},
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{player})

		_, err := cm.DeathSave(sessionID, "p1")
		if err == nil {
			t.Fatal("Expected error when HP > 0")
		}
	})

	t.Run("cannot death save without DeathSaves", func(t *testing.T) {
		enemy := &state.Combatant{
			ID:        "e1",
			Name:      "Goblin",
			Type:      state.CombatantEnemy,
			MaxHP:     7,
			CurrentHP: 0,
			DexScore:  10,
			// No DeathSaves
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{enemy})

		_, err := cm.DeathSave(sessionID, "e1")
		if err == nil {
			t.Fatal("Expected error when DeathSaves is nil")
		}
	})

	t.Run("session not found returns error", func(t *testing.T) {
		sm := state.NewManager()
		diceSvc := dice.NewService()
		cm := NewCombatManager(sm, diceSvc)

		_, err := cm.DeathSave("nonexistent", "p1")
		if err == nil {
			t.Fatal("Expected error for nonexistent session")
		}
	})

	t.Run("combatant not found returns error", func(t *testing.T) {
		player := &state.Combatant{
			ID:         "p1",
			Name:       "Hero",
			Type:       state.CombatantPlayer,
			MaxHP:      20,
			CurrentHP:  0,
			DexScore:   10,
			DeathSaves: &models.DeathSaves{},
		}
		cm, sessionID := setupCombatSession([]*state.Combatant{player})

		_, err := cm.DeathSave(sessionID, "nonexistent")
		if err == nil {
			t.Fatal("Expected error for nonexistent combatant")
		}
	})
}

// ===========================================================================
// 4. Condition Tests
// ===========================================================================

func TestApplyCondition(t *testing.T) {
	setupConditionTest := func() (*CombatManager, string) {
		sm := state.NewManager()
		gs := sm.CreateSession("test-session")
		gs.Combat = &state.CombatState{
			Status: state.CombatActive,
			Round:  1,
			Participants: []*state.Combatant{
				{
					ID:   "e1",
					Name: "Goblin",
					Type: state.CombatantEnemy,
				},
			},
		}
		diceSvc := dice.NewService()
		cm := NewCombatManager(sm, diceSvc)
		return cm, "test-session"
	}

	t.Run("apply condition adds to combatant", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		result, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell", 3, 0)
		if err != nil {
			t.Fatalf("ApplyCondition() error = %v", err)
		}

		if result["condition"] != "blinded" {
			t.Errorf("condition = %v, want 'blinded'", result["condition"])
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if !hasConditionInList(c, "blinded") {
			t.Error("blinded condition should be present on combatant")
		}
	})

	t.Run("apply existing condition updates duration if longer", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		_, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell", 2, 0)
		if err != nil {
			t.Fatalf("First ApplyCondition() error = %v", err)
		}

		result, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell2", 5, 0)
		if err != nil {
			t.Fatalf("Second ApplyCondition() error = %v", err)
		}

		if result["updated"] != true {
			t.Error("Expected updated = true for existing condition")
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if count := countConditionEntries(c, "blinded"); count != 1 {
			t.Errorf("Expected 1 blinded entry, got %d", count)
		}
		for _, cond := range c.Conditions {
			if cond.Condition == "blinded" {
				if cond.Duration != 5 {
					t.Errorf("Duration = %d, want 5", cond.Duration)
				}
				if cond.Remaining != 5 {
					t.Errorf("Remaining = %d, want 5", cond.Remaining)
				}
			}
		}
	})

	t.Run("apply existing condition does not shorten duration", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		_, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell", 5, 0)
		if err != nil {
			t.Fatalf("First ApplyCondition() error = %v", err)
		}

		result, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell2", 2, 0)
		if err != nil {
			t.Fatalf("Second ApplyCondition() error = %v", err)
		}

		if result["updated"] != true {
			t.Error("Expected updated = true for existing condition")
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		for _, cond := range c.Conditions {
			if cond.Condition == "blinded" {
				if cond.Duration != 5 {
					t.Errorf("Duration = %d, want 5 (should not be shortened)", cond.Duration)
				}
			}
		}
	})

	t.Run("existing condition updated when new duration is 0 (indefinite)", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		// Apply with duration 2
		_, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell", 2, 0)
		if err != nil {
			t.Fatalf("First ApplyCondition() error = %v", err)
		}

		// Apply again with duration 0 (indefinite) -- should update since duration==0 is treated as longer
		_, err = cm.ApplyCondition(sessionID, "e1", "blinded", "spell2", 0, 0)
		if err != nil {
			t.Fatalf("Second ApplyCondition() error = %v", err)
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		for _, cond := range c.Conditions {
			if cond.Condition == "blinded" {
				if cond.Duration != 0 {
					t.Errorf("Duration = %d, want 0 (indefinite override)", cond.Duration)
				}
			}
		}
	})

	t.Run("remove condition works", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		_, err := cm.ApplyCondition(sessionID, "e1", "blinded", "spell", 3, 0)
		if err != nil {
			t.Fatalf("ApplyCondition() error = %v", err)
		}

		result, err := cm.RemoveCondition(sessionID, "e1", "blinded")
		if err != nil {
			t.Fatalf("RemoveCondition() error = %v", err)
		}

		if result["removed"] != true {
			t.Error("removed should be true")
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if hasConditionInList(c, "blinded") {
			t.Error("blinded condition should be removed")
		}
	})

	t.Run("remove non-existent condition returns removed false", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		result, err := cm.RemoveCondition(sessionID, "e1", "blinded")
		if err != nil {
			t.Fatalf("RemoveCondition() error = %v", err)
		}

		if result["removed"] != false {
			t.Error("removed should be false for non-existent condition")
		}
	})

	t.Run("exhaustion levels stack", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		result, err := cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 2)
		if err != nil {
			t.Fatalf("ApplyCondition(exhaustion, 2) error = %v", err)
		}
		if result["level"] != 2 {
			t.Errorf("level = %v, want 2", result["level"])
		}

		result, err = cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 1)
		if err != nil {
			t.Fatalf("ApplyCondition(exhaustion, 1) error = %v", err)
		}
		if result["level"] != 3 {
			t.Errorf("level = %v, want 3 (2+1)", result["level"])
		}

		result, err = cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 3)
		if err != nil {
			t.Fatalf("ApplyCondition(exhaustion, 3) error = %v", err)
		}
		if result["level"] != 6 {
			t.Errorf("level = %v, want 6 (capped)", result["level"])
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if count := countConditionEntries(c, "exhaustion"); count != 1 {
			t.Errorf("Expected 1 exhaustion entry, got %d", count)
		}
	})

	t.Run("exhaustion level 6 causes death", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		result, err := cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 6)
		if err != nil {
			t.Fatalf("ApplyCondition(exhaustion, 6) error = %v", err)
		}

		if result["dead"] != true {
			t.Error("Exhaustion level 6 should cause death")
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if c.CurrentHP != 0 {
			t.Errorf("CurrentHP = %d, want 0 (dead from exhaustion)", c.CurrentHP)
		}
		if !hasConditionInList(c, "dead") {
			t.Error("dead condition should be present")
		}
	})

	t.Run("exhaustion capped at level 6 even with excessive input", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 4)

		result, err := cm.ApplyCondition(sessionID, "e1", "exhaustion", "combat", 0, 5)
		if err != nil {
			t.Fatalf("ApplyCondition() error = %v", err)
		}

		if result["dead"] != true {
			t.Error("Should be dead when exhaustion exceeds 6")
		}
	})

	t.Run("unconscious automatically adds prone", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		_, err := cm.ApplyCondition(sessionID, "e1", "unconscious", "damage", 0, 0)
		if err != nil {
			t.Fatalf("ApplyCondition(unconscious) error = %v", err)
		}

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if !hasConditionInList(c, "unconscious") {
			t.Error("unconscious condition should be present")
		}
		if !hasConditionInList(c, "prone") {
			t.Error("prone condition should be auto-added with unconscious")
		}
	})

	t.Run("unconscious does not add duplicate prone", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		cm.ApplyCondition(sessionID, "e1", "prone", "fall", 0, 0)
		cm.ApplyCondition(sessionID, "e1", "unconscious", "damage", 0, 0)

		gs := cm.GetStateManager().GetSession(sessionID)
		c := gs.Combat.Participants[0]
		if count := countConditionEntries(c, "prone"); count != 1 {
			t.Errorf("Expected 1 prone entry, got %d", count)
		}
	})

	t.Run("invalid condition returns error", func(t *testing.T) {
		cm, sessionID := setupConditionTest()

		_, err := cm.ApplyCondition(sessionID, "e1", "not_a_real_condition", "test", 0, 0)
		if err == nil {
			t.Fatal("Expected error for invalid condition")
		}
	})
}

// ===========================================================================
// 5. Condition Modifiers Tests (GetConditionModifiers)
// ===========================================================================

func TestGetConditionModifiers(t *testing.T) {
	t.Run("no conditions returns zero modifiers", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		mod := GetConditionModifiers(c)

		if mod.AttackAdvantage || mod.AttackDisadvantage {
			t.Error("No attack modifiers expected")
		}
		if mod.DefenseAdvantage || mod.DefenseDisadvantage {
			t.Error("No defense modifiers expected")
		}
		if mod.Incapacitated || mod.AutoFailSTRDEX || mod.AutoCritMelee {
			t.Error("No special modifiers expected")
		}
	})

	t.Run("blinded gives attack disadvantage and defense advantage", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.AttackDisadvantage {
			t.Error("blinded should give AttackDisadvantage")
		}
		if !mod.DefenseAdvantage {
			t.Error("blinded should give DefenseAdvantage")
		}
		if mod.AttackAdvantage {
			t.Error("blinded should not give AttackAdvantage")
		}
	})

	t.Run("invisible gives attack advantage and defense disadvantage", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "invisible", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.AttackAdvantage {
			t.Error("invisible should give AttackAdvantage")
		}
		if !mod.DefenseDisadvantage {
			t.Error("invisible should give DefenseDisadvantage")
		}
	})

	t.Run("paralyzed gives incapacitated, auto-fail STR/DEX, auto-crit melee", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "paralyzed", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.Incapacitated {
			t.Error("paralyzed should give Incapacitated")
		}
		if !mod.AutoFailSTRDEX {
			t.Error("paralyzed should give AutoFailSTRDEX")
		}
		if !mod.AutoCritMelee {
			t.Error("paralyzed should give AutoCritMelee")
		}
	})

	t.Run("stunned gives incapacitated and defense advantage", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "stunned", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.Incapacitated {
			t.Error("stunned should give Incapacitated")
		}
		if !mod.DefenseAdvantage {
			t.Error("stunned should give DefenseAdvantage")
		}
		if !mod.AutoFailSTRDEX {
			t.Error("stunned should give AutoFailSTRDEX")
		}
	})

	t.Run("multiple conditions merge correctly (blinded + prone)", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
			{Condition: "prone", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.AttackDisadvantage {
			t.Error("blinded + prone should give AttackDisadvantage")
		}
		// blinded gives DefenseAdvantage; prone intentionally does not set DefenseAdvantage
		if !mod.DefenseAdvantage {
			t.Error("blinded should give DefenseAdvantage (prone does not affect this)")
		}
	})

	t.Run("exhaustion level 1 gives attack disadvantage", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "exhaustion", Duration: 0, Remaining: 0, Level: 1},
		}

		mod := GetConditionModifiers(c)

		if !mod.AttackDisadvantage {
			t.Error("exhaustion level 1 should give AttackDisadvantage")
		}
	})

	t.Run("exhaustion level 0 treated as level 1", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "exhaustion", Duration: 0, Remaining: 0, Level: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.AttackDisadvantage {
			t.Error("exhaustion level 0 should be treated as level 1")
		}
	})

	t.Run("unconscious gives all modifiers", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "unconscious", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.Incapacitated {
			t.Error("unconscious should give Incapacitated")
		}
		if !mod.AutoFailSTRDEX {
			t.Error("unconscious should give AutoFailSTRDEX")
		}
		if !mod.AutoCritMelee {
			t.Error("unconscious should give AutoCritMelee")
		}
		if !mod.DefenseAdvantage {
			t.Error("unconscious should give DefenseAdvantage")
		}
	})

	t.Run("grappled sets speed to 0", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "grappled", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if mod.SpeedOverride != 0 {
			t.Errorf("grappled SpeedOverride = %d, want 0", mod.SpeedOverride)
		}
	})

	t.Run("petrified gives incapacitated, auto-fail, and resistance", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "petrified", Duration: 0, Remaining: 0},
		}

		mod := GetConditionModifiers(c)

		if !mod.Incapacitated {
			t.Error("petrified should give Incapacitated")
		}
		if !mod.AutoFailSTRDEX {
			t.Error("petrified should give AutoFailSTRDEX")
		}
		if !mod.DamageResistance {
			t.Error("petrified should give DamageResistance")
		}
	})
}

// ===========================================================================
// 5b. applyConditionAttackModifiers Tests
// ===========================================================================

func TestApplyConditionAttackModifiers(t *testing.T) {
	tests := []struct {
		name              string
		attackerConds     []string
		targetConds       []string
		inputAdvantage    bool
		inputDisadvantage bool
		wantAdvantage     bool
		wantDisadvantage  bool
	}{
		{
			name:              "no conditions: no change",
			attackerConds:     nil,
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  false,
		},
		{
			name:              "blinded attacker: disadvantage",
			attackerConds:     []string{"blinded"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "invisible attacker: advantage",
			attackerConds:     []string{"invisible"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "invisible target: disadvantage to attack",
			attackerConds:     nil,
			targetConds:       []string{"invisible"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "paralyzed target: advantage",
			attackerConds:     nil,
			targetConds:       []string{"paralyzed"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "poisoned attacker: disadvantage",
			attackerConds:     []string{"poisoned"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "frightened attacker: disadvantage",
			attackerConds:     []string{"frightened"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "prone attacker: disadvantage",
			attackerConds:     []string{"prone"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "restrained attacker: disadvantage",
			attackerConds:     []string{"restrained"},
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "restrained target: advantage",
			attackerConds:     nil,
			targetConds:       []string{"restrained"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "stunned target: advantage",
			attackerConds:     nil,
			targetConds:       []string{"stunned"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "unconscious target: advantage",
			attackerConds:     nil,
			targetConds:       []string{"unconscious"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "dodging target: disadvantage",
			attackerConds:     nil,
			targetConds:       []string{"dodging"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "petrified target: advantage",
			attackerConds:     nil,
			targetConds:       []string{"petrified"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "blinded attacker + invisible target: both set (disadvantage wins for both)",
			attackerConds:     []string{"blinded"},
			targetConds:       []string{"invisible"},
			inputAdvantage:    false,
			inputDisadvantage: false,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
		{
			name:              "existing advantage preserved",
			attackerConds:     nil,
			targetConds:       nil,
			inputAdvantage:    true,
			inputDisadvantage: false,
			wantAdvantage:     true,
			wantDisadvantage:  false,
		},
		{
			name:              "existing disadvantage preserved",
			attackerConds:     nil,
			targetConds:       nil,
			inputAdvantage:    false,
			inputDisadvantage: true,
			wantAdvantage:     false,
			wantDisadvantage:  true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			attacker := newPlayerCombatant("attacker", "Attacker", 20, 20)
			for _, c := range tt.attackerConds {
				attacker.Conditions = append(attacker.Conditions, &state.ConditionEntry{
					Condition: c,
					Duration:  0,
					Remaining: 0,
				})
			}

			target := newEnemyCombatant("target", "Target", 20, 20)
			for _, c := range tt.targetConds {
				target.Conditions = append(target.Conditions, &state.ConditionEntry{
					Condition: c,
					Duration:  0,
					Remaining: 0,
				})
			}

			adv, disadv := applyConditionAttackModifiers(attacker, target, tt.inputAdvantage, tt.inputDisadvantage)

			if adv != tt.wantAdvantage {
				t.Errorf("advantage = %v, want %v", adv, tt.wantAdvantage)
			}
			if disadv != tt.wantDisadvantage {
				t.Errorf("disadvantage = %v, want %v", disadv, tt.wantDisadvantage)
			}
		})
	}
}

// ===========================================================================
// 6. Turn/Initiative Helper Function Tests
// ===========================================================================

func TestHasCondition(t *testing.T) {
	t.Run("returns true when condition exists", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
			{Condition: "poisoned", Duration: 3, Remaining: 2},
		}

		if !hasCondition(c, "blinded") {
			t.Error("hasCondition should return true for 'blinded'")
		}
		if !hasCondition(c, "poisoned") {
			t.Error("hasCondition should return true for 'poisoned'")
		}
	})

	t.Run("returns false when condition does not exist", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
		}

		if hasCondition(c, "prone") {
			t.Error("hasCondition should return false for 'prone'")
		}
	})

	t.Run("returns false when no conditions", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)

		if hasCondition(c, "blinded") {
			t.Error("hasCondition should return false with no conditions")
		}
	})
}

func TestProcessEndOfTurnEffects(t *testing.T) {
	t.Run("decrements remaining duration for timed conditions", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 3, Remaining: 3},
		}

		processEndOfTurnEffects(c)

		if c.Conditions[0].Remaining != 2 {
			t.Errorf("Remaining = %d, want 2", c.Conditions[0].Remaining)
		}
		if len(c.Conditions) != 1 {
			t.Errorf("Expected 1 condition, got %d", len(c.Conditions))
		}
	})

	t.Run("removes expired conditions (remaining reaches 0)", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 1, Remaining: 1},
		}

		processEndOfTurnEffects(c)

		if hasConditionInList(c, "blinded") {
			t.Error("blinded condition with Remaining=1 should be removed after processing")
		}
	})

	t.Run("indefinite conditions (duration 0) are kept", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
		}

		processEndOfTurnEffects(c)

		if !hasConditionInList(c, "blinded") {
			t.Error("indefinite condition (duration=0) should be kept")
		}
	})

	t.Run("mixed conditions: some expire, some kept", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 1, Remaining: 1},  // Will expire
			{Condition: "poisoned", Duration: 3, Remaining: 2}, // Will decrement to 1
			{Condition: "prone", Duration: 0, Remaining: 0},    // Indefinite, kept
		}

		processEndOfTurnEffects(c)

		if hasConditionInList(c, "blinded") {
			t.Error("blinded should have expired")
		}
		if !hasConditionInList(c, "poisoned") {
			t.Error("poisoned should still be present")
		}
		if !hasConditionInList(c, "prone") {
			t.Error("prone (indefinite) should be kept")
		}
		for _, cond := range c.Conditions {
			if cond.Condition == "poisoned" {
				if cond.Remaining != 1 {
					t.Errorf("poisoned Remaining = %d, want 1", cond.Remaining)
				}
			}
		}
	})

	t.Run("no conditions: no panic", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)

		processEndOfTurnEffects(c)

		if len(c.Conditions) != 0 {
			t.Errorf("Expected 0 conditions, got %d", len(c.Conditions))
		}
	})

	t.Run("condition at remaining 2 takes 2 turns to expire", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 2, Remaining: 2},
		}

		// First end-of-turn: Remaining 2 -> 1
		processEndOfTurnEffects(c)
		if !hasConditionInList(c, "blinded") {
			t.Error("blinded should still be present after first tick (Remaining=1)")
		}
		for _, cond := range c.Conditions {
			if cond.Condition == "blinded" {
				if cond.Remaining != 1 {
					t.Errorf("After 1st tick: Remaining = %d, want 1", cond.Remaining)
				}
			}
		}

		// Second end-of-turn: Remaining 1 -> 0 (expired)
		processEndOfTurnEffects(c)
		if hasConditionInList(c, "blinded") {
			t.Error("blinded should be removed after second tick (Remaining was 1, now 0)")
		}
	})
}

func TestRemoveCondition(t *testing.T) {
	t.Run("removes specified condition", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
			{Condition: "poisoned", Duration: 3, Remaining: 2},
		}

		removeCondition(c, "blinded")

		if hasConditionInList(c, "blinded") {
			t.Error("blinded should be removed")
		}
		if !hasConditionInList(c, "poisoned") {
			t.Error("poisoned should still be present")
		}
	})

	t.Run("removes all instances of condition", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "blinded", Duration: 0, Remaining: 0},
			{Condition: "blinded", Duration: 3, Remaining: 2},
		}

		removeCondition(c, "blinded")

		if hasConditionInList(c, "blinded") {
			t.Error("all blinded entries should be removed")
		}
	})

	t.Run("non-existent condition: no error, no change", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)
		c.Conditions = []*state.ConditionEntry{
			{Condition: "poisoned", Duration: 3, Remaining: 2},
		}

		removeCondition(c, "blinded")

		if len(c.Conditions) != 1 {
			t.Errorf("Expected 1 condition (unchanged), got %d", len(c.Conditions))
		}
	})

	t.Run("empty conditions: no panic", func(t *testing.T) {
		c := newPlayerCombatant("p1", "Hero", 20, 20)

		removeCondition(c, "blinded")

		if len(c.Conditions) != 0 {
			t.Errorf("Expected 0 conditions, got %d", len(c.Conditions))
		}
	})
}
