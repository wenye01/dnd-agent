// Package models provides the core data models for the D&D game.
package models

import "encoding/json"

// ClientMessage represents a message sent from the client to the server.
type ClientMessage struct {
	Type      string          `json:"type"`                // Message type
	Payload   json.RawMessage `json:"payload"`             // Message payload
	RequestID string          `json:"requestId,omitempty"` // Optional request ID for tracking responses
}

// ServerMessage represents a message sent from the server to the client.
type ServerMessage struct {
	Type      string      `json:"type"`                // Message type
	Payload   interface{} `json:"payload"`             // Message payload
	RequestID string      `json:"requestId,omitempty"` // Request ID this message responds to
	Timestamp int64       `json:"timestamp"`           // Unix timestamp when message was sent
}

// EncodeServerMessage encodes a server message to JSON.
func EncodeServerMessage(msg *ServerMessage) ([]byte, error) {
	return json.Marshal(msg)
}

// DecodeClientMessage decodes a client message from JSON.
func DecodeClientMessage(data []byte) (*ClientMessage, error) {
	var msg ClientMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		return nil, err
	}
	return &msg, nil
}

// Client message type constants.
const (
	// MsgTypeUserInput is for user text input to be processed by the LLM.
	MsgTypeUserInput = "user_input"
	// MsgTypeMapAction is for actions on the map (movement, interaction).
	MsgTypeMapAction = "map_action"
	// MsgTypeCombatAction is for combat-related actions.
	MsgTypeCombatAction = "combat_action"
	// MsgTypeManagement is for session and configuration management.
	MsgTypeManagement = "management"
	// MsgTypePing is for connection health checks.
	MsgTypePing = "ping"
)

// Server message type constants.
const (
	// MsgTypeNarration is for LLM-generated narrative text.
	MsgTypeNarration = "narration"
	// MsgTypeStateUpdate is for game state changes.
	MsgTypeStateUpdate = "state_update"
	// MsgTypeDiceResult is for dice roll results.
	MsgTypeDiceResult = "dice_result"
	// MsgTypeCombatEvent is for combat-related events.
	MsgTypeCombatEvent = "combat_event"
	// MsgTypeError is for error messages.
	MsgTypeError = "error"
	// MsgTypePong is the response to ping messages.
	MsgTypePong = "pong"
)
