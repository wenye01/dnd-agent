// Package tools provides MCP tool registration for map operations.
package tools

import (
	"fmt"
)

// RegisterMapTools registers all map-related MCP tools.
// Handlers return placeholder responses until business logic is implemented in Phase 2.
func RegisterMapTools(registry *Registry) {
	registerInteract(registry)
	registerMoveTo(registry)
	registerGetMapInfo(registry)
}

// registerInteract registers the interact tool.
func registerInteract(registry *Registry) {
	registry.Register(Tool{
		Name:        "interact",
		Description: "Interacts with an object or point of interest on the map. Can open doors, search containers, examine objects, etc.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character performing the interaction",
				},
				"target_id": map[string]interface{}{
					"type":        "string",
					"description": "The ID of the map object or interactable to interact with",
				},
				"action": map[string]interface{}{
					"type":        "string",
					"description": "The type of interaction (open, close, search, examine, use)",
				},
			},
			"required": []string{"session_id", "character_id", "target_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			targetID, _ := args["target_id"].(string)
			action, _ := args["action"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "map interaction not yet implemented",
				"character_id": characterID,
				"target_id":    targetID,
				"action":       action,
			}, nil
		},
	})
}

// registerMoveTo registers the move_to tool.
func registerMoveTo(registry *Registry) {
	registry.Register(Tool{
		Name:        "move_to",
		Description: "Moves a character to a specified position on the current map. Validates the path and checks for obstacles, difficult terrain, and opportunity attacks.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"character_id": map[string]interface{}{
					"type":        "string",
					"description": "The character to move",
				},
				"x": map[string]interface{}{
					"type":        "integer",
					"description": "Target X coordinate on the map grid",
				},
				"y": map[string]interface{}{
					"type":        "integer",
					"description": "Target Y coordinate on the map grid",
				},
			},
			"required": []string{"session_id", "character_id", "x", "y"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			characterID, _ := args["character_id"].(string)
			x := intArg(args, "x", 0)
			y := intArg(args, "y", 0)

			// Placeholder
			return map[string]interface{}{
				"success":      false,
				"message":      "movement not yet implemented",
				"character_id": characterID,
				"x":            x,
				"y":            y,
			}, nil
		},
	})
}

// registerGetMapInfo registers the get_map_info tool.
func registerGetMapInfo(registry *Registry) {
	registry.Register(Tool{
		Name:        "get_map_info",
		Description: "Retrieves information about the current map, including dimensions, notable objects, entrances, and exits.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"session_id": map[string]interface{}{
					"type":        "string",
					"description": "The game session ID",
				},
				"map_id": map[string]interface{}{
					"type":        "string",
					"description": "Optional: specific map ID. If omitted, returns current map info.",
				},
			},
			"required": []string{"session_id"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			sessionID, _ := args["session_id"].(string)
			if sessionID == "" {
				return nil, fmt.Errorf("session_id is required")
			}
			mapID, _ := args["map_id"].(string)

			// Placeholder
			return map[string]interface{}{
				"success":    false,
				"message":    "map info not yet implemented",
				"session_id": sessionID,
				"map_id":     mapID,
			}, nil
		},
	})
}
