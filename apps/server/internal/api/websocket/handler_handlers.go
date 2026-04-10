package websocket

import (
	"encoding/json"
	"fmt"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
)

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

	h.stateManager.UpdateSession(client.SessionID, func(gs *state.GameState) {
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

	client.SendMessage(&models.ServerMessage{
		Type: models.MsgTypeCombatEvent,
		Payload: map[string]interface{}{
			"eventType": payload.Action,
			"target":    payload.Target,
		},
		Timestamp: getCurrentTimestamp(),
	})
}
