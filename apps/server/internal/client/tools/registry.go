// Package tools provides MCP (Model Context Protocol) tool registration and execution.
package tools

import (
	"encoding/json"
	"fmt"
	"sync"

	"github.com/dnd-game/server/internal/client/llm"
	"github.com/dnd-game/server/internal/server/dice"
)

// Registry manages available tools for LLM function calling.
type Registry struct {
	mu    sync.RWMutex
	tools map[string]Tool
}

// Tool represents a callable function.
type Tool struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	InputSchema map[string]interface{} `json:"inputSchema"`
	Handler     Handler                `json:"-"`
}

// Handler is the function that executes the tool.
type Handler func(args map[string]interface{}) (interface{}, error)

// NewRegistry creates a new tool registry.
func NewRegistry() *Registry {
	return &Registry{
		tools: make(map[string]Tool),
	}
}

// Register adds a tool to the registry.
func (r *Registry) Register(tool Tool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tools[tool.Name] = tool
}

// Get retrieves a tool by name.
func (r *Registry) Get(name string) (Tool, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	tool, ok := r.tools[name]
	return tool, ok
}

// List returns all registered tools.
func (r *Registry) List() []Tool {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		result = append(result, tool)
	}
	return result
}

// Execute runs a tool with the given arguments.
func (r *Registry) Execute(name string, args map[string]interface{}) (interface{}, error) {
	tool, ok := r.Get(name)
	if !ok {
		return nil, fmt.Errorf("tool not found: %s", name)
	}

	return tool.Handler(args)
}

// AsToolDefinitions converts registered tools to LLM tool definitions.
func (r *Registry) AsToolDefinitions() []llm.ToolDefinition {
	tools := r.List()
	result := make([]llm.ToolDefinition, len(tools))

	for i, tool := range tools {
		result[i] = llm.ToolDefinition{
			Type: "function",
			Function: llm.FunctionDefinition{
				Name:        tool.Name,
				Description: tool.Description,
				Parameters:  tool.InputSchema,
			},
		}
	}

	return result
}

// RegisterDiceTools registers dice-related tools.
func RegisterDiceTools(registry *Registry, diceService *dice.Service) {
	registry.Register(Tool{
		Name:        "roll_dice",
		Description: "Rolls dice using standard D&D notation. Examples: d20, 2d6+3, 4d6k3 (roll 4d6 keep highest 3)",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"formula": map[string]interface{}{
					"type":        "string",
					"description": "Dice formula like 'd20', '2d6+3', '4d6k3'",
				},
			},
			"required": []string{"formula"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			formula, ok := args["formula"].(string)
			if !ok {
				return nil, fmt.Errorf("formula must be a string")
			}

			result, err := diceService.Roll(formula)
			if err != nil {
				return nil, err
			}

			return dice.ToRollResult(result, formula), nil
		},
	})

	registry.Register(Tool{
		Name:        "ability_check",
		Description: "Performs an ability check in D&D 5e. Returns whether the check succeeded against the DC.",
		InputSchema: map[string]interface{}{
			"type": "object",
			"properties": map[string]interface{}{
				"modifier": map[string]interface{}{
					"type":        "integer",
					"description": "Ability modifier to apply",
				},
				"dc": map[string]interface{}{
					"type":        "integer",
					"description": "Difficulty class of the check",
				},
				"advantage": map[string]interface{}{
					"type":        "boolean",
					"description": "Whether the roll has advantage",
				},
				"disadvantage": map[string]interface{}{
					"type":        "boolean",
					"description": "Whether the roll has disadvantage",
				},
			},
			"required": []string{"modifier", "dc"},
		},
		Handler: func(args map[string]interface{}) (interface{}, error) {
			modifier := intArg(args, "modifier", 0)
			dc := intArg(args, "dc", 10)
			advantage := boolArg(args, "advantage", false)
			disadvantage := boolArg(args, "disadvantage", false)

			result := diceService.AbilityCheck(modifier, dc, advantage, disadvantage)
			return result, nil
		},
	})
}

// toInt converts an interface{} to int with a default fallback.
// Handles float64, int, float32, and json.Number types commonly
// produced by JSON deserialization.
func toInt(v interface{}, defaultVal int) int {
	switch val := v.(type) {
	case float64:
		return int(val)
	case int:
		return val
	case float32:
		return int(val)
	case json.Number:
		if i, err := val.Int64(); err == nil {
			return int(i)
		}
	}
	return defaultVal
}

// intArg extracts an integer argument from the args map using toInt.
func intArg(args map[string]interface{}, key string, defaultValue int) int {
	if val, ok := args[key]; ok {
		return toInt(val, defaultValue)
	}
	return defaultValue
}

// boolArg extracts a boolean argument from the args map.
func boolArg(args map[string]interface{}, key string, defaultValue bool) bool {
	if val, ok := args[key].(bool); ok {
		return val
	}
	return defaultValue
}
