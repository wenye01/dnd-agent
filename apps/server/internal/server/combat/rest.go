package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// findCombatantInPartyOrCombat looks up a combatant by ID, first in the active
// combat state, then in the party list (converting party characters to
// Combatant structs). Returns nil if not found.
func (cm *CombatManager) findCombatantInPartyOrCombat(gs *state.GameState, combatantID string) *state.Combatant {
	if gs.Combat != nil {
		if c := cm.getCombatantByID(gs.Combat, combatantID); c != nil {
			return c
		}
	}
	for _, ch := range gs.Party {
		if ch.ID == combatantID {
			return &state.Combatant{
				ID:         ch.ID,
				Name:       ch.Name,
				MaxHP:      ch.MaxHP,
				CurrentHP:  ch.HP,
				HitDice:    ch.HitDice,
				Level:      ch.Level,
				CONMod:     ch.Stats.GetModifier(types.Constitution),
				Type:       state.CombatantPlayer,
				DeathSaves: &ch.DeathSaves,
			}
		}
	}
	return nil
}

// ShortRest performs a short rest for a combatant, allowing them to spend
// hit dice to recover HP. Each hit die restores roll + CON modifier HP.
func (cm *CombatManager) ShortRest(sessionID, combatantID string, diceToSpend int) (map[string]interface{}, error) {
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

	// Validate dice to spend
	if diceToSpend <= 0 {
		return nil, fmt.Errorf("must spend at least 1 hit die")
	}
	if diceToSpend > combatant.HitDice.Current {
		return nil, fmt.Errorf("cannot spend %d hit dice, only %d available", diceToSpend, combatant.HitDice.Current)
	}

	// Roll hit dice and calculate healing
	totalHealing := 0
	diceResults := make([]int, 0, diceToSpend)
	dieSize := combatant.HitDice.Size
	conMod := combatant.CONMod

	for i := 0; i < diceToSpend; i++ {
		roll, err := cm.diceService.Roll(fmt.Sprintf("1d%d", dieSize))
		if err != nil {
			return nil, fmt.Errorf("roll hit die: %w", err)
		}
		heal := roll.Total + conMod
		if heal < 1 {
			heal = 1 // Minimum 1 HP per die
		}
		totalHealing += heal
		diceResults = append(diceResults, roll.Total)
	}

	// Apply healing
	combatant.CurrentHP += totalHealing
	if combatant.CurrentHP > combatant.MaxHP {
		totalHealing -= combatant.CurrentHP - combatant.MaxHP
		combatant.CurrentHP = combatant.MaxHP
	}

	// Spend hit dice
	combatant.HitDice.Current -= diceToSpend

	// Update state
	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Update party character if found
		for _, ch := range gs.Party {
			if ch.ID == combatantID {
				ch.HP = combatant.CurrentHP
				ch.HitDice.Current = combatant.HitDice.Current
				break
			}
		}
		// Also update combat participant if in combat
		if gs.Combat != nil {
			if c := cm.getCombatantByID(gs.Combat, combatantID); c != nil {
				c.CurrentHP = combatant.CurrentHP
				c.HitDice.Current = combatant.HitDice.Current
			}
		}
	})
	if err != nil {
		return nil, fmt.Errorf("short rest: %w", err)
	}

	return map[string]interface{}{
		"combatantId":  combatantID,
		"diceSpent":    diceToSpend,
		"diceResults":  diceResults,
		"conModifier":  conMod,
		"healing":      totalHealing,
		"currentHp":    combatant.CurrentHP,
		"maxHp":        combatant.MaxHP,
		"hitDiceLeft":  combatant.HitDice.Current,
		"hitDiceTotal": combatant.HitDice.Total,
		"message":      fmt.Sprintf("%s spends %d hit dice and recovers %d HP (%d/%d HP, %d/%d hit dice left).", combatant.Name, diceToSpend, totalHealing, combatant.CurrentHP, combatant.MaxHP, combatant.HitDice.Current, combatant.HitDice.Total),
	}, nil
}

