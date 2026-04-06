// Package tools provides MCP tool registration for combat operations.
package tools

import (
	"fmt"

	"github.com/rs/zerolog/log"

	"github.com/dnd-game/server/internal/server/combat"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
)

// RegisterCombatTools registers all combat-related MCP tools.
// Follows the same pattern as RegisterDiceTools in registry.go.
func RegisterCombatTools(registry *Registry, combatMgr *combat.CombatManager) {
	registerStartCombat(registry, combatMgr)
	registerEndCombat(registry, combatMgr)
	registerGetCombatState(registry, combatMgr)
	registerEndTurn(registry, combatMgr)
	registerAttackAction(registry, combatMgr)
	registerApplyDamage(registry, combatMgr)
	registerApplyHealing(registry, combatMgr)
	registerAddTemporaryHP(registry, combatMgr)
	registerShortRest(registry, combatMgr)
	registerLongRest(registry, combatMgr)
	registerDeathSave(registry, combatMgr)
	registerStabilize(registry, combatMgr)
	registerApplyCondition(registry, combatMgr)
	registerRemoveCondition(registry, combatMgr)
	registerGetConditions(registry, combatMgr)
	registerDodgeAction(registry, combatMgr)
	registerDisengageAction(registry, combatMgr)
	registerHelpAction(registry, combatMgr)
	registerHideAction(registry, combatMgr)
	registerReadyAction(registry, combatMgr)
	registerOpportunityAttack(registry, combatMgr)
}

// parseCombatants converts raw interface{} combatants data into state.Combatant structs.
func parseCombatants(raw []interface{}) []*state.Combatant {
	combatants := make([]*state.Combatant, 0, len(raw))

	for _, item := range raw {
		m, ok := item.(map[string]interface{})
		if !ok {
			log.Warn().Interface("item", item).Msg("skipping invalid combatant entry")
			continue
		}
		c := &state.Combatant{
			ID:          getStrVal(m, "id"),
			Name:        getStrVal(m, "name"),
			Type:        state.CombatantType(getStrVal(m, "type")),
			MaxHP:       getIntVal(m, "maxHp", 10),
			CurrentHP:   getIntVal(m, "currentHp", 10),
			TemporaryHP: getIntVal(m, "temporaryHp", 0),
			AC:          getIntVal(m, "ac", 10),
			Speed:       getIntVal(m, "speed", 30),
			DexScore:    getIntVal(m, "dexScore", 10),
			Level:       getIntVal(m, "level", 1),
			CONMod:      getIntVal(m, "conMod", 0),
			CharacterID: getStrVal(m, "characterId"),
			Action:      state.ActionAvailable,
			BonusAction: state.ActionAvailable,
			Reaction:    state.ActionAvailable,
		}

		// Hit dice
		hitDiceTotal := getIntVal(m, "hitDiceTotal", c.Level)
		hitDiceCurrent := getIntVal(m, "hitDiceCurrent", hitDiceTotal)
		hitDiceSize := getIntVal(m, "hitDiceSize", 8)
		c.HitDice = models.HitDiceInfo{
			Total:   hitDiceTotal,
			Current: hitDiceCurrent,
			Size:    hitDiceSize,
		}

		// Death saves for player characters
		if c.Type == state.CombatantPlayer {
			c.DeathSaves = &models.DeathSaves{}
		}

		// Damage resistances
		if res, ok := m["damageResistances"].([]interface{}); ok {
			for _, r := range res {
				if s, ok := r.(string); ok {
					c.DamageResistances = append(c.DamageResistances, s)
				}
			}
		}

		// Damage immunities
		if imm, ok := m["damageImmunities"].([]interface{}); ok {
			for _, i := range imm {
				if s, ok := i.(string); ok {
					c.DamageImmunities = append(c.DamageImmunities, s)
				}
			}
		}

		combatants = append(combatants, c)
	}
	return combatants
}

// getStrVal extracts a string value from a map.
func getStrVal(m map[string]interface{}, key string) string {
	if v, ok := m[key]; ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}

