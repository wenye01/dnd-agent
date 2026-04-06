package combat

import (
	"fmt"

	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
)

// ConditionModifiers describes how a condition affects rolls.
type ConditionModifiers struct {
	AttackAdvantage     bool // True if condition grants advantage on attacks
	AttackDisadvantage  bool // True if condition grants disadvantage on attacks
	DefenseAdvantage    bool // True if attacks against have advantage
	DefenseDisadvantage bool // True if attacks against have disadvantage
	SpeedOverride       int  // If > 0, sets speed to this value
	Incapacitated       bool // True if cannot take actions/reactions
	AutoFailSTRDEX      bool // True if auto-fails STR/DEX saves
	AutoCritMelee       bool // True if melee attacks against are auto-crits
	DamageResistance    bool // True if resistant to all damage
}

// conditionEffects maps each condition to its mechanical effects.
var conditionEffects = map[string]ConditionModifiers{
	"blinded": {
		AttackDisadvantage: true, // Disadvantage on attacks
		DefenseAdvantage:   true, // Advantage to attacks against
	},
	"charmed": {
		// Charmed creature can't attack the charmer (handled at action level)
	},
	"deafened": {
		// Auto-fail hearing checks (narrative, no mechanical modifier)
	},
	"frightened": {
		AttackDisadvantage: true, // Disadvantage on checks/attacks while source visible
	},
	"grappled": {
		SpeedOverride: 0, // Speed becomes 0
	},
	"incapacitated": {
		Incapacitated: true,
	},
	"invisible": {
		AttackAdvantage:     true, // Advantage on attacks
		DefenseDisadvantage: true, // Disadvantage to be attacked
	},
	"paralyzed": {
		Incapacitated:  true,
		AutoFailSTRDEX: true,
		AutoCritMelee:  true, // Auto-crit on melee attacks against
	},
	"petrified": {
		Incapacitated:    true,
		AutoFailSTRDEX:   true,
		DamageResistance: true, // Resistant to all damage
	},
	"poisoned": {
		AttackDisadvantage: true, // Disadvantage on attacks and checks
	},
	"prone": {
		AttackDisadvantage: true, // Disadvantage on attacks
		DefenseAdvantage:   true, // Advantage to melee attacks against
	},
	"restrained": {
		AttackDisadvantage: true,
		DefenseAdvantage:   true,
		SpeedOverride:      0,
	},
	"stunned": {
		Incapacitated:    true,
		AutoFailSTRDEX:   true,
		DefenseAdvantage: true, // Advantage to attacks against
	},
	"unconscious": {
		Incapacitated:    true,
		AutoFailSTRDEX:   true,
		AutoCritMelee:    true,
		DefenseAdvantage: true,
	},
	"exhaustion": {
		// Exhaustion effects depend on level; handled separately
	},
}

// exhaustionLevelEffects returns modifiers for a given exhaustion level.
func exhaustionLevelEffects(level int) ConditionModifiers {
	mod := ConditionModifiers{}
	if level >= 1 {
		mod.AttackDisadvantage = true // Disadvantage on ability checks
	}
	// Level 2: speed halved (handled in speed calculation)
	// Level 3: disadvantage on attacks and saving throws
	if level >= 3 {
		mod.AttackDisadvantage = true
	}
	// Level 4: hit point maximum halved
	// Level 5: speed reduced to 0
	if level >= 5 {
		mod.SpeedOverride = 0
	}
	// Level 6: death
	return mod
}

// GetConditionModifiers returns the combined modifiers from all conditions on a combatant.
func GetConditionModifiers(c *state.Combatant) ConditionModifiers {
	combined := ConditionModifiers{}

	for _, cond := range c.Conditions {
		if cond.Condition == "exhaustion" {
			level := cond.Level
			if level < 1 {
				level = 1
			}
			exhMod := exhaustionLevelEffects(level)
			combined = mergeModifiers(combined, exhMod)
			continue
		}

		if mod, ok := conditionEffects[cond.Condition]; ok {
			combined = mergeModifiers(combined, mod)
		}
	}

	return combined
}

// mergeModifiers combines two ConditionModifiers. The result is true if either is true
// for boolean fields, and the non-zero value for integer fields.
func mergeModifiers(a, b ConditionModifiers) ConditionModifiers {
	return ConditionModifiers{
		AttackAdvantage:     a.AttackAdvantage || b.AttackAdvantage,
		AttackDisadvantage:  a.AttackDisadvantage || b.AttackDisadvantage,
		DefenseAdvantage:    a.DefenseAdvantage || b.DefenseAdvantage,
		DefenseDisadvantage: a.DefenseDisadvantage || b.DefenseDisadvantage,
		SpeedOverride:       nonzero(a.SpeedOverride, b.SpeedOverride),
		Incapacitated:       a.Incapacitated || b.Incapacitated,
		AutoFailSTRDEX:      a.AutoFailSTRDEX || b.AutoFailSTRDEX,
		AutoCritMelee:       a.AutoCritMelee || b.AutoCritMelee,
		DamageResistance:    a.DamageResistance || b.DamageResistance,
	}
}

func nonzero(a, b int) int {
	if a != 0 {
		return a
	}
	return b
}

