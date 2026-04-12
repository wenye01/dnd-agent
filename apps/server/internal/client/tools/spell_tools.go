// Package tools provides MCP tool registration for spell operations.
package tools

import (
	"fmt"

	"github.com/dnd-game/server/internal/server/spell"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/pkg/dnd5e/spells"
)

// RegisterSpellTools registers all spell-related MCP tools with actual business logic.
func RegisterSpellTools(registry *Registry, stateManager *state.Manager, castingMgr *spell.CastingManager, spellStore *spells.SpellStore) {
	registerCastSpell(registry, stateManager, castingMgr)
	registerPrepareSpell(registry, stateManager, castingMgr)
	registerUnprepareSpell(registry, stateManager, castingMgr)
	registerGetSpellInfo(registry, spellStore)
}

// registerCastSpell registers the cast_spell tool.
func registerCastSpell(registry *Registry, stateManager *state.Manager, castingMgr *spell.CastingManager) {
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
			if casterID == "" {
				return nil, fmt.Errorf("caster_id is required")
			}
			spellID, _ := args["spell_id"].(string)
			if spellID == "" {
				return nil, fmt.Errorf("spell_id is required")
			}
			slotLevel := intArg(args, "slot_level", 0)
			targetID, _ := args["target_id"].(string)

			// Perform all state reads and writes within a single
			// UpdateSession callback to prevent data races (P0-2).
			var result *spell.CastSpellResult
			var castErr error
			err := stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
				caster := findCharacterInParty(gs, casterID)
				if caster == nil {
					castErr = fmt.Errorf("character not found: %s", casterID)
					return
				}

				// Execute the spell cast through the service.
				result, castErr = castingMgr.CastSpell(caster, &spell.CastSpellRequest{
					CasterID: casterID,
					SpellID:  spellID,
					Level:    slotLevel,
					TargetID: targetID,
				})
				if castErr != nil {
					return
				}

				// Sync concentration from ConcentrationManager to
				// GameState (P0-1): read from the in-memory tracker and
				// write into the character persisted field.
				conc := castingMgr.GetActiveConcentration(casterID)
				caster.Concentration = conc

				// Apply effects to combat targets if in combat.
				if gs.Combat != nil && gs.Combat.Status == state.CombatActive {
					for _, effectResult := range result.Effects {
						if effectResult.TargetID == "" {
							continue
						}
						for _, p := range gs.Combat.Participants {
							if p.ID == effectResult.TargetID {
								// Apply damage.
								if effectResult.Damage > 0 {
									p.CurrentHP -= effectResult.Damage
									if p.CurrentHP < 0 {
										p.CurrentHP = 0
									}
								}
								// Apply healing.
								if effectResult.Healing > 0 {
									p.CurrentHP += effectResult.Healing
									if p.CurrentHP > p.MaxHP {
										p.CurrentHP = p.MaxHP
									}
								}
								break
							}
						}
					}
				}
			})
			if err != nil {
				return nil, fmt.Errorf("session not found: %s", sessionID)
			}
			if castErr != nil {
				return map[string]interface{}{
					"success":   false,
					"message":   castErr.Error(),
					"caster_id": casterID,
					"spell_id":  spellID,
				}, nil
			}

			return result, nil
		},
	})
}

// registerPrepareSpell registers the prepare_spell tool.
func registerPrepareSpell(registry *Registry, stateManager *state.Manager, castingMgr *spell.CastingManager) {
	registry.Register(Tool{
		Name:        "prepare_spell",
		Description: "Prepares a spell for a character. Prepared spells can be cast using available spell slots. Wizards and clerics must prepare spells; sorcerers and bards do not need to.",
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
			if characterID == "" {
				return nil, fmt.Errorf("character_id is required")
			}
			spellID, _ := args["spell_id"].(string)
			if spellID == "" {
				return nil, fmt.Errorf("spell_id is required")
			}

			// Use a single UpdateSession to prevent TOCTOU races.
			var charName string
			var preparedSpells []string
			var spellErr error
			var charNotFound bool
			err := stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
				char := findCharacterInParty(gs, characterID)
				if char == nil {
					charNotFound = true
					return
				}
				spellErr = castingMgr.PrepareSpell(char, spellID)
				if spellErr != nil {
					return
				}
				charName = char.Name
				preparedSpells = char.PreparedSpells
			})
			if err != nil {
				return nil, fmt.Errorf("session not found: %s", sessionID)
			}
			if charNotFound {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			if spellErr != nil {
				return map[string]interface{}{
					"success":      false,
					"message":      spellErr.Error(),
					"character_id": characterID,
					"spell_id":     spellID,
				}, nil
			}

			return map[string]interface{}{
				"success":         true,
				"message":         fmt.Sprintf("%s prepared %s", charName, spellID),
				"character_id":    characterID,
				"spell_id":        spellID,
				"prepared_spells": preparedSpells,
			}, nil
		},
	})
}

// registerUnprepareSpell registers the unprepare_spell tool.
func registerUnprepareSpell(registry *Registry, stateManager *state.Manager, castingMgr *spell.CastingManager) {
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
			if characterID == "" {
				return nil, fmt.Errorf("character_id is required")
			}
			spellID, _ := args["spell_id"].(string)
			if spellID == "" {
				return nil, fmt.Errorf("spell_id is required")
			}

			// Use a single UpdateSession to prevent TOCTOU races.
			var charName string
			var preparedSpells []string
			var spellErr error
			var charNotFound bool
			err := stateManager.UpdateSession(sessionID, func(gs *state.GameState) {
				char := findCharacterInParty(gs, characterID)
				if char == nil {
					charNotFound = true
					return
				}
				spellErr = castingMgr.UnprepareSpell(char, spellID)
				if spellErr != nil {
					return
				}
				charName = char.Name
				preparedSpells = char.PreparedSpells
			})
			if err != nil {
				return nil, fmt.Errorf("session not found: %s", sessionID)
			}
			if charNotFound {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			if spellErr != nil {
				return map[string]interface{}{
					"success":      false,
					"message":      spellErr.Error(),
					"character_id": characterID,
					"spell_id":     spellID,
				}, nil
			}

			return map[string]interface{}{
				"success":         true,
				"message":         fmt.Sprintf("%s unprepared %s", charName, spellID),
				"character_id":    characterID,
				"spell_id":        spellID,
				"prepared_spells": preparedSpells,
			}, nil
		},
	})
}

// registerGetSpellInfo registers the get_spell_info tool.
func registerGetSpellInfo(registry *Registry, spellStore *spells.SpellStore) {
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

			spell := spellStore.GetSpell(spellID)
			if spell == nil {
				return map[string]interface{}{
					"success":  false,
					"message":  fmt.Sprintf("spell %s not found", spellID),
					"spell_id": spellID,
				}, nil
			}

			return map[string]interface{}{
				"success": true,
				"spell":   spell,
			}, nil
		},
	})
}

// findCharacterInParty looks up a character by ID in the party list.
// Returns a pointer to the actual character so the spell service can mutate
// fields (spell slots, prepared spells, etc.). The caller must use
// UpdateSession to persist any changes.
func findCharacterInParty(gs *state.GameState, characterID string) *models.Character {
	// Note: This intentionally returns a direct pointer from the party slice
	// so that the spell service can mutate fields (spell slots, prepared spells).
	// The caller must use UpdateSession to persist changes.
	for _, ch := range gs.Party {
		if ch.ID == characterID {
			return ch
		}
	}
	return nil
}