// getIntVal extracts an integer value from a map.
func getIntVal(m map[string]interface{}, key string, defaultVal int) int {
	if v, ok := m[key]; ok {
		switch n := v.(type) {
		case float64:
			return int(n)
		case int:
			return n
		case float32:
			return int(n)
		}
	}
	return defaultVal
}

// registerStartCombat registers the start_combat tool.
func registerStartCombat(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "start_combat",
		Description: "Starts a combat encounter with the given participants. Rolls initiative and begins round 1. Provide combatant details including ID, name, type (player/npc/enemy), HP, AC, DEX score, and optionally damage resistances/immunities.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"combatants": map[string]interface{}{
					"type":        "array",
					"description": "List of combat participants",
					"items": map[string]interface{}{
						"type": "object",
						"properties": map[string]interface{}{
							"id":                map[string]interface{}{"type": "string", "description": "Unique combatant ID"},
							"name":              map[string]interface{}{"type": "string", "description": "Display name"},
							"type":              map[string]interface{}{"type": "string", "description": "player, npc, or enemy"},
							"maxHp":             map[string]interface{}{"type": "integer", "description": "Maximum hit points"},
							"currentHp":         map[string]interface{}{"type": "integer", "description": "Current hit points"},
							"ac":                map[string]interface{}{"type": "integer", "description": "Armor class"},
							"dexScore":          map[string]interface{}{"type": "integer", "description": "Dexterity ability score (for initiative tiebreaker)"},
							"speed":             map[string]interface{}{"type": "integer", "description": "Movement speed in feet"},
							"level":             map[string]interface{}{"type": "integer", "description": "Character level"},
							"conMod":            map[string]interface{}{"type": "integer", "description": "Constitution modifier"},
							"hitDiceTotal":      map[string]interface{}{"type": "integer", "description": "Total hit dice"},
							"hitDiceCurrent":    map[string]interface{}{"type": "integer", "description": "Current available hit dice"},
							"hitDiceSize":       map[string]interface{}{"type": "integer", "description": "Hit die size (6=d6, 8=d8, 10=d10, 12=d12)"},
							"damageResistances": map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "Damage types resisted"},
							"damageImmunities":  map[string]interface{}{"type": "array", "items": map[string]interface{}{"type": "string"}, "description": "Damage types immune to"},
							"characterId":       map[string]interface{}{"type": "string", "description": "Reference to party character ID for syncing"},
						},
						"required": []string{"id", "name", "type", "maxHp", "currentHp", "ac", "dexScore"},
					},
				},
			},
			"required": []string{"session_id", "combatants"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantsRaw, ok := args["combatants"].([]interface{})
			if !ok {
				return nil, fmt.Errorf("combatants must be an array")
			}

			combatants := parseCombatants(combatantsRaw)
			return combatMgr.StartCombat(sessionID, combatants)
		},
	})
}

// registerEndCombat registers the end_combat tool.
func registerEndCombat(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "end_combat",
		Description: "Ends the active combat encounter for the session.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
			},
			"required": []string{"session_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			return combatMgr.EndCombat(sessionID)
		},
	})
}

// registerGetCombatState registers the get_combat_state tool.
func registerGetCombatState(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "get_combat_state",
		Description: "Gets the current state of combat including round, turn order, current combatant, and all participant statuses.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
			},
			"required": []string{"session_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			return combatMgr.GetCombatState(sessionID)
		},
	})
}

// registerEndTurn registers the end_turn tool.
func registerEndTurn(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "end_turn",
		Description: "Ends the current combatant's turn and advances to the next combatant in initiative order. Also processes end-of-turn effects like condition durations.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
			},
			"required": []string{"session_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			return combatMgr.EndTurn(sessionID)
		},
	})
}

