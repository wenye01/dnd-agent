package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// DeathSave performs a death saving throw for a combatant at 0 HP.
// d20 roll: >=10 = success, <10 = failure.
// Natural 1 = 2 failures, natural 20 = regain 1 HP.
// 3 successes = stabilize, 3 failures = death.
func (cm *CombatManager) DeathSave(sessionID, combatantID string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}

	combatant := cm.findCombatantInPartyOrCombat(gs, combatantID)
	if combatant == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("combatant %s not found", combatantID)}
	}

	// Must be at 0 HP to death save
	if combatant.CurrentHP > 0 {
		return nil, fmt.Errorf("combatant %s is not at 0 HP, no death save needed", combatant.Name)
	}

	// Must have death saves (player characters)
	if combatant.DeathSaves == nil {
		return nil, fmt.Errorf("combatant %s does not use death saves", combatant.Name)
	}

	// Roll d20
	rollResult, err := cm.diceService.Roll("1d20")
	if err != nil {
		return nil, fmt.Errorf("death save roll: %w", err)
	}
	roll := rollResult.Total

	result := map[string]interface{}{
		"combatantId": combatantID,
		"roll":        roll,
	}

	// Handle special rolls
	if roll == 20 {
		cm.applyDeathSaveNat20(combatant, result)
	} else if roll == 1 {
		cm.applyDeathSaveNat1(combatant, result)
	} else if roll >= 10 {
		cm.applyDeathSaveSuccess(combatant, result, roll)
	} else {
		cm.applyDeathSaveFailure(combatant, result, roll)
	}

	// Check for stabilization or death
	cm.checkDeathSaveOutcome(combatant, result, roll)

	// Final tally
	result["successes"] = combatant.DeathSaves.Successes
	result["failures"] = combatant.DeathSaves.Failures

	// Set message if not already set by special case
	if _, ok := result["message"]; !ok {
		result["message"] = fmt.Sprintf("%s rolls %d on death save: %s (%d/3 successes, %d/3 failures).",
			combatant.Name, roll, deathSaveLabel(roll), combatant.DeathSaves.Successes, combatant.DeathSaves.Failures)
	}

	// Update state
	cm.syncDeathSaveState(sessionID, combatantID, combatant)

	return result, nil
}

// Stabilize stabilizes a dying combatant (e.g., via Medicine check DC 10).
// This sets death save successes to 3 without restoring HP.
func (cm *CombatManager) Stabilize(sessionID, combatantID string, medicineCheckTotal int) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}

	combatant := cm.findCombatantInPartyOrCombat(gs, combatantID)
	if combatant == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("combatant %s not found", combatantID)}
	}

	if combatant.CurrentHP > 0 {
		return nil, fmt.Errorf("combatant %s is not dying", combatant.Name)
	}

	if combatant.DeathSaves == nil {
		return nil, fmt.Errorf("combatant %s does not use death saves", combatant.Name)
	}

	// Medicine check DC 10
	if medicineCheckTotal < 10 {
		return map[string]interface{}{
			"combatantId": combatantID,
			"checkTotal":  medicineCheckTotal,
			"dc":          10,
			"success":     false,
			"message":     fmt.Sprintf("Medicine check %d vs DC 10: failed. %s is not stabilized.", medicineCheckTotal, combatant.Name),
		}, nil
	}

	// Stabilize
	combatant.DeathSaves.Successes = 3
	combatant.DeathSaves.Failures = 0
	removeCondition(combatant, types.ConditionUnconscious)

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		for _, ch := range gs.Party {
			if ch.ID == combatantID {
				ch.DeathSaves.Successes = 3
				ch.DeathSaves.Failures = 0
				break
			}
		}
		if gs.Combat != nil {
			if c := cm.getCombatantByID(gs.Combat, combatantID); c != nil {
				if c.DeathSaves != nil {
					c.DeathSaves.Successes = 3
					c.DeathSaves.Failures = 0
				}
			}
		}
	})
	if err != nil {
		return nil, fmt.Errorf("stabilize: %w", err)
	}

	return map[string]interface{}{
		"combatantId": combatantID,
		"checkTotal":  medicineCheckTotal,
		"dc":          10,
		"success":     true,
		"stable":      true,
		"message":     fmt.Sprintf("Medicine check %d vs DC 10: success! %s is stabilized.", medicineCheckTotal, combatant.Name),
	}, nil
}

// --- Death save helper methods (private) ---

func (cm *CombatManager) applyDeathSaveNat20(c *state.Combatant, result map[string]interface{}) {
	c.CurrentHP = 1
	c.DeathSaves.Successes = 0
	c.DeathSaves.Failures = 0
	removeCondition(c, types.ConditionUnconscious)

	result["special"] = "natural_20"
	result["regainedHp"] = true
	result["currentHp"] = 1
	result["message"] = fmt.Sprintf("%s rolls a natural 20 on death save and regains 1 HP!", c.Name)
}

func (cm *CombatManager) applyDeathSaveNat1(c *state.Combatant, result map[string]interface{}) {
	c.DeathSaves.Failures += 2
	result["special"] = "natural_1"
	result["failures"] = c.DeathSaves.Failures
}

func (cm *CombatManager) applyDeathSaveSuccess(c *state.Combatant, result map[string]interface{}, _ int) {
	c.DeathSaves.Successes++
	result["isSuccess"] = true
	result["successes"] = c.DeathSaves.Successes
}

func (cm *CombatManager) applyDeathSaveFailure(c *state.Combatant, result map[string]interface{}, _ int) {
	c.DeathSaves.Failures++
	result["isSuccess"] = false
	result["failures"] = c.DeathSaves.Failures
}

func (cm *CombatManager) checkDeathSaveOutcome(c *state.Combatant, result map[string]interface{}, _ int) {
	// Check for stabilization (3 successes)
	if c.DeathSaves.Successes >= 3 {
		c.DeathSaves.Successes = 3
		result["stable"] = true
		result["message"] = fmt.Sprintf("%s stabilizes with 3 successful death saves!", c.Name)
		removeCondition(c, types.ConditionUnconscious)
		return
	}

	// Check for death (3 failures)
	if c.DeathSaves.Failures >= 3 {
		c.DeathSaves.Failures = 3
		result["dead"] = true
		result["message"] = fmt.Sprintf("%s dies with 3 failed death saves!", c.Name)
		c.CurrentHP = 0
	}
}

func (cm *CombatManager) syncDeathSaveState(sessionID, combatantID string, c *state.Combatant) {
	_ = cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		for _, ch := range gs.Party {
			if ch.ID == combatantID {
				ch.HP = c.CurrentHP
				// ch.DeathSaves is a value type (models.DeathSaves),
				// so dereference the pointer to copy the value.
				if c.DeathSaves != nil {
					ch.DeathSaves = *c.DeathSaves
				}
				break
			}
		}
		if gs.Combat != nil {
			if cb := cm.getCombatantByID(gs.Combat, combatantID); cb != nil {
				cb.CurrentHP = c.CurrentHP
				if cb.DeathSaves != nil && c.DeathSaves != nil {
					cb.DeathSaves = c.DeathSaves
				}
			}
		}
	})
}

func deathSaveLabel(roll int) string {
	if roll >= 10 {
		return "success"
	}
	return "failure"
}
