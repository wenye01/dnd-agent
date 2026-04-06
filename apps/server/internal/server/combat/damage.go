package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// DamageResult holds the outcome of applying damage to a combatant.
type DamageResult struct {
	OriginalDamage    int  `json:"originalDamage"`
	ModifiedDamage    int  `json:"modifiedDamage"`
	ResistanceApplied bool `json:"resistanceApplied"`
	ImmunityApplied   bool `json:"immunityApplied"`
	TempHPAbsorbed    int  `json:"tempHpAbsorbed"`
	CurrentHP         int  `json:"currentHp"`
	TemporaryHP       int  `json:"temporaryHp"`
	Unconscious       bool `json:"unconscious"`
	Dead              bool `json:"dead"`
}

// HealResult holds the outcome of applying healing to a combatant.
type HealResult struct {
	Healing   int  `json:"healing"`
	CurrentHP int  `json:"currentHp"`
	Conscious bool `json:"conscious"`
}

// ApplyDamageToCombatant applies damage to a combatant, checking resistances,
// immunities, and temporary HP. The combatant is modified in place.
func ApplyDamageToCombatant(c *state.Combatant, damage int, damageType string) *DamageResult {
	result := &DamageResult{
		OriginalDamage: damage,
	}

	// Check immunity
	if hasDamageImmunity(c, damageType) {
		result.ImmunityApplied = true
		result.ModifiedDamage = 0
		result.CurrentHP = c.CurrentHP
		result.TemporaryHP = c.TemporaryHP
		return result
	}

	// Check resistance
	if hasDamageResistance(c, damageType) {
		result.ResistanceApplied = true
		result.ModifiedDamage = damage / 2
	} else {
		result.ModifiedDamage = damage
	}

	// Apply temporary HP absorption
	if c.TemporaryHP > 0 {
		if c.TemporaryHP >= result.ModifiedDamage {
			result.TempHPAbsorbed = result.ModifiedDamage
			c.TemporaryHP -= result.ModifiedDamage
			result.ModifiedDamage = 0
		} else {
			result.TempHPAbsorbed = c.TemporaryHP
			result.ModifiedDamage -= c.TemporaryHP
			c.TemporaryHP = 0
		}
	}

	// Apply damage to current HP
	c.CurrentHP -= result.ModifiedDamage
	if c.CurrentHP < 0 {
		c.CurrentHP = 0
	}

	result.CurrentHP = c.CurrentHP
	result.TemporaryHP = c.TemporaryHP

	// Check for unconscious/death
	if c.CurrentHP == 0 {
		if c.Type == state.CombatantPlayer && c.DeathSaves != nil {
			result.Unconscious = true
		} else {
			// NPCs and enemies just die
			result.Dead = true
		}
	}

	return result
}

// ApplyDamage applies damage to a combatant in a session's active combat.
func (cm *CombatManager) ApplyDamage(sessionID, targetID string, damage int, damageType string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	// Validate damage type
	dt := types.DamageType(damageType)
	if !dt.Valid() {
		return nil, fmt.Errorf("invalid damage type: %s", damageType)
	}

	result := ApplyDamageToCombatant(target, damage, damageType)

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("apply damage: %w", err)
	}

	resp := map[string]interface{}{
		"targetId":          targetID,
		"target":            target.Name,
		"originalDamage":    result.OriginalDamage,
		"modifiedDamage":    result.ModifiedDamage,
		"resistanceApplied": result.ResistanceApplied,
		"immunityApplied":   result.ImmunityApplied,
		"tempHpAbsorbed":    result.TempHPAbsorbed,
		"currentHp":         result.CurrentHP,
		"temporaryHp":       result.TemporaryHP,
		"maxHp":             target.MaxHP,
		"unconscious":       result.Unconscious,
		"dead":              result.Dead,
		"damageType":        damageType,
	}

	if result.Dead {
		resp["message"] = fmt.Sprintf("%s takes %d %s damage and dies.", target.Name, result.ModifiedDamage, damageType)
	} else if result.Unconscious {
		resp["message"] = fmt.Sprintf("%s takes %d %s damage and falls unconscious!", target.Name, result.ModifiedDamage, damageType)
	} else {
		resp["message"] = fmt.Sprintf("%s takes %d %s damage. (%d/%d HP)", target.Name, result.ModifiedDamage, damageType, result.CurrentHP, target.MaxHP)
	}

	return resp, nil
}