// registerAttackAction registers the attack action tool.
func registerAttackAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "attack",
		Description: "Performs an attack action in combat. Rolls d20 + attack bonus vs target AC. On hit, rolls damage dice. Critical hits (natural 20) double the damage dice.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"attacker_id":  map[string]interface{}{"type": "string", "description": "The attacking combatant's ID"},
				"target_id":    map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"attack_bonus": map[string]interface{}{"type": "integer", "description": "Attack roll modifier (proficiency + ability modifier)"},
				"damage_dice":  map[string]interface{}{"type": "string", "description": "Damage dice formula, e.g. '1d8' or '2d6'"},
				"damage_bonus": map[string]interface{}{"type": "integer", "description": "Additional damage modifier"},
				"damage_type":  map[string]interface{}{"type": "string", "description": "Type of damage: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder"},
				"advantage":    map[string]interface{}{"type": "boolean", "description": "Whether the attack has advantage"},
				"disadvantage": map[string]interface{}{"type": "boolean", "description": "Whether the attack has disadvantage"},
			},
			"required": []string{"session_id", "attacker_id", "target_id", "attack_bonus", "damage_dice", "damage_type"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			attackerID, _ := args["attacker_id"].(string)
			targetID, _ := args["target_id"].(string)
			attackBonus := intArg(args, "attack_bonus", 0)
			damageDice, _ := args["damage_dice"].(string)
			damageBonus := intArg(args, "damage_bonus", 0)
			damageType, _ := args["damage_type"].(string)
			advantage := boolArg(args, "advantage", false)
			disadvantage := boolArg(args, "disadvantage", false)
			return combatMgr.AttackAction(sessionID, attackerID, targetID, attackBonus, damageDice, damageBonus, damageType, advantage, disadvantage)
		},
	})
}

// registerApplyDamage registers the apply_damage tool.
func registerApplyDamage(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "apply_damage",
		Description: "Applies damage to a combatant. Handles damage resistances (half damage), immunities (zero damage), and temporary HP absorption automatically.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":  map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":   map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"damage":      map[string]interface{}{"type": "integer", "description": "Amount of damage to apply"},
				"damage_type": map[string]interface{}{"type": "string", "description": "Type of damage: acid, bludgeoning, cold, fire, force, lightning, necrotic, piercing, poison, psychic, radiant, slashing, thunder"},
			},
			"required": []string{"session_id", "target_id", "damage", "damage_type"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			damage := intArg(args, "damage", 0)
			damageType, _ := args["damage_type"].(string)
			return combatMgr.ApplyDamage(sessionID, targetID, damage, damageType)
		},
	})
}

// registerApplyHealing registers the apply_healing tool.
func registerApplyHealing(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "apply_healing",
		Description: "Heals a combatant. HP cannot exceed MaxHP. Healing a character at 0 HP also restores consciousness and clears death saves.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":  map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"healing":    map[string]interface{}{"type": "integer", "description": "Amount of HP to heal"},
			},
			"required": []string{"session_id", "target_id", "healing"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			healing := intArg(args, "healing", 0)
			return combatMgr.ApplyHealing(sessionID, targetID, healing)
		},
	})
}

// registerAddTemporaryHP registers the add_temporary_hp tool.
func registerAddTemporaryHP(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "add_temporary_hp",
		Description: "Adds temporary hit points to a combatant. Temporary HP does not stack; the higher value wins. Damage is applied to temporary HP first before regular HP.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":    map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"temporary_hp": map[string]interface{}{"type": "integer", "description": "Amount of temporary HP to grant"},
			},
			"required": []string{"session_id", "target_id", "temporary_hp"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			tempHP := intArg(args, "temporary_hp", 0)
			return combatMgr.AddTemporaryHP(sessionID, targetID, tempHP)
		},
	})
}

// registerShortRest registers the short_rest tool.
func registerShortRest(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "short_rest",
		Description: "Performs a short rest for a character, allowing them to spend hit dice to recover HP. Each hit die restores roll + CON modifier HP (minimum 1).",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":    map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id":  map[string]interface{}{"type": "string", "description": "The character's ID"},
				"dice_to_spend": map[string]interface{}{"type": "integer", "description": "Number of hit dice to spend"},
			},
			"required": []string{"session_id", "combatant_id", "dice_to_spend"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			diceToSpend := intArg(args, "dice_to_spend", 1)
			return combatMgr.ShortRest(sessionID, combatantID, diceToSpend)
		},
	})
}

