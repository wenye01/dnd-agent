package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/models"
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
			// Create value copies to avoid pointer aliasing with the
			// original Character struct.  Without copies, mutations
			// via the returned Combatant would silently modify the
			// underlying Character data (and vice-versa).
			ds := ch.DeathSaves
			hd := ch.HitDice
			return &state.Combatant{
				ID:          ch.ID,
				Name:        ch.Name,
				MaxHP:       ch.MaxHP,
				CurrentHP:   ch.HP,
				TemporaryHP: ch.TemporaryHP,
				AC:          ch.AC,
				Speed:       ch.Speed,
				HitDice:     hd,
				Level:       ch.Level,
				CONMod:      ch.Stats.GetModifier(types.Constitution),
				Type:        state.CombatantPlayer,
				// Allocate a new DeathSaves struct to avoid returning a
				// pointer to the loop-iteration-local copy of ch.DeathSaves.
				DeathSaves: &models.DeathSaves{
					Successes: ds.Successes,
					Failures:  ds.Failures,
				},
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
	removeCondition(combatant, types.ConditionUnconscious)

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

