// Package tools provides MCP tool registration for item operations.
package tools

import (
	"fmt"
)

// RegisterItemTools registers all item-related MCP tools.
// Handlers return placeholder responses until business logic is implemented in Phase 2.
func RegisterItemTools(registry *Registry) {
	registerEquipItem(registry)
	registerUnequipItem(registry)
	registerUseItem(registry)
	registerGetItemInfo(registry)
}

// registerEquipItem registers the equip_item tool.
func registerEquipItem(registry *Registry) {
	registry.Register(Tool{
		Name:        "equip_item",
		Description: "Equips an item from a character's inventory to an equipment slot. Validates slot compatibility and removes the item from inventory.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character equipping the item",
				},
				"item_id": map[string]interface{}{
					"type":        "string",
					"description": "The inventory item ID to equip",
				},
				"slot": map[string]interface{}{
					"type":        "string",
					"description": "The equipment slot (main_hand, off_hand, head, chest, hands, feet, cloak, neck, ring1, ring2, belt)",
				},
			},
			"required": []string{"session_id", "character_id", "item_id", "slot"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			itemID, _ := args["item_id"].(string)
			slot, _ := args["slot"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "equip item not yet implemented",
				"character_id": characterID,
				"item_id":      itemID,
				"slot":         slot,
			}, nil
		},
	})
}

// registerUnequipItem registers the unequip_item tool.
func registerUnequipItem(registry *Registry) {
	registry.Register(Tool{
		Name:        "unequip_item",
		Description: "Unequips an item from a character's equipment slot, returning it to inventory.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character unequipping the item",
				},
				"slot": map[string]interface{}{
					"type":        "string",
					"description": "The equipment slot to unequip from",
				},
			},
			"required": []string{"session_id", "character_id", "slot"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			slot, _ := args["slot"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "unequip item not yet implemented",
				"character_id": characterID,
				"slot":         slot,
			}, nil
		},
	})
}

// registerUseItem registers the use_item tool.
func registerUseItem(registry *Registry) {
	registry.Register(Tool{
		Name:        "use_item",
		Description: "Uses a consumable item (potion, scroll, food) from inventory. Applies the item's effect and consumes a use.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character using the item",
				},
				"item_id": map[string]interface{}{
					"type":        "string",
					"description": "The item ID to use",
				},
				"target_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional: target character ID (for healing potions used on others)",
				},
			},
			"required": []string{"session_id", "character_id", "item_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			itemID, _ := args["item_id"].(string)
			targetID, _ := args["target_id"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "use item not yet implemented",
				"character_id": characterID,
				"item_id":      itemID,
				"target_id":    targetID,
			}, nil
		},
	})
}

// registerGetItemInfo registers the get_item_info tool.
func registerGetItemInfo(registry *Registry) {
	registry.Register(Tool{
		Name:        "get_item_info",
		Description: "Retrieves detailed information about an item, including its type, properties, and effects.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"item_id": map[string]interface{}{
					"type":        "string",
					"description": "The item ID to look up",
				},
			},
			"required": []string{"item_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			itemID, _ := args["item_id"].(string)
			if itemID == "" {
				return nil, fmt.Errorf("item_id is required")
			}

			// Placeholder
			return map[string]interface{}{
				"success": false,
				"message": "item info lookup not yet implemented",
				"item_id": itemID,
			}, nil
		},
	})
}
