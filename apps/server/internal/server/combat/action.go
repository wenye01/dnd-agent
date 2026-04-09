package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// ActionType represents the types of combat actions a combatant can take.
type ActionType string

const (
	ActionAttack    ActionType = "attack"
	ActionDodge     ActionType = "dodge"
	ActionDisengage ActionType = "disengage"
	ActionHelp      ActionType = "help"
	ActionHide      ActionType = "hide"
	ActionReady     ActionType = "ready"
)

// AttackAction performs an attack from one combatant against another.
// It consumes the attacker's action resource and resolves the attack roll.
func (cm *CombatManager) AttackAction(sessionID, attackerID, targetID string, attackBonus int, damageDice string, damageBonus int, damageType string, advantage bool, disadvantage bool) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Verify it's the attacker's turn
	if err := cm.validateTurn(sessionID, attackerID); err != nil {
		return nil, err
	}

	attacker := cm.getCombatantByID(gs.Combat, attackerID)
	if attacker == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("attacker %s not found", attackerID)}
	}
	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	// Check if incapacitated (unified condition system)
	attackerMods := GetConditionModifiers(attacker)
	if attackerMods.Incapacitated {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "attacker is incapacitated and cannot attack"}
	}

	// TODO: Check charmed condition -- a charmed creature cannot attack the charmer.
	// This requires looking up the charmer's ID from the condition's Source field
	// and comparing it to the target's ID. Not yet implemented because the current
	// data model does not store the charmer identity in a queryable way.

	// Check action resource
	if attacker.Action == state.ActionUsed {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "action already used this turn"}
	}

	// Apply condition modifiers to advantage/disadvantage (unified condition system)
	targetMods := GetConditionModifiers(target)
	if attackerMods.AttackAdvantage {
		advantage = true
	}
	if attackerMods.AttackDisadvantage {
		disadvantage = true
	}
	if targetMods.DefenseAdvantage {
		advantage = true
	}
	if targetMods.DefenseDisadvantage {
		disadvantage = true
	}

	// Check for Help action effect (advantage against target)
	if hasActiveEffect(gs.Combat, "advantage_against", targetID) {
		advantage = true
	}

	// Roll attack (uses AttackRoll for proper nat1/nat20 rules)
	attackRoll := cm.diceService.AttackRoll(attackBonus, target.AC, advantage, disadvantage)

	result := map[string]interface{}{
		"attacker":    attacker.Name,
		"attackerId":  attackerID,
		"target":      target.Name,
		"targetId":    targetID,
		"attackRoll":  attackRoll.Roll,
		"attackTotal": attackRoll.Total,
		"targetAC":    target.AC,
		"hit":         attackRoll.Success,
		"critical":    attackRoll.Crit,
	}

	// If hit, calculate damage
	if attackRoll.Success {
		var totalDamage int
		var diceResults []int

		if attackRoll.Crit {
			// Critical hit: double the damage dice
			damage, dice, err := cm.rollCriticalDamage(damageDice, damageBonus)
			if err != nil {
				return nil, fmt.Errorf("roll critical damage: %w", err)
			}
			totalDamage = damage
			diceResults = dice
		} else {
			// Normal damage
			rollResult, err := cm.diceService.Roll(damageDice)
			if err != nil {
				return nil, fmt.Errorf("roll damage: %w", err)
			}
			totalDamage = rollResult.Total + damageBonus
			diceResults = rollResult.Dice
		}

		// Apply damage through damage calculator
		damageResult := ApplyDamageToCombatant(target, totalDamage, types.DamageType(damageType))

		result["damage"] = damageResult.ModifiedDamage
		result["originalDamage"] = damageResult.OriginalDamage
		result["diceResults"] = diceResults
		result["resistanceApplied"] = damageResult.ResistanceApplied
		result["immunityApplied"] = damageResult.ImmunityApplied
		result["currentHp"] = target.CurrentHP
		result["temporaryHp"] = target.TemporaryHP
		result["unconscious"] = damageResult.Unconscious
		result["dead"] = damageResult.Dead
		result["damageType"] = damageType

		if damageResult.Dead {
			result["message"] = fmt.Sprintf("%s critically strikes %s for %d %s damage!", attacker.Name, target.Name, damageResult.ModifiedDamage, damageType)
		} else if attackRoll.Crit {
			result["message"] = fmt.Sprintf("%s scores a critical hit on %s for %d %s damage!", attacker.Name, target.Name, damageResult.ModifiedDamage, damageType)
		} else {
			result["message"] = fmt.Sprintf("%s hits %s for %d %s damage.", attacker.Name, target.Name, damageResult.ModifiedDamage, damageType)
		}
	} else if attackRoll.Roll == 1 {
		result["message"] = fmt.Sprintf("%s rolls a natural 1 and misses %s!", attacker.Name, target.Name)
	} else {
		result["message"] = fmt.Sprintf("%s misses %s (rolled %d vs AC %d).", attacker.Name, target.Name, attackRoll.Total, target.AC)
	}

	// Consume action
	attacker.Action = state.ActionUsed

	// Persist
	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("attack action: %w", err)
	}

	return result, nil
}

