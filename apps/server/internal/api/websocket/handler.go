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
	"github.com/dnd-game/server/internal/shared/state"
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
	var insideThinkBlock bool

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

			// Strip <think/> reasoning blocks that some LLM providers
			// embed inside the content field. We track open/close tags
			// across streaming chunks and only forward non-reasoning text.
			filtered := filterThinkTags(chunk.Delta, &insideThinkBlock)
			if filtered != "" {
				client.SendMessage(&models.ServerMessage{
					Type: models.MsgTypeNarration,
					Payload: map[string]interface{}{
						"text":        filtered,
						"isStreaming": true,
					},
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
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

	// No tool calls -- send final narration message and record in session.
	// Strip any remaining think tags from the accumulated text.
	narrationText := stripThinkTags(fullText.String())
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

	case "save":
		// Update session metadata timestamp to reflect save time
		h.stateManager.UpdateSession(client.SessionID, func(gs *state.GameState) {
			now := getCurrentTimestamp()
			gs.Metadata.UpdatedAt = now
			gs.Metadata.LastActivity = now
		})
		client.SendMessage(&models.ServerMessage{
			Type: models.MsgTypeStateUpdate,
			Payload: map[string]interface{}{
				"stateType": "notification",
				"data": map[string]string{
					"status": "game_saved",
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

// filterThinkTags filters <think/> reasoning blocks from streaming text.
// It tracks whether we're inside a think block across chunks and only
// returns text that is NOT inside <think/> tags.
func filterThinkTags(delta string, insideThink *bool) string {
	var result strings.Builder
	i := 0
	for i < len(delta) {
		if *insideThink {
			// Look for closing </think or <\/think>
			closeIdx := strings.Index(delta[i:], "</think")
			if closeIdx == -1 {
				// Still inside think block, skip all
				return result.String()
			}
			// Skip past the closing tag
			end := i + closeIdx + len("</think")
			if end > len(delta) {
				end = len(delta)
			}
			i = end
			*insideThink = false
			continue
		}

		// Look for opening <think
		openIdx := strings.Index(delta[i:], "<think")
		if openIdx == -1 {
			// No opening tag found, emit rest
			result.WriteString(delta[i:])
			break
		}

		// Emit text before the tag
		if openIdx > 0 {
			result.WriteString(delta[i : i+openIdx])
		}

		// Find end of opening tag (could be <think or <think\n or <think/>)
		tagEnd := i + openIdx + len("<think")
		if tagEnd < len(delta) && delta[tagEnd] == '>' {
			tagEnd++ // skip >
		}
		*insideThink = true
		i = tagEnd
	}
	return result.String()
}

// stripThinkTags removes all <think...</think > blocks from a complete string.
func stripThinkTags(text string) string {
	for {
		start := strings.Index(text, "<think")
		if start == -1 {
			break
		}
		end := strings.Index(text[start:], "</think")
		if end == -1 {
			// Unclosed think tag, remove from start to end
			text = text[:start]
			break
		}
		text = text[:start] + text[start+end+len("</think"):]
	}
	return strings.TrimSpace(text)
}