// LongRest performs a long rest: restore HP to MaxHP, restore half of spent
// hit dice (rounded down, minimum 0). Spell slots are NOT restored in this phase.
func (cm *CombatManager) LongRest(sessionID, combatantID string) (map[string]interface{}, error) {
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

	// Restore HP to MaxHP
	hpRestored := combatant.MaxHP - combatant.CurrentHP
	combatant.CurrentHP = combatant.MaxHP

	// Restore half of spent hit dice (rounded down)
	spentDice := combatant.HitDice.Total - combatant.HitDice.Current
	recoveredDice := spentDice / 2
	if recoveredDice < 0 {
		recoveredDice = 0
	}
	combatant.HitDice.Current += recoveredDice
	if combatant.HitDice.Current > combatant.HitDice.Total {
		combatant.HitDice.Current = combatant.HitDice.Total
	}

	// Clear death saves
	if combatant.DeathSaves != nil {
		combatant.DeathSaves.Successes = 0
		combatant.DeathSaves.Failures = 0
	}

	// Remove unconscious condition if present
	removeCondition(combatant, "unconscious")

	// Update state
	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		for _, ch := range gs.Party {
			if ch.ID == combatantID {
				ch.HP = combatant.CurrentHP
				ch.HitDice.Current = combatant.HitDice.Current
				ch.DeathSaves.Successes = 0
				ch.DeathSaves.Failures = 0
				break
			}
		}
		if gs.Combat != nil {
			if c := cm.getCombatantByID(gs.Combat, combatantID); c != nil {
				c.CurrentHP = combatant.CurrentHP
				c.HitDice.Current = combatant.HitDice.Current
				if c.DeathSaves != nil {
					c.DeathSaves.Successes = 0
					c.DeathSaves.Failures = 0
				}
			}
		}
	})
	if err != nil {
		return nil, fmt.Errorf("long rest: %w", err)
	}

	return map[string]interface{}{
		"combatantId":      combatantID,
		"hpRestored":       hpRestored,
		"currentHp":        combatant.CurrentHP,
		"maxHp":            combatant.MaxHP,
		"hitDiceRecovered": recoveredDice,
		"hitDiceCurrent":   combatant.HitDice.Current,
		"hitDiceTotal":     combatant.HitDice.Total,
		"message":          fmt.Sprintf("%s takes a long rest. HP restored to %d/%d. Recovered %d hit dice (%d/%d).", combatant.Name, combatant.CurrentHP, combatant.MaxHP, recoveredDice, combatant.HitDice.Current, combatant.HitDice.Total),
	}, nil
}

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
		// Natural 20: regain 1 HP and become conscious
		combatant.CurrentHP = 1
		combatant.DeathSaves.Successes = 0
		combatant.DeathSaves.Failures = 0
		removeCondition(combatant, "unconscious")

		result["special"] = "natural_20"
		result["regainedHp"] = true
		result["currentHp"] = 1
		result["message"] = fmt.Sprintf("%s rolls a natural 20 on death save and regains 1 HP!", combatant.Name)
	} else if roll == 1 {
		// Natural 1: count as 2 failures
		combatant.DeathSaves.Failures += 2
		result["special"] = "natural_1"
		result["failures"] = combatant.DeathSaves.Failures
	} else if roll >= 10 {
		// Success
		combatant.DeathSaves.Successes++
		result["isSuccess"] = true
		result["successes"] = combatant.DeathSaves.Successes
	} else {
		// Failure
		combatant.DeathSaves.Failures++
		result["isSuccess"] = false
		result["failures"] = combatant.DeathSaves.Failures
	}

	// Check for stabilization (3 successes)
	if combatant.DeathSaves.Successes >= 3 {
		combatant.DeathSaves.Successes = 3
		result["stable"] = true
		result["message"] = fmt.Sprintf("%s stabilizes with 3 successful death saves!", combatant.Name)
		removeCondition(combatant, "unconscious")
	}

	// Check for death (3 failures)
	if combatant.DeathSaves.Failures >= 3 {
		combatant.DeathSaves.Failures = 3
		result["dead"] = true
		result["message"] = fmt.Sprintf("%s dies with 3 failed death saves!", combatant.Name)
		combatant.CurrentHP = 0
	}

	// Set message if not already set by special case
	if _, ok := result["message"]; !ok {
		if roll >= 10 {
			result["message"] = fmt.Sprintf("%s rolls %d on death save: success (%d/3 successes, %d/3 failures).", combatant.Name, roll, combatant.DeathSaves.Successes, combatant.DeathSaves.Failures)
		} else {
			result["message"] = fmt.Sprintf("%s rolls %d on death save: failure (%d/3 successes, %d/3 failures).", combatant.Name, roll, combatant.DeathSaves.Successes, combatant.DeathSaves.Failures)
		}
	}

	result["successes"] = combatant.DeathSaves.Successes
	result["failures"] = combatant.DeathSaves.Failures

	// Update state
	err = cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		for _, ch := range gs.Party {
			if ch.ID == combatantID {
				ch.HP = combatant.CurrentHP
				ch.DeathSaves = *combatant.DeathSaves
				break
			}
		}
		if gs.Combat != nil {
			if c := cm.getCombatantByID(gs.Combat, combatantID); c != nil {
				c.CurrentHP = combatant.CurrentHP
				if c.DeathSaves != nil {
					c.DeathSaves = combatant.DeathSaves
				}
			}
		}
	})
	if err != nil {
		return nil, fmt.Errorf("death save: %w", err)
	}

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
	removeCondition(combatant, "unconscious")

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