// ApplyHealing heals a combatant. HP cannot exceed MaxHP.
func (cm *CombatManager) ApplyHealing(sessionID, targetID string, healing int) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	result := applyHealingToCombatant(target, healing)

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("apply healing: %w", err)
	}

	return map[string]interface{}{
		"targetId":  targetID,
		"target":    target.Name,
		"healing":   result.Healing,
		"currentHp": result.CurrentHP,
		"maxHp":     target.MaxHP,
		"conscious": result.Conscious,
		"message":   fmt.Sprintf("%s heals for %d HP. (%d/%d HP)", target.Name, result.Healing, result.CurrentHP, target.MaxHP),
	}, nil
}

// applyHealingToCombatant heals a combatant, capping at MaxHP.
// Healing a character at 0 HP also restores consciousness.
func applyHealingToCombatant(c *state.Combatant, healing int) *HealResult {
	result := &HealResult{}

	// Healing at 0 HP restores consciousness
	wasUnconscious := c.CurrentHP == 0

	c.CurrentHP += healing
	if c.CurrentHP > c.MaxHP {
		c.CurrentHP = c.MaxHP
	}

	result.Healing = healing
	if c.CurrentHP < healing {
		result.Healing = healing - (c.CurrentHP - healing + healing)
		// Actual healing applied
	}
	result.Healing = healing
	result.CurrentHP = c.CurrentHP
	result.Conscious = wasUnconscious && c.CurrentHP > 0

	// Remove unconscious condition if healed above 0
	if result.Conscious {
		removeCondition(c, "unconscious")
		if c.DeathSaves != nil {
			c.DeathSaves.Successes = 0
			c.DeathSaves.Failures = 0
		}
	}

	return result
}

// AddTemporaryHP adds temporary hit points to a combatant.
// Temp HP does not stack; the higher value wins.
func (cm *CombatManager) AddTemporaryHP(sessionID, targetID string, tempHP int) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	previousTempHP := target.TemporaryHP
	if tempHP > target.TemporaryHP {
		target.TemporaryHP = tempHP
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("add temporary hp: %w", err)
	}

	return map[string]interface{}{
		"targetId":       targetID,
		"target":         target.Name,
		"previousTempHp": previousTempHP,
		"temporaryHp":    target.TemporaryHP,
		"currentHp":      target.CurrentHP,
		"maxHp":          target.MaxHP,
		"message":        fmt.Sprintf("%s gains %d temporary HP (was %d, now %d).", target.Name, tempHP, previousTempHP, target.TemporaryHP),
	}, nil
}

// hasDamageResistance checks if a combatant has resistance to a damage type.
func hasDamageResistance(c *state.Combatant, damageType string) bool {
	for _, dt := range c.DamageResistances {
		if dt == damageType {
			return true
		}
	}
	return false
}

// hasDamageImmunity checks if a combatant has immunity to a damage type.
func hasDamageImmunity(c *state.Combatant, damageType string) bool {
	for _, dt := range c.DamageImmunities {
		if dt == damageType {
			return true
		}
	}
	return false
}

// removeCondition removes a condition from a combatant by name.
func removeCondition(c *state.Combatant, condition string) {
	filtered := make([]*state.ConditionEntry, 0, len(c.Conditions))
	for _, cond := range c.Conditions {
		if cond.Condition != condition {
			filtered = append(filtered, cond)
		}
	}
	c.Conditions = filtered
}
