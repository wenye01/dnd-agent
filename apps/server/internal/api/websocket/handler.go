// Package websocket implements WebSocket connections for the D&D game server.
package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dnd-game/server/internal/shared/models"
)

// HandleMessage processes an incoming message from a client.
func (h *Hub) HandleMessage(client *Client, data []byte) {
	var msg models.ClientMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		h.SendError(client, "invalid message format")
		return
	}

	switch msg.Type {
	case models.MsgTypeUserInput:
		h.handleUserInput(client, msg)

	case models.MsgTypeManagement:
		h.handleManagement(client, msg)

	case models.MsgTypePing:
		client.SendMessage(&models.ServerMessage{
			Type:      models.MsgTypePong,
			Timestamp: getCurrentTimestamp(),
		})

	case models.MsgTypeMapAction:
		h.handleMapAction(client, msg)

	case models.MsgTypeCombatAction:
		h.handleCombatAction(client, msg)

	default:
		h.SendError(client, fmt.Sprintf("unknown message type: %s", msg.Type))
	}
}

// handleUserInput processes user text input and sends it to the LLM.
func (h *Hub) handleUserInput(client *Client, msg models.ClientMessage) {
	var payload struct {
		Text string `json:"text"`
	}
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		h.SendError(client, "invalid user_input payload")
		return
	}

	h.logger.Info().
		Str("session_id", client.SessionID).
		Str("text", payload.Text).
		Msg("user input")

	// Send to LLM session
	go h.processLLMResponse(client, payload.Text, msg.RequestID)
}

// processLLMResponse handles the streaming LLM response.
func (h *Hub) processLLMResponse(client *Client, text, requestID string) {
	ctx := getContext()
	tools := h.toolRegistry.AsToolDefinitions()

	stream, err := h.sessionMgr.SendMessage(ctx, client.SessionID, text, tools)
	if err != nil {
		h.SendError(client, fmt.Sprintf("LLM error: %v", err))
		return
	}

	var fullText strings.Builder
	var currentToolCall *toolCallAccumulator

	for chunk := range stream {
		if chunk.Error != nil {
			h.SendError(client, chunk.Error.Error())
			return
		}

		if chunk.Done {
			// Send final message
			client.SendMessage(&models.ServerMessage{
				Type: models.MsgTypeNarration,
				Payload: map[string]interface{}{
					"text":        fullText.String(),
					"isStreaming": false,
				},
				RequestID: requestID,
				Timestamp: getCurrentTimestamp(),
			})

			// Save to persistence
			h.saveMessage(client.SessionID, "user_input", text)
			h.saveMessage(client.SessionID, "narration", fullText.String())
			return
		}

		if chunk.Delta != "" {
			fullText.WriteString(chunk.Delta)
			client.SendMessage(&models.ServerMessage{
				Type: models.MsgTypeNarration,
				Payload: map[string]interface{}{
					"text":        chunk.Delta,
					"isStreaming": true,
				},
				RequestID: requestID,
				Timestamp: getCurrentTimestamp(),
			})
		}

		if chunk.ToolCall != nil {
			if currentToolCall == nil {
				currentToolCall = &toolCallAccumulator{}
			}

			if chunk.ToolCall.ID != "" {
				currentToolCall.ID = chunk.ToolCall.ID
			}
			if chunk.ToolCall.Name != "" {
				currentToolCall.Name = chunk.ToolCall.Name
			}
			if chunk.ToolCall.Arguments != nil {
				if currentToolCall.Arguments == nil {
					currentToolCall.Arguments = make(map[string]interface{})
				}
				for k, v := range chunk.ToolCall.Arguments {
					currentToolCall.Arguments[k] = v
				}
			}

			// When we have a complete tool call, execute it
			if currentToolCall.ID != "" && currentToolCall.Name != "" && currentToolCall.Arguments != nil {
				h.executeToolCall(client, currentToolCall, requestID)
				currentToolCall = nil
			}
		}
	}
}

