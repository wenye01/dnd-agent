// Package tools provides MCP tool registration for character management.
package tools

import (
	"fmt"
	"strings"

	"github.com/dnd-game/server/internal/server/character"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/dnd-game/server/internal/shared/types"
	"github.com/google/uuid"
	"github.com/rs/zerolog/log"
)

// CharacterStateProvider defines the interface for accessing and modifying
// character data in game state. This decouples tools from concrete state managers.
type CharacterStateProvider interface {
	// GetGameState returns the game state for a session, or nil if not found.
	GetGameState(sessionID string) *state.GameState
	// UpdateGameState atomically updates game state under a write lock.
	UpdateGameState(sessionID string, updateFn func(*state.GameState)) error
}

// RegisterCharacterTools registers all character-related MCP tools.
// The sessionID for each operation is extracted from the tool arguments.
func RegisterCharacterTools(registry *Registry, stateProvider CharacterStateProvider) {
	registry.Register(Tool{
		Name:        "create_character",
		Description: "Creates a new D&D 5e character and adds it to the party. Returns the full character sheet.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"name": map[string]interface{}{
					"type":        "string",
					"description": "Character name",
				},
				"race": map[string]interface{}{
					"type":        "string",
					"description": "Character race (human, elf, dwarf, halfling, dragonborn, gnome, half-elf, half-orc, tiefling)",
				},
				"class": map[string]interface{}{
					"type":        "string",
					"description": "Character class (fighter, wizard, rogue, cleric, bard, druid, monk, paladin, ranger, sorcerer, warlock)",
				},
				"background": map[string]interface{}{
					"type":        "string",
					"description": "Character background (sage, soldier, criminal, commoner, urchin, folk_hero, noble, outlander, entertainer, acolyte)",
				},
				"ability_scores": map[string]interface{}{
					"type": "object",
					"properties": map[string]interface{}{
						"str": map[string]interface{}{"type": "integer", "description": "Strength score (1-20)"},
						"dex": map[string]interface{}{"type": "integer", "description": "Dexterity score (1-20)"},
						"con": map[string]interface{}{"type": "integer", "description": "Constitution score (1-20)"},
						"int": map[string]interface{}{"type": "integer", "description": "Intelligence score (1-20)"},
						"wis": map[string]interface{}{"type": "integer", "description": "Wisdom score (1-20)"},
						"cha": map[string]interface{}{"type": "integer", "description": "Charisma score (1-20)"},
					},
					"description": "Ability scores before racial bonuses",
				},
				"skill_choices": map[string]interface{}{
					"type":        "array",
					"items":       map[string]interface{}{"type": "string"},
					"description": "Optional: class skills to gain proficiency in",
				},
				"extra_ability_bonuses": map[string]interface{}{
					"type":        "array",
					"items":       map[string]interface{}{"type": "string"},
					"description": "Optional: extra ability score bonuses from racial features (e.g., half-elf: [\"str\", \"cha\"]). Each grants +1.",
				},
			},
			"required": []string{"session_id", "name", "race", "class", "background", "ability_scores"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			name, _ := args["name"].(string)
			race, _ := args["race"].(string)
			class, _ := args["class"].(string)
			background, _ := args["background"].(string)
			abilityScoresRaw, ok := args["ability_scores"].(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("ability_scores must be an object")
			}
			abilityScores := make(map[string]int)
			for k, v := range abilityScoresRaw {
				val := toInt(v, 0)
				if val < 1 || val > 20 {
					return nil, fmt.Errorf("ability score %q must be between 1 and 20, got %d", k, val)
				}
				abilityScores[k] = val
			}
			params := character.CreateParams{
				Name:          name,
				Race:          race,
				Class:         class,
				Background:    background,
				AbilityScores: abilityScores,
			}
			// Handle optional skill choices
			if skillChoicesRaw, ok := args["skill_choices"].([]interface{}); ok {
				for _, sc := range skillChoicesRaw {
					if s, ok := sc.(string); ok {
						if sk, valid := skillFromString(s); valid {
							params.SkillChoices = append(params.SkillChoices, sk)
						}
					}
				}
			}
			// Handle optional extra ability bonuses (e.g., half-elf)
			if extraBonusesRaw, ok := args["extra_ability_bonuses"].([]interface{}); ok {
				for _, eb := range extraBonusesRaw {
					if s, ok := eb.(string); ok {
						if ab, valid := abilityFromString(s); valid {
							params.ExtraAbilityBonuses = append(params.ExtraAbilityBonuses, ab)
						}
					}
				}
			}
			// Validate extra ability bonuses count
			if len(params.ExtraAbilityBonuses) > 2 {
				return nil, fmt.Errorf("extra_ability_bonuses allows at most 2 abilities, got %d", len(params.ExtraAbilityBonuses))
			}
			// Verify session exists before creating character
			if stateProvider.GetGameState(sessionID) == nil {
				return nil, fmt.Errorf("session not found: %s", sessionID)
			}
			char, err := character.CreateBasic(params)
			if err != nil {
				return nil, fmt.Errorf("character creation failed: %w", err)
			}
			// Atomically validate session, check duplicate name, and add character under write lock.
			var (
				addedChar   *models.Character
				partySize   int
				dupNameErr  error
			)
			err = stateProvider.UpdateGameState(sessionID, func(gs *state.GameState) {
				for _, existing := range gs.Party {
					if existing.Name == name {
						dupNameErr = fmt.Errorf("a character named %q already exists in this session (ID: %s)", name, existing.ID)
						return
					}
				}
				gs.Party = append(gs.Party, char)
				addedChar = char
				partySize = len(gs.Party)
			})
			if err != nil {
				// UpdateGameState returns ErrSessionNotFound when session doesn't exist
				if strings.Contains(err.Error(), "not found") {
					return nil, fmt.Errorf("session not found: %s", sessionID)
				}
				return nil, fmt.Errorf("failed to add character to session: %w", err)
			}
			if dupNameErr != nil {
				return nil, dupNameErr
			}
			return map[string]interface{}{
				"success":    true,
				"character":  addedChar,
				"party_size": partySize,
			}, nil
		},
	})
	registry.Register(Tool{
		Name:        "get_character",
		Description: "Retrieves a character's details by ID. Returns the full character sheet.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character's unique ID",
				},
			},
			"required": []string{"session_id", "character_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			characterID, _ := args["character_id"].(string)
			if sessionID == "" || characterID == "" {
				return nil, fmt.Errorf("session_id and character_id are required")
			}
			var foundChar *models.Character
			err := stateProvider.UpdateGameState(sessionID, func(gs *state.GameState) {
				for _, char := range gs.Party {
					if char.ID == characterID {
						foundChar = char
						return
					}
				}
			})
			if err != nil {
				if strings.Contains(err.Error(), "not found") {
					return nil, fmt.Errorf("session not found: %s", sessionID)
				}
				return nil, fmt.Errorf("failed to get character: %w", err)
			}
			if foundChar == nil {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			return map[string]interface{}{
				"success":   true,
				"character": foundChar,
			}, nil
		},
	})
	registry.Register(Tool{
		Name:        "update_character",
		Description: "Updates a character's mutable properties (HP, AC, conditions, gold). Does NOT change race, class, or ability scores.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character's unique ID",
				},
				"hp": map[string]interface{}{
					"type":        "integer",
					"description": "Set current HP to this value",
				},
				"max_hp": map[string]interface{}{
					"type":        "integer",
					"description": "Set max HP to this value",
				},
				"ac": map[string]interface{}{
					"type":        "integer",
					"description": "Set armor class to this value",
				},
				"gold": map[string]interface{}{
					"type":        "integer",
					"description": "Set gold to this value",
				},
				"conditions_add": map[string]interface{}{
					"type":        "array",
					"items":       map[string]interface{}{"type": "string"},
					"description": "Conditions to add",
				},
				"conditions_remove": map[string]interface{}{
					"type":        "array",
					"items":       map[string]interface{}{"type": "string"},
					"description": "Conditions to remove",
				},
			},
			"required": []string{"session_id", "character_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			characterID, _ := args["character_id"].(string)
			if sessionID == "" || characterID == "" {
				return nil, fmt.Errorf("session_id and character_id are required")
			}
			var (
				updatedChar *models.Character
				opErr       error
			)
			err := stateProvider.UpdateGameState(sessionID, func(gs *state.GameState) {
				for _, char := range gs.Party {
					if char.ID == characterID {
						// Apply numeric updates
						if v, ok := args["hp"]; ok {
							char.HP = toInt(v, char.HP)
						}
						if v, ok := args["max_hp"]; ok {
							char.MaxHP = toInt(v, char.MaxHP)
						}
						if v, ok := args["ac"]; ok {
							char.AC = toInt(v, char.AC)
						}
						if v, ok := args["gold"]; ok {
							char.Gold = toInt(v, char.Gold)
						}
						// Validate numeric constraints
						if char.MaxHP < 1 {
							opErr = fmt.Errorf("max_hp must be >= 1, got %d", char.MaxHP)
							return
						}
						if char.HP < 0 {
							opErr = fmt.Errorf("hp must be >= 0, got %d", char.HP)
							return
						}
						if char.HP > char.MaxHP {
							opErr = fmt.Errorf("hp (%d) cannot exceed max_hp (%d)", char.HP, char.MaxHP)
							return
						}
						if char.AC < 0 {
							opErr = fmt.Errorf("ac must be >= 0, got %d", char.AC)
							return
						}
						if char.Gold < 0 {
							opErr = fmt.Errorf("gold must be >= 0, got %d", char.Gold)
							return
						}
						// Add conditions
						if conditionsAdd, ok := args["conditions_add"].([]interface{}); ok {
							for _, c := range conditionsAdd {
								if s, ok := c.(string); ok {
									if cond, valid := conditionFromString(s); valid {
										// Check for duplicate before adding
										exists := false
										for _, existing := range char.Conditions {
											if existing == cond {
												exists = true
												break
											}
										}
										if !exists {
											char.Conditions = append(char.Conditions, cond)
										}
									}
								}
							}
						}
						// Remove conditions (conditionFromString lowercases input; stored values are also lowercase)
						if conditionsRemove, ok := args["conditions_remove"].([]interface{}); ok {
							removeSet := make(map[string]bool)
							for _, c := range conditionsRemove {
								if s, ok := c.(string); ok {
									removeSet[strings.ToLower(s)] = true
								}
							}
							filtered := make([]types.Condition, 0, len(char.Conditions))
							for _, c := range char.Conditions {
								if !removeSet[string(c)] {
									filtered = append(filtered, c)
								}
							}
							char.Conditions = filtered
						}
						updatedChar = char
						return
					}
				}
			})
			if err != nil {
				return nil, fmt.Errorf("failed to update character: %w", err)
			}
			if opErr != nil {
				return nil, opErr
			}
			if updatedChar == nil {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			return map[string]interface{}{
				"success":   true,
				"character": updatedChar,
			}, nil
		},
	})
	registry.Register(Tool{
		Name:        "add_to_inventory",
		Description: "Adds an item to a character's inventory.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character's unique ID",
				},
				"item_name": map[string]interface{}{
					"type":        "string",
					"description": "Name of the item to add",
				},
				"item_type": map[string]interface{}{
					"type":        "string",
					"description": "Type of item (weapon, armor, potion, tool, gear, treasure)",
				},
				"description": map[string]interface{}{
					"type":        "string",
					"description": "Description of the item",
				},
			},
			"required": []string{"session_id", "character_id", "item_name"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			characterID, _ := args["character_id"].(string)
			itemName, _ := args["item_name"].(string)
			itemType, _ := args["item_type"].(string)
			description, _ := args["description"].(string)
			if sessionID == "" || characterID == "" || itemName == "" {
				return nil, fmt.Errorf("session_id, character_id, and item_name are required")
			}
			validItemTypes := map[string]bool{
				"weapon": true, "armor": true, "potion": true,
				"tool": true, "gear": true, "treasure": true,
			}
			if itemType != "" {
				if !validItemTypes[itemType] {
					return nil, fmt.Errorf("invalid item_type %q (valid: weapon, armor, potion, tool, gear, treasure)", itemType)
				}
			} else {
				itemType = "gear"
			}
			var updatedChar *models.Character
			err := stateProvider.UpdateGameState(sessionID, func(gs *state.GameState) {
				for _, char := range gs.Party {
					if char.ID == characterID {
						item := models.Item{
							ID:          uuid.New().String()[:12],
							Name:        itemName,
							Description: description,
							Type:        itemType,
						}
						char.Inventory = append(char.Inventory, item)
						updatedChar = char
						return
					}
				}
			})
			if err != nil {
				return nil, fmt.Errorf("failed to add item: %w", err)
			}
			if updatedChar == nil {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			return map[string]interface{}{
				"success":         true,
				"item_added":      itemName,
				"inventory_count": len(updatedChar.Inventory),
			}, nil
		},
	})
	registry.Register(Tool{
		Name:        "level_up",
		Description: "Levels up a character, increasing HP and proficiency bonus. Uses average hit die roll + CON modifier for HP gain.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character's unique ID",
				},
			},
			"required": []string{"session_id", "character_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			characterID, _ := args["character_id"].(string)
			if sessionID == "" || characterID == "" {
				return nil, fmt.Errorf("session_id and character_id are required")
			}
			var updatedChar *models.Character
			var opErr error // capture callback-level errors (UpdateGameState fn returns no error)
			err := stateProvider.UpdateGameState(sessionID, func(gs *state.GameState) {
				for _, char := range gs.Party {
					if char.ID == characterID {
						// Get class config for hit die
						classConfig, ok := character.GetClassConfig(char.Class)
						if !ok {
							opErr = fmt.Errorf("class config not found for class %q", char.Class)
							return
						}
						newLevel := char.Level + 1
						if newLevel > 20 {
							opErr = fmt.Errorf("character is already at maximum level (20)")
							return
						}
						// HP gain: HitDice/2 + 1 + CON modifier.
						// Integer division truncates so this equals ceil(HitDice/2) per SRD 5.1:
						//   d6→4, d8→5, d10→6, d12→7
						// Per SRD 5.1: a character always gains at least 1 HP on level up, even with negative CON mod.
						conMod := char.Stats.GetModifier(types.Constitution)
						hpGain := classConfig.HitDice/2 + 1 + conMod
						if hpGain < 1 {
							hpGain = 1 // SRD minimum HP gain
						}
						char.Level = newLevel
						char.MaxHP += hpGain
						char.HP += hpGain
						// Update proficiency bonus
						char.ProficiencyBonus = character.ProficiencyBonusForLevel(newLevel)
						updatedChar = char
						return
					}
				}
			})
			if err != nil {
				return nil, fmt.Errorf("failed to level up: %w", err)
			}
			if opErr != nil {
				return nil, opErr
			}
			if updatedChar == nil {
				return nil, fmt.Errorf("character not found: %s", characterID)
			}
			return map[string]interface{}{
				"success":           true,
				"character":         updatedChar,
				"new_level":         updatedChar.Level,
				"proficiency_bonus": updatedChar.ProficiencyBonus,
			}, nil
		},
	})
}