// registerLongRest registers the long_rest tool.
func registerLongRest(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "long_rest",
		Description: "Performs a long rest: restores HP to MaxHP, recovers half of spent hit dice (rounded down), and clears death saves. Spell slots are not restored in this version.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id": map[string]interface{}{"type": "string", "description": "The character's ID"},
			},
			"required": []string{"session_id", "combatant_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			return combatMgr.LongRest(sessionID, combatantID)
		},
	})
}

// registerDeathSave registers the death_save tool.
func registerDeathSave(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "death_save",
		Description: "Performs a death saving throw for a character at 0 HP. Roll d20: >=10 is success, <10 is failure. Natural 1 = 2 failures, natural 20 = regain 1 HP. 3 successes = stabilize, 3 failures = death.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id": map[string]interface{}{"type": "string", "description": "The character's ID"},
			},
			"required": []string{"session_id", "combatant_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			return combatMgr.DeathSave(sessionID, combatantID)
		},
	})
}

// registerStabilize registers the stabilize tool.
func registerStabilize(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "stabilize",
		Description: "Attempts to stabilize a dying character with a Medicine check. DC 10. Success sets death saves to 3 successes (stable). The medicine check total should be provided.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":           map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id":         map[string]interface{}{"type": "string", "description": "The dying character's ID"},
				"medicine_check_total": map[string]interface{}{"type": "integer", "description": "The total of the Medicine ability check (roll + modifier)"},
			},
			"required": []string{"session_id", "combatant_id", "medicine_check_total"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			checkTotal := intArg(args, "medicine_check_total", 0)
			return combatMgr.Stabilize(sessionID, combatantID, checkTotal)
		},
	})
}

// registerApplyCondition registers the apply_condition tool.
func registerApplyCondition(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "apply_condition",
		Description: "Applies a condition to a combatant. Valid conditions: blinded, charmed, deafened, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned, unconscious, exhaustion. Duration is in rounds (0 = indefinite). For exhaustion, use the level parameter (1-6).",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":  map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"condition":  map[string]interface{}{"type": "string", "description": "The condition to apply"},
				"source":     map[string]interface{}{"type": "string", "description": "What is applying this condition"},
				"duration":   map[string]interface{}{"type": "integer", "description": "Duration in rounds (0 = indefinite)"},
				"level":      map[string]interface{}{"type": "integer", "description": "For exhaustion: levels to add (1-6 total max)"},
			},
			"required": []string{"session_id", "target_id", "condition"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			condition, _ := args["condition"].(string)
			source, _ := args["source"].(string)
			if source == "" {
				source = "dm"
			}
			duration := intArg(args, "duration", 0)
			level := intArg(args, "level", 1)
			return combatMgr.ApplyCondition(sessionID, targetID, condition, source, duration, level)
		},
	})
}

// registerRemoveCondition registers the remove_condition tool.
func registerRemoveCondition(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "remove_condition",
		Description: "Removes a condition from a combatant.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":  map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
				"condition":  map[string]interface{}{"type": "string", "description": "The condition to remove"},
			},
			"required": []string{"session_id", "target_id", "condition"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			condition, _ := args["condition"].(string)
			return combatMgr.RemoveCondition(sessionID, targetID, condition)
		},
	})
}

// registerGetConditions registers the get_conditions tool.
func registerGetConditions(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "get_conditions",
		Description: "Gets all active conditions on a combatant.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{"type": "string", "description": "The game session ID"},
				"target_id":  map[string]interface{}{"type": "string", "description": "The target combatant's ID"},
			},
			"required": []string{"session_id", "target_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			targetID, _ := args["target_id"].(string)
			return combatMgr.GetConditions(sessionID, targetID)
		},
	})
}

// registerDodgeAction registers the dodge action tool.
func registerDodgeAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "dodge",
		Description: "The Dodge action. Until the start of the combatant's next turn, any attack roll against them has disadvantage, and they make Dexterity saving throws with advantage.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id": map[string]interface{}{"type": "string", "description": "The combatant taking the Dodge action"},
			},
			"required": []string{"session_id", "combatant_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			return combatMgr.DodgeAction(sessionID, combatantID)
		},
	})
}

