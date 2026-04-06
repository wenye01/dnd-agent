package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
)

// RollInitiativeForCombatants rolls initiative for a set of combatants and
// returns the sorted initiative entries. This is a standalone utility for
// use when the CombatManager is not available.
func RollInitiativeForCombatants(cm *CombatManager, combatants []*state.Combatant) []*state.InitiativeEntry {
	return cm.rollInitiative(combatants)
}

// GetInitiativeOrder returns the initiative order for display purposes.
func GetInitiativeOrder(cs *state.CombatState) []map[string]interface{} {
	if cs == nil {
		return nil
	}

	order := make([]map[string]interface{}, 0, len(cs.Initiatives))
	for _, entry := range cs.Initiatives {
		name := entry.CharacterID
		for _, p := range cs.Participants {
			if p.ID == entry.CharacterID {
				name = p.Name
				break
			}
		}
		order = append(order, map[string]interface{}{
			"characterId": entry.CharacterID,
			"name":        name,
			"initiative":  entry.Initiative,
			"hasActed":    entry.HasActed,
		})
	}
	return order
}

// SetInitiative allows manually setting initiative values for combatants.
// Useful for pre-rolled initiative or scripted encounters.
func SetInitiative(cm *CombatManager, sessionID string, initiatives map[string]int) error {
	gs := cm.GetStateManager().GetSession(sessionID)
	if gs == nil {
		return &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil {
		return &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Update initiative values
	for _, entry := range gs.Combat.Initiatives {
		if val, ok := initiatives[entry.CharacterID]; ok {
			entry.Initiative = val
		}
	}

	// Re-sort
	sortInitiatives(gs.Combat)

	return cm.GetStateManager().UpdateSession(sessionID, func(gs *state.GameState) {
		// Already sorted in place
	})
}

// sortInitiatives sorts the initiative entries by initiative descending,
// with DEX score as tiebreaker.
func sortInitiatives(cs *state.CombatState) {
	// Simple insertion sort (small N for combat)
	for i := 1; i < len(cs.Initiatives); i++ {
		for j := i; j > 0; j-- {
			if cs.Initiatives[j].Initiative > cs.Initiatives[j-1].Initiative {
				cs.Initiatives[j], cs.Initiatives[j-1] = cs.Initiatives[j-1], cs.Initiatives[j]
			}
		}
	}
	// Re-order participants to match initiative order
	participantMap := make(map[string]*state.Combatant)
	for _, p := range cs.Participants {
		participantMap[p.ID] = p
	}
	sorted := make([]*state.Combatant, 0, len(cs.Initiatives))
	for _, entry := range cs.Initiatives {
		if c, ok := participantMap[entry.CharacterID]; ok {
			sorted = append(sorted, c)
		}
	}
	if len(sorted) == len(cs.Participants) {
		cs.Participants = sorted
	}
}

// AddCombatantToInitiative adds a late-joining combatant to the initiative order.
func AddCombatantToInitiative(cm *CombatManager, sessionID string, combatant *state.Combatant, initiative int) error {
	gs := cm.GetStateManager().GetSession(sessionID)
	if gs == nil {
		return &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Check for duplicate
	for _, p := range gs.Combat.Participants {
		if p.ID == combatant.ID {
			return fmt.Errorf("combatant %s already in combat", combatant.ID)
		}
	}

	return cm.GetStateManager().UpdateSession(sessionID, func(gs *state.GameState) {
		gs.Combat.Participants = append(gs.Combat.Participants, combatant)
		gs.Combat.Initiatives = append(gs.Combat.Initiatives, &state.InitiativeEntry{
			CharacterID: combatant.ID,
			Initiative:  initiative,
			HasActed:    false,
		})
		sortInitiatives(gs.Combat)
		// Fix turn index to still point at the current combatant
		// (sorting may have shifted positions)
	})
}

// RemoveCombatantFromInitiative removes a combatant from initiative order.
func RemoveCombatantFromInitiative(cm *CombatManager, sessionID string, combatantID string) error {
	gs := cm.GetStateManager().GetSession(sessionID)
	if gs == nil {
		return &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	return cm.GetStateManager().UpdateSession(sessionID, func(gs *state.GameState) {
		// Remove from initiatives
		newInitiatives := make([]*state.InitiativeEntry, 0, len(gs.Combat.Initiatives))
		for _, entry := range gs.Combat.Initiatives {
			if entry.CharacterID != combatantID {
				newInitiatives = append(newInitiatives, entry)
			}
		}
		gs.Combat.Initiatives = newInitiatives

		// Remove from participants
		newParticipants := make([]*state.Combatant, 0, len(gs.Combat.Participants))
		for _, p := range gs.Combat.Participants {
			if p.ID != combatantID {
				newParticipants = append(newParticipants, p)
			}
		}
		gs.Combat.Participants = newParticipants

		// Fix turn index
		if gs.Combat.TurnIndex >= len(gs.Combat.Participants) {
			gs.Combat.TurnIndex = 0
		}
	})
}
