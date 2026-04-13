package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dnd-game/server/internal/client/llm"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/google/uuid"
)

// processLLMResponse handles the streaming LLM response with agentic loop.
// When the LLM returns a tool call, the tool is executed, the result is added
// to the conversation, and the LLM is called again to continue narrating.
func (h *Hub) processLLMResponse(client *Client, text, requestID string) {
	ctx := context.Background()
	tools := h.toolRegistry.AsToolDefinitions()

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

	case "cast_spell":
		// Build spell_cast event from the tool result
		if castResult, ok := result.(map[string]interface{}); ok {
			if success, _ := castResult["success"].(bool); success {
				payload := buildSpellCastPayload(tc.Arguments, castResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeSpellCast,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}

	case "use_item":
		if itemResult, ok := result.(map[string]interface{}); ok {
			if success, _ := itemResult["success"].(bool); success {
				payload := buildItemUsePayload(tc.Arguments, itemResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeItemUse,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}

	case "equip_item":
		if equipResult, ok := result.(map[string]interface{}); ok {
			if success, _ := equipResult["success"].(bool); success {
				payload := buildEquipPayload(tc.Arguments, equipResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeEquip,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}

	case "unequip_item":
		if unequipResult, ok := result.(map[string]interface{}); ok {
			if success, _ := unequipResult["success"].(bool); success {
				payload := buildUnequipPayload(tc.Arguments, unequipResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeUnequip,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}

	case "interact":
		if interactResult, ok := result.(map[string]interface{}); ok {
			if success, _ := interactResult["success"].(bool); success {
				payload := buildMapInteractPayload(tc.Arguments, interactResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeMapInteract,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}

	case "map_switch":
		if mapSwitchResult, ok := result.(map[string]interface{}); ok {
			if success, _ := mapSwitchResult["success"].(bool); success {
				payload := buildMapSwitchPayload(tc.Arguments, mapSwitchResult)
				client.SendMessage(&models.ServerMessage{
					Type:      models.MsgTypeMapSwitch,
					Payload:   payload,
					RequestID: requestID,
					Timestamp: getCurrentTimestamp(),
				})
			}
		}
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

// --- v0.4 Phase 4: Payload builder helpers for game event messages ---

// generateEventID creates a unique event ID using UUID to avoid collisions
// when multiple events occur within the same second.
func generateEventID(prefix string) string {
	return fmt.Sprintf("%s-%s", prefix, uuid.New().String())
}

func buildSpellCastPayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	casterID, _ := args["caster_id"].(string)
	spellID, _ := args["spell_id"].(string)
	targetID, _ := args["target_id"].(string)
	slotLevel := toIntFromResult(result, "slot_level_used", 0)
	concentrating, _ := result["concentrating"].(bool)
	spellName, _ := result["spellName"].(string)
	if spellName == "" {
		spellName = spellID
	}

	// Extract damage/healing from effects array if present.
	// toIntFromResult returns 0 by default, so no separate existence check is needed.
	var totalDamage int
	var totalHealing int
	var damageTypes []string
	seenDT := make(map[string]bool)
	if effects, ok := result["effects"].([]interface{}); ok {
		for _, e := range effects {
			if em, ok := e.(map[string]interface{}); ok {
				totalDamage += toIntFromResult(em, "damage", 0)
				if dt, ok := em["damageType"].(string); ok && dt != "" && !seenDT[dt] {
					seenDT[dt] = true
					damageTypes = append(damageTypes, dt)
				}
				totalHealing += toIntFromResult(em, "healing", 0)
			}
		}
	}

	payload := map[string]interface{}{
		"eventId":       generateEventID("spell"),
		"timestamp":     getCurrentTimestamp(),
		"characterId":   casterID,
		"spellId":       spellID,
		"spellName":     spellName,
		"slotLevelUsed": slotLevel,
		"concentrating": concentrating,
	}
	if targetID != "" {
		payload["targetId"] = targetID
	}
	if totalDamage > 0 {
		payload["damage"] = totalDamage
	}
	if totalHealing > 0 {
		payload["healing"] = totalHealing
	}
	switch len(damageTypes) {
	case 1:
		payload["damageType"] = damageTypes[0]
	default:
		if len(damageTypes) > 1 {
			payload["damageType"] = strings.Join(damageTypes, ",")
		}
	}
	return payload
}

func buildItemUsePayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	characterID, _ := args["character_id"].(string)
	itemID, _ := args["item_id"].(string)
	targetID, _ := args["target_id"].(string)
	itemName, _ := result["itemName"].(string)
	if itemName == "" {
		itemName = itemID
	}
	itemType, _ := result["itemType"].(string)
	consumed, _ := result["consumed"].(bool)
	healing := toIntFromResult(result, "healing", 0)
	damage := toIntFromResult(result, "damage", 0)
	description, _ := result["description"].(string)

	payload := map[string]interface{}{
		"eventId":     generateEventID("item"),
		"timestamp":   getCurrentTimestamp(),
		"characterId": characterID,
		"itemId":      itemID,
		"itemName":    itemName,
		"itemType":    itemType,
		"consumed":    consumed,
	}
	if targetID != "" {
		payload["targetId"] = targetID
	}
	if healing > 0 {
		payload["healing"] = healing
	}
	if damage > 0 {
		payload["damage"] = damage
	}
	if description != "" {
		payload["description"] = description
	}
	return payload
}

func buildEquipPayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	characterID, _ := args["character_id"].(string)
	itemID, _ := args["item_id"].(string)
	slot, _ := args["slot"].(string)
	itemName, _ := result["itemName"].(string)
	if itemName == "" {
		itemName = itemID
	}
	acBonus := toIntFromResult(result, "acBonus", 0)
	oldItemID, _ := result["oldItemId"].(string)

	payload := map[string]interface{}{
		"eventId":     generateEventID("equip"),
		"timestamp":   getCurrentTimestamp(),
		"characterId": characterID,
		"itemId":      itemID,
		"itemName":    itemName,
		"slot":        slot,
	}
	if acBonus > 0 {
		payload["acBonus"] = acBonus
	}
	if oldItemID != "" {
		payload["oldItemId"] = oldItemID
	}
	return payload
}

func buildUnequipPayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	characterID, _ := args["character_id"].(string)
	slot, _ := args["slot"].(string)
	itemID, _ := result["itemId"].(string)
	itemName, _ := result["itemName"].(string)

	return map[string]interface{}{
		"eventId":     generateEventID("unequip"),
		"timestamp":   getCurrentTimestamp(),
		"characterId": characterID,
		"itemId":      itemID,
		"itemName":    itemName,
		"slot":        slot,
	}
}

func buildMapInteractPayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	characterID, _ := args["character_id"].(string)
	targetID, _ := args["target_id"].(string)
	action, _ := args["action"].(string)
	interactableType, _ := result["interactableType"].(string)
	mapID, _ := result["mapId"].(string)

	pos := map[string]interface{}{"x": 0, "y": 0}
	if p, ok := result["position"].(map[string]interface{}); ok {
		pos = p
	}

	return map[string]interface{}{
		"eventId":         generateEventID("map"),
		"timestamp":       getCurrentTimestamp(),
		"characterId":     characterID,
		"interactableId":  targetID,
		"interactableType": interactableType,
		"action":          action,
		"mapId":           mapID,
		"position":        pos,
	}
}

func buildMapSwitchPayload(args map[string]interface{}, result map[string]interface{}) map[string]interface{} {
	characterID, _ := args["character_id"].(string)
	fromMapID, _ := args["from_map_id"].(string)
	toMapID, _ := result["toMapId"].(string)
	entryPoint, _ := result["entryPoint"].(string)

	pos := map[string]interface{}{"x": 0, "y": 0}
	if p, ok := result["position"].(map[string]interface{}); ok {
		pos = p
	}

	return map[string]interface{}{
		"eventId":     generateEventID("mapswitch"),
		"timestamp":   getCurrentTimestamp(),
		"characterId": characterID,
		"fromMapId":   fromMapID,
		"toMapId":     toMapID,
		"entryPoint":  entryPoint,
		"position":    pos,
	}
}

// toIntFromResult extracts an integer from a map[string]interface{}.
func toIntFromResult(m map[string]interface{}, key string, defaultVal int) int {
	if v, ok := m[key]; ok {
		switch val := v.(type) {
		case float64:
			return int(val)
		case int:
			return val
		}
	}
	return defaultVal
}
