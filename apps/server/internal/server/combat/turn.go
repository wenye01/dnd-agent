package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
)

// EndTurn ends the current combatant's turn, processes end-of-turn effects,
// and advances to the next combatant.
func (cm *CombatManager) EndTurn(sessionID string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	_, cs, err := cm.getActiveCombat(sessionID)
	if err != nil {
		return nil, err
	}

	currentCombatant := cm.getCurrentCombatant(cs)
	if currentCombatant == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: "no current combatant"}
	}

	// Mark current combatant as having acted
	for _, entry := range cs.Initiatives {
		if entry.CharacterID == currentCombatant.ID {
			entry.HasActed = true
			break
		}
	}

	// Process end-of-turn effects (decrement condition durations, etc.)
	processEndOfTurnEffects(currentCombatant)

	// Advance turn index
	cs.TurnIndex++

	// Check if we've completed a full round
	if cs.TurnIndex >= len(cs.Participants) {
		cs.Round++
		cs.TurnIndex = 0
		// Reset all initiative acted flags for new round
		for _, entry := range cs.Initiatives {
			entry.HasActed = false
		}
	}

	// Find next alive combatant
	nextCombatant := cm.advanceToNextAliveCombatant(cs)
	if nextCombatant == nil {
		// All combatants are dead on one side
		ended, result := cm.checkCombatEnd(cs)
		if ended {
			cs.Status = state.CombatEnded
			err = cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
				gs.Combat = cs
				gs.Phase = state.PhaseExploring
			})
			if err != nil {
				return nil, fmt.Errorf("end turn: failed to persist combat end state: %w", err)
			}
			return map[string]interface{}{
				"status":  "ended",
				"victory": result.Victory,
				"reason":  result.Reason,
			}, nil
		}
		// Wrap around
		cs.TurnIndex = 0
		nextCombatant = cm.advanceToNextAliveCombatant(cs)
	}

	if nextCombatant == nil {
		return nil, &CombatError{Code: ErrInvalidState, Message: "no valid combatant found"}
	}

	// Reset turn resources for the next combatant
	cm.resetTurnResources(nextCombatant)

	// Persist the state update
	err = cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat = cs
	})
	if err != nil {
		return nil, fmt.Errorf("end turn: %w", err)
	}

	return map[string]interface{}{
		"status":        "active",
		"round":         cs.Round,
		"currentTurn":   nextCombatant.Name,
		"currentTurnId": nextCombatant.ID,
		"hp":            nextCombatant.CurrentHP,
		"maxHp":         nextCombatant.MaxHP,
		"action":        string(nextCombatant.Action),
		"bonusAction":   string(nextCombatant.BonusAction),
		"reaction":      string(nextCombatant.Reaction),
	}, nil
}

// processEndOfTurnEffects decrements condition durations and removes expired
// conditions from a combatant.
func processEndOfTurnEffects(c *state.Combatant) {
	activeConditions := make([]*state.ConditionEntry, 0, len(c.Conditions))
	for _, cond := range c.Conditions {
		if cond.Duration > 0 {
			cond.Remaining--
			if cond.Remaining > 0 {
				activeConditions = append(activeConditions, cond)
			}
			// If remaining == 0, the condition expires and is NOT added back
		} else {
			// Duration 0 means indefinite, keep it
			activeConditions = append(activeConditions, cond)
		}
	}
	c.Conditions = activeConditions
}

// UseAction marks a combatant's action as used for this turn.
func (cm *CombatManager) UseAction(sessionID, combatantID, actionType string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	_, cs, err := cm.getActiveCombat(sessionID)
	if err != nil {
		return err
	}

	// Verify it's the combatant's turn
	if err := cm.validateTurn(sessionID, combatantID); err != nil {
		return err
	}

	combatant := cm.getCombatantByID(cs, combatantID)
	if combatant == nil {
		return &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("combatant %s not found", combatantID)}
	}

	switch actionType {
	case "action":
		if combatant.Action != state.ActionAvailable {
			return &CombatError{Code: ErrActionExhausted, Message: "action already used this turn"}
		}
		combatant.Action = state.ActionUsed
	case "bonus_action":
		if combatant.BonusAction != state.ActionAvailable {
			return &CombatError{Code: ErrActionExhausted, Message: "bonus action already used this turn"}
		}
		combatant.BonusAction = state.ActionUsed
	case "reaction":
		if combatant.Reaction != state.ActionAvailable {
			return &CombatError{Code: ErrActionExhausted, Message: "reaction already used this turn"}
		}
		combatant.Reaction = state.ActionUsed
	default:
		return &CombatError{Code: ErrInvalidState, Message: fmt.Sprintf("unknown action type: %s", actionType)}
	}

	return cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Combatant already modified in place
	})
}