// skillFromString converts a string to a skill type with validation.
// Returns the skill and true if valid, or empty skill and false if invalid.
func skillFromString(s string) (types.Skill, bool) {
	skill := types.Skill(strings.ToLower(s))
	if _, ok := types.SkillAbility[skill]; !ok {
		log.Warn().Str("skill", s).Msg("skillFromString: unknown skill, skipping")
		return types.Skill(""), false
	}
	return skill, true
}

// abilityFromString converts a string to an Ability type with validation.
// Returns the ability and true if valid, or empty ability and false if invalid.
func abilityFromString(s string) (types.Ability, bool) {
	lower := strings.ToLower(s)
	switch lower {
	case "str", "strength":
		return types.Strength, true
	case "dex", "dexterity":
		return types.Dexterity, true
	case "con", "constitution":
		return types.Constitution, true
	case "int", "intelligence":
		return types.Intelligence, true
	case "wis", "wisdom":
		return types.Wisdom, true
	case "cha", "charisma":
		return types.Charisma, true
	default:
		log.Warn().Str("ability", s).Msg("abilityFromString: unknown ability, skipping")
		return types.Ability(""), false
	}
}

// conditionFromString converts a string to a condition type with validation.
// Returns the condition and true if valid, or empty condition and false if invalid.
func conditionFromString(s string) (types.Condition, bool) {
	cond := types.Condition(strings.ToLower(s))
	if !cond.Valid() {
		log.Warn().Str("condition", s).Msg("conditionFromString: unknown condition, skipping")
		return types.Condition(""), false
	}
	return cond, true
}