// DodgeAction marks the combatant as dodging (disadvantage on attacks against them).
func (cm *CombatManager) DodgeAction(sessionID, combatantID string) (map[string]interface{}, error) {
	return cm.performSimpleAction(sessionID, combatantID, "dodge", func(c *state.Combatant) {
		// Dodge gives disadvantage to attacks against the combatant
		// We add a "dodging" marker that lasts until start of next turn
		c.Conditions = append(c.Conditions, &state.ConditionEntry{
			Condition: "dodging",
			Source:    "dodge_action",
			Duration:  1,
			Remaining: 1,
		})
	})
}

// DisengageAction marks the combatant as disengaging (no opportunity attacks).
func (cm *CombatManager) DisengageAction(sessionID, combatantID string) (map[string]interface{}, error) {
	return cm.performSimpleAction(sessionID, combatantID, "disengage", func(c *state.Combatant) {
		c.Conditions = append(c.Conditions, &state.ConditionEntry{
			Condition: "disengaging",
			Source:    "disengage_action",
			Duration:  1,
			Remaining: 1,
		})
	})
}

// HelpAction grants advantage to an ally's next attack against a target.
func (cm *CombatManager) HelpAction(sessionID, helperID, targetID string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Verify it's the helper's turn
	if err := cm.validateTurn(sessionID, helperID); err != nil {
		return nil, err
	}

	helper := cm.getCombatantByID(gs.Combat, helperID)
	if helper == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("helper %s not found", helperID)}
	}
	if helper.Action == state.ActionUsed {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "action already used this turn"}
	}

	helper.Action = state.ActionUsed

	// The help action grants advantage to the next attack against the target.
	// We represent this as an active effect.
	gs.Combat.ActiveEffects = append(gs.Combat.ActiveEffects, &state.ActiveEffect{
		ID:         fmt.Sprintf("help_%s_%s_%d", helperID, targetID, now()),
		Name:       "Help - Advantage",
		TargetID:   targetID,
		Duration:   1,
		Conditions: []string{"advantage_against"},
	})

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("help action: %w", err)
	}

	return map[string]interface{}{
		"action":   "help",
		"helper":   helper.Name,
		"helperId": helperID,
		"targetId": targetID,
		"message":  fmt.Sprintf("%s uses the Help action, granting advantage on the next attack against the target.", helper.Name),
	}, nil
}

// HideAction performs a Stealth check (Dexterity) against a passive Perception DC.
func (cm *CombatManager) HideAction(sessionID, combatantID string, stealthModifier int, passivePerception int) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Verify it's the combatant's turn
	if err := cm.validateTurn(sessionID, combatantID); err != nil {
		return nil, err
	}

	combatant := cm.getCombatantByID(gs.Combat, combatantID)
	if combatant == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("combatant %s not found", combatantID)}
	}
	if combatant.Action == state.ActionUsed {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "action already used this turn"}
	}

	combatant.Action = state.ActionUsed

	// Roll stealth check
	checkResult := cm.diceService.AbilityCheck(stealthModifier, passivePerception, false, false)

	if checkResult.Success {
		combatant.Conditions = append(combatant.Conditions, &state.ConditionEntry{
			Condition: "hidden",
			Source:    "hide_action",
			Duration:  0, // Until attack or end of turn
			Remaining: 0,
		})
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("hide action: %w", err)
	}

	return map[string]interface{}{
		"action":  "hide",
		"roll":    checkResult.Roll,
		"total":   checkResult.Total,
		"dc":      passivePerception,
		"success": checkResult.Success,
		"message": fmt.Sprintf("%s attempts to hide (rolled %d vs DC %d): %s", combatant.Name, checkResult.Total, passivePerception, boolToString(checkResult.Success, "hidden", "failed to hide")),
	}, nil
}

// ReadyAction prepares a triggered action for the combatant.
func (cm *CombatManager) ReadyAction(sessionID, combatantID, trigger string) (map[string]interface{}, error) {
	return cm.performSimpleAction(sessionID, combatantID, "ready", func(c *state.Combatant) {
		c.Conditions = append(c.Conditions, &state.ConditionEntry{
			Condition: "ready",
			Source:    "ready_action",
			Duration:  1,
			Remaining: 1,
			Trigger:   trigger,
		})
		// Ready action uses reaction when triggered
	})
}

