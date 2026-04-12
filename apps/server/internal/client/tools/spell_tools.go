// Package tools provides MCP tool registration for spell operations.
package tools

import (
	"fmt"
)

// RegisterSpellTools registers all spell-related MCP tools.
// Handlers return placeholder responses until business logic is implemented in Phase 2.
func RegisterSpellTools(registry *Registry) {
	registerCastSpell(registry)
	registerPrepareSpell(registry)
	registerUnprepareSpell(registry)
	registerGetSpellInfo(registry)
}

// registerCastSpell registers the cast_spell tool.
func registerCastSpell(registry *Registry) {
	registry.Register(Tool{
		Name:        "cast_spell",
		Description: "Casts a spell. Validates spell slot availability and concentration requirements, consumes the spell slot, and calculates spell effects.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"caster_id": map[string]interface{}{
					"type":        "string",
					"description": "The ID of the character casting the spell",
				},
				"spell_id": map[string]interface{}{
					"type":        "string",
					"description": "The ID of the spell to cast",
				},
				"slot_level": map[string]interface{}{
					"type":        "integer",
					"description": "The spell slot level to use (0 for cantrips)",
				},
				"target_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional: target creature ID for targeted spells",
				},
			},
			"required": []string{"session_id", "caster_id", "spell_id", "slot_level"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			casterID, _ := args["caster_id"].(string)
			spellID, _ := args["spell_id"].(string)
			slotLevel := intArg(args, "slot_level", 0)

			// Placeholder: actual spell casting logic to be implemented in Phase 2
			return map[string]interface{}{
				"success":    false,
				"message":    "spell casting not yet implemented",
				"caster_id":  casterID,
				"spell_id":   spellID,
				"slot_level": slotLevel,
			}, nil
		},
	})
}

// registerPrepareSpell registers the prepare_spell tool.
func registerPrepareSpell(registry *Registry) {
	registry.Register(Tool{
		Name:        "prepare_spell",
		Description: "Prepares a spell for a character. Prepared spells can be cast using available spell slots.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character preparing the spell",
				},
				"spell_id": map[string]interface{}{
					"type":        "string",
					"description": "The spell ID to prepare",
				},
			},
			"required": []string{"session_id", "character_id", "spell_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			spellID, _ := args["spell_id"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "spell preparation not yet implemented",
				"character_id": characterID,
				"spell_id":     spellID,
			}, nil
		},
	})
}

// registerUnprepareSpell registers the unprepare_spell tool.
func registerUnprepareSpell(registry *Registry) {
	registry.Register(Tool{
		Name:        "unprepare_spell",
		Description: "Removes a spell from a character's prepared spells list.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character unpreparing the spell",
				},
				"spell_id": map[string]interface{}{
					"type":        "string",
					"description": "The spell ID to unprepare",
				},
			},
			"required": []string{"session_id", "character_id", "spell_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			spellID, _ := args["spell_id"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "spell unpreparation not yet implemented",
				"character_id": characterID,
				"spell_id":     spellID,
			}, nil
		},
	})
}

// registerGetSpellInfo registers the get_spell_info tool.
func registerGetSpellInfo(registry *Registry) {
	registry.Register(Tool{
		Name:        "get_spell_info",
		Description: "Retrieves detailed information about a spell, including its effects, casting time, duration, and required components.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"spell_id": map[string]interface{}{
					"type":        "string",
					"description": "The spell ID to look up",
				},
			},
			"required": []string{"spell_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			spellID, _ := args["spell_id"].(string)
			if spellID == "" {
				return nil, fmt.Errorf("spell_id is required")
			}

			// Placeholder
			return map[string]interface{}{
				"success":  false,
				"message":  "spell info lookup not yet implemented",
				"spell_id": spellID,
			}, nil
		},
	})
}
