package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dnd-game/server/internal/client/llm"
	"github.com/dnd-game/server/internal/shared/models"
)

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
			toolCalls = append(toolCalls, *chunk.ToolCall)
		}
	}

	// If there are tool calls, execute them and continue the agentic loop
	if len(toolCalls) > 0 {
		for i := 0; i < len(toolCalls) && i < maxToolLoopIterations; i++ {
			tc := &toolCalls[i]
			h.executeAndSendToolResult(client, tc, requestID)
		}

		continueStream, err := h.sessionMgr.ContinueMessage(ctx, client.SessionID, tools)
		if err != nil {
			h.SendError(client, fmt.Sprintf("LLM continue error: %v", err))
			return
		}
		h.processStreamWithToolLoop(ctx, client, continueStream, tools, requestID)
		return
	}

	// No tool calls -- send final narration message
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

	h.sessionMgr.AddAssistantToolCalls(client.SessionID, "", []llm.ToolCall{*tc})

	result, err := h.toolRegistry.Execute(tc.Name, tc.Arguments)
	if err != nil {
		h.logger.Error().Err(err).Str("tool", tc.Name).Msg("tool execution failed")
		h.sessionMgr.AddToolResult(client.SessionID, tc.ID, fmt.Sprintf("Error: %v", err))
		return
	}

	resultJSON, _ := json.Marshal(result)
	h.sessionMgr.AddToolResult(client.SessionID, tc.ID, string(resultJSON))

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

// filterThinkTags filters <think/> reasoning blocks from streaming text.
// It tracks whether we're inside a think block across chunks and only
// returns text that is NOT inside <think/> tags.
func filterThinkTags(delta string, insideThink *bool) string {
	var result strings.Builder
	i := 0
	for i < len(delta) {
		if *insideThink {
			closeIdx := strings.Index(delta[i:], "</think")
			if closeIdx == -1 {
				return result.String()
			}
			end := i + closeIdx + len("</think")
			if end > len(delta) {
				end = len(delta)
			}
			i = end
			*insideThink = false
			continue
		}

		openIdx := strings.Index(delta[i:], "<think")
		if openIdx == -1 {
			result.WriteString(delta[i:])
			break
		}

		if openIdx > 0 {
			result.WriteString(delta[i : i+openIdx])
		}

		tagEnd := i + openIdx + len("<think")
		if tagEnd < len(delta) && delta[tagEnd] == '>' {
			tagEnd++
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
			text = text[:start]
			break
		}
		text = text[:start] + text[start+end+len("</think"):]
	}
	return strings.TrimSpace(text)
}
