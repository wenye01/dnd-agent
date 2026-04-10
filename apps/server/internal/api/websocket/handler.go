package websocket

import (
	"encoding/json"
	"fmt"
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

	go h.processLLMResponse(client, payload.Text, msg.RequestID)
}

// getCurrentTimestamp returns the current Unix timestamp.
func getCurrentTimestamp() int64 {
	return time.Now().Unix()
}