// ApplyCondition applies a condition to a combatant in active combat.
func (cm *CombatManager) ApplyCondition(sessionID, targetID string, condition string, source string, duration int, level int) (map[string]interface{}, error) {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// Validate condition
	c := types.Condition(condition)
	if !c.Valid() {
		return nil, fmt.Errorf("invalid condition: %s", condition)
	}

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

	// For exhaustion, use level to determine stacking
	if condition == string(types.ConditionExhaustion) {
		return cm.applyExhaustion(sessionID, target, level)
	}

	// Check if condition already exists (non-stacking for most conditions)
	for _, existing := range target.Conditions {
		if existing.Condition == condition {
			// Condition already present; update duration if new is longer
			if duration > existing.Duration || duration == 0 {
				existing.Duration = duration
				existing.Remaining = duration
				existing.Source = source
			}
			err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {})
			if err != nil {
				return nil, fmt.Errorf("apply condition: %w", err)
			}
			return map[string]interface{}{
				"targetId":  targetID,
				"target":    target.Name,
				"condition": condition,
				"updated":   true,
				"message":   fmt.Sprintf("%s's %s condition is renewed.", target.Name, condition),
			}, nil
		}
	}

	// Apply new condition
	entry := &state.ConditionEntry{
		Condition: condition,
		Source:    source,
		Duration:  duration,
		Remaining: duration,
	}
	target.Conditions = append(target.Conditions, entry)

	// Special handling for unconscious
	if condition == "unconscious" {
		// Drop prone when unconscious
		alreadyProne := false
		for _, cond := range target.Conditions {
			if cond.Condition == "prone" {
				alreadyProne = true
				break
			}
		}
		if !alreadyProne {
			target.Conditions = append(target.Conditions, &state.ConditionEntry{
				Condition: "prone",
				Source:    "unconscious",
				Duration:  0,
				Remaining: 0,
			})
		}
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {})
	if err != nil {
		return nil, fmt.Errorf("apply condition: %w", err)
	}

	return map[string]interface{}{
		"targetId":  targetID,
		"target":    target.Name,
		"condition": condition,
		"source":    source,
		"duration":  duration,
		"message":   fmt.Sprintf("%s is now %s.", target.Name, condition),
	}, nil
}

// applyExhaustion handles the special exhaustion condition with levels.
func (cm *CombatManager) applyExhaustion(sessionID string, target *state.Combatant, level int) (map[string]interface{}, error) {
	// Find existing exhaustion
	var existingLevel int
	var existingIdx int = -1
	for i, cond := range target.Conditions {
		if cond.Condition == "exhaustion" {
			existingLevel = cond.Level
			existingIdx = i
			break
		}
	}

	newLevel := existingLevel + level
	if newLevel > 6 {
		newLevel = 6
	}

	if newLevel >= 6 {
		// Level 6 exhaustion = death
		target.CurrentHP = 0
		target.Conditions = append(target.Conditions, &state.ConditionEntry{
			Condition: "dead",
			Source:    "exhaustion",
			Duration:  0,
			Remaining: 0,
		})

		err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {})
		if err != nil {
			return nil, fmt.Errorf("apply exhaustion: %w", err)
		}

		return map[string]interface{}{
			"targetId":  target.ID,
			"target":    target.Name,
			"condition": "exhaustion",
			"level":     6,
			"dead":      true,
			"message":   fmt.Sprintf("%s dies from exhaustion level 6!", target.Name),
		}, nil
	}

	if existingIdx >= 0 {
		target.Conditions[existingIdx].Level = newLevel
	} else {
		target.Conditions = append(target.Conditions, &state.ConditionEntry{
			Condition: "exhaustion",
			Source:    "combat",
			Duration:  0,
			Remaining: 0,
			Level:     newLevel,
		})
	}

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {})
	if err != nil {
		return nil, fmt.Errorf("apply exhaustion: %w", err)
	}

	return map[string]interface{}{
		"targetId":  target.ID,
		"target":    target.Name,
		"condition": "exhaustion",
		"level":     newLevel,
		"message":   fmt.Sprintf("%s is now at exhaustion level %d.", target.Name, newLevel),
	}, nil
}

// RemoveCondition removes a condition from a combatant.
func (cm *CombatManager) RemoveCondition(sessionID, targetID string, condition string) (map[string]interface{}, error) {
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

	found := false
	newConditions := make([]*state.ConditionEntry, 0, len(target.Conditions))
	for _, cond := range target.Conditions {
		if cond.Condition == condition {
			found = true
			continue
		}
		newConditions = append(newConditions, cond)
	}
	target.Conditions = newConditions

	err := cm.stateManager.UpdateSession(sessionID, func(gs *state.GameState) {})
	if err != nil {
		return nil, fmt.Errorf("remove condition: %w", err)
	}

	if !found {
		return map[string]interface{}{
			"targetId":  targetID,
			"target":    target.Name,
			"condition": condition,
			"removed":   false,
			"message":   fmt.Sprintf("%s did not have the %s condition.", target.Name, condition),
		}, nil
	}

	return map[string]interface{}{
		"targetId":  targetID,
		"target":    target.Name,
		"condition": condition,
		"removed":   true,
		"message":   fmt.Sprintf("%s is no longer %s.", target.Name, condition),
	}, nil
}

// GetConditions returns all conditions on a combatant.
func (cm *CombatManager) GetConditions(sessionID, targetID string) (map[string]interface{}, error) {
	cm.mu.RLock()
	defer cm.mu.RUnlock()

	gs := cm.stateManager.GetSession(sessionID)
	if gs == nil {
		return nil, &CombatError{Code: ErrCombatNotFound, Message: "session not found"}
	}
	if gs.Combat == nil {
		return nil, &CombatError{Code: ErrCombatNotActive, Message: "no active combat"}
	}

	target := cm.getCombatantByID(gs.Combat, targetID)
	if target == nil {
		return nil, &CombatError{Code: ErrCombatantNotFound, Message: fmt.Sprintf("target %s not found", targetID)}
	}

	return map[string]interface{}{
		"targetId":   targetID,
		"target":     target.Name,
		"conditions": target.Conditions,
	}, nil
}