// OpportunityAttack handles a reaction-based attack when an enemy leaves reach.
func (cm *CombatManager) OpportunityAttack(sessionID, attackerID, targetID string, attackBonus int, damageDice string, damageBonus int, damageType string) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	attacker := cm.getCombatantByID(gs.Combat, attackerID)
	if attacker == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("attacker %s not found", attackerID)}
	}
	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	// Check reaction
	if attacker.Reaction == state.ActionUsed {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "reaction already used this turn"}
	}

	// Check if target is disengaging (internal action marker, not a PHB condition)
	if hasInternalCondition(target, "disengaging") {
		return map[string]interface{}{
			"message":   fmt.Sprintf("%s is disengaging, no opportunity attack triggered.", target.Name),
			"triggered": false,
		}, nil
	}

	// Consume reaction
	attacker.Reaction = state.ActionUsed

	// Roll attack (uses AttackRoll for proper nat1/nat20 rules)
	attackRoll := cm.diceService.AttackRoll(attackBonus, target.AC, false, false)

	result := map[string]interface{}{
		"attacker":    attacker.Name,
		"target":      target.Name,
		"attackRoll":  attackRoll.Roll,
		"attackTotal": attackRoll.Total,
		"targetAC":    target.AC,
		"hit":         attackRoll.Success,
		"critical":    attackRoll.Crit,
		"triggered":   true,
	}

	if attackRoll.Success {
		var totalDamage int
		if attackRoll.Crit {
			damage, _, err := cm.rollCriticalDamage(damageDice, damageBonus)
			if err != nil {
				return nil, fmt.Errorf("roll critical damage: %w", err)
			}
			totalDamage = damage
		} else {
			rollResult, err := cm.diceService.Roll(damageDice)
			if err != nil {
				return nil, fmt.Errorf("roll damage: %w", err)
			}
			totalDamage = rollResult.Total + damageBonus
		}

		damageResult := ApplyDamageToCombatant(target, totalDamage, types.DamageType(damageType))
		result["damage"] = damageResult.ModifiedDamage
		result["currentHp"] = target.CurrentHP
		result["damageType"] = damageType
		result["message"] = fmt.Sprintf("%s makes an opportunity attack against %s for %d damage!", attacker.Name, target.Name, damageResult.ModifiedDamage)
	} else {
		result["message"] = fmt.Sprintf("%s's opportunity attack misses %s.", attacker.Name, target.Name)
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("opportunity attack: %w", err)
	}

	return result, nil
}

// performSimpleAction is a helper for actions that just consume the action resource
// and optionally modify the combatant.
func (cm *CombatManager) performSimpleAction(sessionID, combatantID, actionName string, modifyFn func(*state.Combatant)) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil || gs.Combat.Status != state.CombatActive {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	// Verify it's the combatant's turn
	if err := cm.validateTurn(sessionID, combatantID); err != nil {
		return nil, err
	}

	combatant := cm.getCombatantByID(gs.Combat, combatantID)
	if combatant == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("combatant %s not found", combatantID)}
	}
	if combatant.Action == state.ActionUsed {
		return nil, &CombatError{Code: ErrActionExhausted, Message: "action already used this turn"}
	}

	combatant.Action = state.ActionUsed
	if modifyFn != nil {
		modifyFn(combatant)
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
		// Modified in place
	})
	if err != nil {
		return nil, fmt.Errorf("%s action: %w", actionName, err)
	}

	return map[string]interface{}{
		"action":      actionName,
		"combatant":   combatant.Name,
		"combatantId": combatantID,
		"message":     fmt.Sprintf("%s takes the %s action.", combatant.Name, actionName),
	}, nil
}

// rollCriticalDamage doubles damage dice on a critical hit.
func (cm *CombatManager) rollCriticalDamage(damageDice string, damageBonus int) (int, []int, error) {
	// Roll the base dice first
	baseResult, err := cm.diceService.Roll(damageDice)
	if err != nil {
		return 0, nil, err
	}

	// Roll the dice again (doubling)
	doubleResult, err := cm.diceService.Roll(damageDice)
	if err != nil {
		return 0, nil, err
	}

	allDice := append(baseResult.Dice, doubleResult.Dice...)
	total := baseResult.Total + doubleResult.Total + damageBonus

	return total, allDice, nil
}

// hasInternalCondition checks for internal action markers (dodging, disengaging,
// hidden, ready) that are not PHB conditions and thus not in the types.Condition enum.
func hasInternalCondition(c *state.Combatant, marker string) bool {
	for _, cond := range c.Conditions {
		if string(cond.Condition) == marker {
			return true
		}
	}
	return false
}

// boolToString converts a bool to one of two string options.
func boolToString(b bool, ifTrue, ifFalse string) string {
	if b {
		return ifTrue
	}
	return ifFalse
}

// hasActiveEffect checks if there's an active effect with a specific condition on a target.
func hasActiveEffect(cs *state.CombatState, effectCondition, targetID string) bool {
	if cs == nil {
		return false
	}
	for _, effect := range cs.ActiveEffects {
		if effect.TargetID == targetID {
			for _, c := range effect.Conditions {
				if c == effectCondition {
					return true
				}
			}
		}
	}
	return false
}