// toolCallAccumulator accumulates tool call data from streaming chunks.
type toolCallAccumulator struct {
	ID        string
	Name      string
	Arguments map[string]interface{}
}

// executeToolCall executes a tool call and sends the result.
func (h *Hub) executeToolCall(client *Client, tc *toolCallAccumulator, requestID string) {
	h.logger.Info().
		Str("session_id", client.SessionID).
		Str("tool", tc.Name).
		Msg("executing tool")

	result, err := h.toolRegistry.Execute(tc.Name, tc.Arguments)
	if err != nil {
		h.logger.Error().Err(err).Str("tool", tc.Name).Msg("tool execution failed")
		// Send error result back to LLM
		h.sessionMgr.AddToolResult(client.SessionID, tc.ID, fmt.Sprintf("Error: %v", err))
		return
	}

	// Convert result to JSON for response
	resultJSON, _ := json.Marshal(result)
	h.sessionMgr.AddToolResult(client.SessionID, tc.ID, string(resultJSON))

	// Send specific message types based on tool
	switch tc.Name {
	case "roll_dice", "ability_check":
		client.SendMessage(&models.ServerMessage{
			Type:      models.MsgTypeDiceResult,
			Payload:   result,
			RequestID: requestID,
			Timestamp: getCurrentTimestamp(),
		})
	}

	h.logger.Info().
		Str("session_id", client.SessionID).
		Str("tool", tc.Name).
		Interface("result", result).
		Msg("tool executed")
}

// handleManagement processes management messages (session controls).
func (h *Hub) handleManagement(client *Client, msg models.ClientMessage) {
	var payload struct {
		Action string `json:"action"`
	}
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		h.SendError(client, "invalid management payload")
		return
	}

	switch payload.Action {
	case "clear_history":
		h.sessionMgr.ClearMessages(client.SessionID)
		client.SendMessage(&models.ServerMessage{
			Type: models.MsgTypeStateUpdate,
			Payload: map[string]interface{}{
				"stateType": "notification",
				"data": map[string]string{
					"status": "history_cleared",
				},
			},
			Timestamp: getCurrentTimestamp(),
		})

	default:
		h.SendError(client, fmt.Sprintf("unknown management action: %s", payload.Action))
	}
}

// handleMapAction processes map-related actions.
func (h *Hub) handleMapAction(client *Client, msg models.ClientMessage) {
	var payload struct {
		Action string `json:"action"`
		X      int    `json:"x"`
		Y      int    `json:"y"`
	}
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		h.SendError(client, "invalid map_action payload")
		return
	}

	// Update game state with map action
	h.stateManager.UpdateSessionInterface(client.SessionID, func(gs interface{}) {
		// Apply map action to state - placeholder for now
	})

	client.SendMessage(&models.ServerMessage{
		Type: models.MsgTypeStateUpdate,
		Payload: map[string]interface{}{
			"stateType": "map",
			"data": map[string]string{
				"action": payload.Action,
			},
		},
		Timestamp: getCurrentTimestamp(),
	})
}

// handleCombatAction processes combat-related actions.
func (h *Hub) handleCombatAction(client *Client, msg models.ClientMessage) {
	var payload struct {
		Action string `json:"action"`
		Target string `json:"target"`
	}
	if err := json.Unmarshal(msg.Payload, &payload); err != nil {
		h.SendError(client, "invalid combat_action payload")
		return
	}

	// Handle combat actions
	client.SendMessage(&models.ServerMessage{
		Type: models.MsgTypeCombatEvent,
		Payload: map[string]interface{}{
			"eventType": payload.Action,
			"target":    payload.Target,
		},
		Timestamp: getCurrentTimestamp(),
	})
}

// saveMessage saves a message to persistence.
func (h *Hub) saveMessage(sessionID, msgType, content string) {
	// Persistence save
	// This would call the persistence manager
}

// getContext returns a background context for LLM calls.
func getContext() context.Context {
	return context.Background()
}

// getCurrentTimestamp returns the current Unix timestamp.
func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}