// registerDisengageAction registers the disengage action tool.
func registerDisengageAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "disengage",
		Description: "The Disengage action. The combatant's movement does not provoke opportunity attacks for the rest of the turn.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id": map[string]interface{}{"type": "string", "description": "The combatant taking the Disengage action"},
			},
			"required": []string{"session_id", "combatant_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			return combatMgr.DisengageAction(sessionID, combatantID)
		},
	})
}

// registerHelpAction registers the help action tool.
func registerHelpAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "help",
		Description: "The Help action. Grants advantage to the next attack roll against the specified target. Alternatively can help with an ability check.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{"type": "string", "description": "The game session ID"},
				"helper_id":  map[string]interface{}{"type": "string", "description": "The combatant providing help"},
				"target_id":  map[string]interface{}{"type": "string", "description": "The target creature (enemy for attack help, ally for ability check help)"},
			},
			"required": []string{"session_id", "helper_id", "target_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			helperID, _ := args["helper_id"].(string)
			targetID, _ := args["target_id"].(string)
			return combatMgr.HelpAction(sessionID, helperID, targetID)
		},
	})
}

// registerHideAction registers the hide action tool.
func registerHideAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "hide",
		Description: "The Hide action. Makes a Dexterity (Stealth) check against the passive Perception of enemies. On success, the combatant is hidden.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":         map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id":       map[string]interface{}{"type": "string", "description": "The combatant attempting to hide"},
				"stealth_modifier":   map[string]interface{}{"type": "integer", "description": "Dexterity (Stealth) modifier"},
				"passive_perception": map[string]interface{}{"type": "integer", "description": "Highest passive Perception among enemies"},
			},
			"required": []string{"session_id", "combatant_id", "stealth_modifier", "passive_perception"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			stealthMod := intArg(args, "stealth_modifier", 0)
			passivePerception := intArg(args, "passive_perception", 10)
			return combatMgr.HideAction(sessionID, combatantID, stealthMod, passivePerception)
		},
	})
}

// registerReadyAction registers the ready action tool.
func registerReadyAction(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "ready",
		Description: "The Ready action. Prepares a triggered action. When the trigger occurs, the combatant can use their reaction to execute the prepared action.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"combatant_id": map[string]interface{}{"type": "string", "description": "The combatant readying an action"},
				"trigger":      map[string]interface{}{"type": "string", "description": "Description of the trigger condition"},
			},
			"required": []string{"session_id", "combatant_id", "trigger"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			combatantID, _ := args["combatant_id"].(string)
			trigger, _ := args["trigger"].(string)
			return combatMgr.ReadyAction(sessionID, combatantID, trigger)
		},
	})
}

// registerOpportunityAttack registers the opportunity_attack tool.
func registerOpportunityAttack(registry *Registry, combatMgr *combat.CombatManager) {
	registry.Register(Tool{
		Name:        "opportunity_attack",
		Description: "Performs an opportunity attack (reaction) when an enemy moves out of reach. Consumes the attacker's reaction. Does not trigger if the target used the Disengage action.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id":   map[string]interface{}{"type": "string", "description": "The game session ID"},
				"attacker_id":  map[string]interface{}{"type": "string", "description": "The combatant making the reaction attack"},
				"target_id":    map[string]interface{}{"type": "string", "description": "The combatant that provoked the opportunity attack"},
				"attack_bonus": map[string]interface{}{"type": "integer", "description": "Attack roll modifier"},
				"damage_dice":  map[string]interface{}{"type": "string", "description": "Damage dice formula"},
				"damage_bonus": map[string]interface{}{"type": "integer", "description": "Additional damage modifier"},
				"damage_type":  map[string]interface{}{"type": "string", "description": "Type of damage"},
			},
			"required": []string{"session_id", "attacker_id", "target_id", "attack_bonus", "damage_dice", "damage_type"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			attackerID, _ := args["attacker_id"].(string)
			targetID, _ := args["target_id"].(string)
			attackBonus := intArg(args, "attack_bonus", 0)
			damageDice, _ := args["damage_dice"].(string)
			damageBonus := intArg(args, "damage_bonus", 0)
			damageType, _ := args["damage_type"].(string)
			return combatMgr.OpportunityAttack(sessionID, attackerID, targetID, attackBonus, damageDice, damageBonus, damageType)
		},
	})
}
