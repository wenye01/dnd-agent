// Package websocket implements WebSocket connections for the D&D game server.
package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/dnd-game/server/internal/client/llm"
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

// processLLMResponse handles the streaming LLM response with agentic loop.
// When the LLM returns a tool call, the tool is executed, the result is added
// to the conversation, and the LLM is called again to continue narrating.
func (h *Hub) processLLMResponse(client *Client, text, requestID string) {
	ctx := getContext()
	tools := h.toolRegistry.AsToolDefinitions()

	// Save user message
	h.saveMessage(client.SessionID, "user_input", text)

	// Initial LLM call
	stream, err := h.sessionMgr.SendMessage(ctx, client.SessionID, text, tools)
	if err != nil {
		h.SendError(client, fmt.Sprintf("LLM error: %v", err))
		return
	}

	h.processStreamWithToolLoop(ctx, client, stream, tools, requestID)
}

// processStreamWithToolLoop processes a stream, executing tool calls and
// continuing the conversation with the LLM until it produces a final text
// response without any tool calls (agentic loop).
const maxToolLoopIterations = 5

func (h *Hub) processStreamWithToolLoop(ctx context.Context, client *Client, stream <-chan llm.StreamChunk, tools []llm.ToolDefinition, requestID string) {
	var fullText strings.Builder
	var toolCalls []llm.ToolCall

	for chunk := range stream {
		if chunk.Error != nil {
			h.SendError(client, chunk.Error.Error())
			return
		}

		if chunk.Done {
			break
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
			// Accumulate tool call (providers now emit one ToolCall with fully
			// accumulated arguments at finish/DONE, so append is sufficient)
			toolCalls = append(toolCalls, *chunk.ToolCall)
		}
	}

	// If there are tool calls, execute them and continue the agentic loop
	if len(toolCalls) > 0 {
		for i := 0; i < len(toolCalls) && i < maxToolLoopIterations; i++ {
			tc := &toolCalls[i]
			h.executeAndSendToolResult(client, tc, requestID)
		}

		// Continue the agentic loop: call LLM again with tool results
		continueStream, err := h.sessionMgr.ContinueMessage(ctx, client.SessionID, tools)
		if err != nil {
			h.SendError(client, fmt.Sprintf("LLM continue error: %v", err))
			return
		}
		h.processStreamWithToolLoop(ctx, client, continueStream, tools, requestID)
		return
	}

	// No tool calls -- send final narration message and record in session
	narrationText := fullText.String()
	client.SendMessage(&models.ServerMessage{
		Type: models.MsgTypeNarration,
		Payload: map[string]interface{}{
			"text":        narrationText,
			"isStreaming": false,
		},
		RequestID: requestID,
		Timestamp: getCurrentTimestamp(),
	})

	h.sessionMgr.AddAssistantMessage(client.SessionID, narrationText)
	h.saveMessage(client.SessionID, "narration", narrationText)
}

// executeAndSendToolResult executes a tool call, records the assistant's tool
// call message and the tool result in the session, and sends the result to the
// client.
func (h *Hub) executeAndSendToolResult(client *Client, tc *llm.ToolCall, requestID string) {
	h.logger.Info().
		Str("session_id", client.SessionID).
		Str("tool", tc.Name).
		Msg("executing tool")

	// Record the assistant's tool call in the session history so the LLM API
	// receives a valid message sequence: assistant(tool_calls) -> tool(result)
	h.sessionMgr.AddAssistantToolCalls(client.SessionID, "", []llm.ToolCall{*tc})

	result, err := h.toolRegistry.Execute(tc.Name, tc.Arguments)
	if err != nil {
		h.logger.Error().Err(err).Str("tool", tc.Name).Msg("tool execution failed")
		h.sessionMgr.AddToolResult(client.SessionID, tc.ID, fmt.Sprintf("Error: %v", err))
		return
	}

	// Convert result to JSON and add to session
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
