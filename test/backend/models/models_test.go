package models_test

import (
	"encoding/json"
	"testing"

	models "github.com/dnd-game/server/internal/shared/models"
)

func TestClientMessage(t *testing.T) {
	t.Run("create client message", func(t *testing.T) {
		msg := &models.ClientMessage{
			Type:      models.MsgTypeUserInput,
			Payload:   json.RawMessage(`{"text":"hello"}`),
			RequestID: "req-123",
		}

		if msg.Type != models.MsgTypeUserInput {
			t.Errorf("Expected type %s, got %s", models.MsgTypeUserInput, msg.Type)
		}
		if msg.RequestID != "req-123" {
			t.Errorf("Expected request ID 'req-123', got %s", msg.RequestID)
		}
	})

	t.Run("client message without request ID", func(t *testing.T) {
		msg := &models.ClientMessage{
			Type:    models.MsgTypePing,
			Payload: json.RawMessage(`{}`),
		}

		if msg.RequestID != "" {
			t.Errorf("Expected empty request ID")
		}
	})
}

func TestServerMessage(t *testing.T) {
	t.Run("create server message", func(t *testing.T) {
		msg := &models.ServerMessage{
			Type:      models.MsgTypeNarration,
			Payload:   map[string]string{"text": "Hello!"},
			RequestID: "req-123",
			Timestamp: 1234567890,
		}

		if msg.Type != models.MsgTypeNarration {
			t.Errorf("Expected type %s", models.MsgTypeNarration)
		}
		if msg.Timestamp != 1234567890 {
			t.Errorf("Expected timestamp 1234567890")
		}
	})

	t.Run("server message without request ID", func(t *testing.T) {
		msg := &models.ServerMessage{
			Type:      models.MsgTypePong,
			Payload:   nil,
			Timestamp: 1234567890,
		}

		if msg.RequestID != "" {
			t.Errorf("Expected empty request ID")
		}
	})
}

func TestEncodeServerMessage(t *testing.T) {
	t.Run("encode to JSON", func(t *testing.T) {
		msg := &models.ServerMessage{
			Type:      models.MsgTypeNarration,
			Payload:   map[string]string{"text": "Hello!"},
			Timestamp: 1234567890,
		}

		data, err := models.EncodeServerMessage(msg)
		if err != nil {
			t.Errorf("EncodeServerMessage() error: %v", err)
		}

		// Verify it's valid JSON
		var decoded map[string]interface{}
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Errorf("Encoded data is not valid JSON: %v", err)
		}

		if decoded["type"] != "narration" {
			t.Errorf("Encoded type mismatch")
		}
	})

	t.Run("encode with complex payload", func(t *testing.T) {
		payload := map[string]interface{}{
			"text": "You enter a dark room.",
			"choices": []string{"look around", "leave"},
		}
		msg := &models.ServerMessage{
			Type:      models.MsgTypeNarration,
			Payload:   payload,
			Timestamp: 1234567890,
		}

		data, err := models.EncodeServerMessage(msg)
		if err != nil {
			t.Errorf("EncodeServerMessage() error: %v", err)
		}

		var decoded map[string]interface{}
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Errorf("Encoded data is not valid JSON: %v", err)
		}
	})
}

func TestDecodeClientMessage(t *testing.T) {
	t.Run("decode valid JSON", func(t *testing.T) {
		data := []byte(`{"type":"user_input","payload":{"text":"hello"},"requestId":"req-123"}`)

		msg, err := models.DecodeClientMessage(data)
		if err != nil {
			t.Errorf("DecodeClientMessage() error: %v", err)
		}

		if msg.Type != models.MsgTypeUserInput {
			t.Errorf("Expected type %s", models.MsgTypeUserInput)
		}
		if msg.RequestID != "req-123" {
			t.Errorf("Expected request ID 'req-123'")
		}
	})

	t.Run("decode without request ID", func(t *testing.T) {
		data := []byte(`{"type":"ping","payload":{}}`)

		msg, err := models.DecodeClientMessage(data)
		if err != nil {
			t.Errorf("DecodeClientMessage() error: %v", err)
		}

		if msg.Type != models.MsgTypePing {
			t.Errorf("Expected type %s", models.MsgTypePing)
		}
	})

	t.Run("decode invalid JSON returns error", func(t *testing.T) {
		data := []byte(`not valid json`)

		_, err := models.DecodeClientMessage(data)
		if err == nil {
			t.Errorf("Expected error for invalid JSON")
		}
	})

	t.Run("decode empty payload", func(t *testing.T) {
		data := []byte(`{"type":"ping","payload":null}`)

		msg, err := models.DecodeClientMessage(data)
		if err != nil {
			t.Errorf("DecodeClientMessage() error: %v", err)
		}

		if msg.Type != models.MsgTypePing {
			t.Errorf("Expected type %s", models.MsgTypePing)
		}
	})
}

func TestMessageConstants(t *testing.T) {
	t.Run("client message type constants", func(t *testing.T) {
		constants := []struct {
			name  string
			value string
		}{
			{"MsgTypeUserInput", models.MsgTypeUserInput},
			{"MsgTypeMapAction", models.MsgTypeMapAction},
			{"MsgTypeCombatAction", models.MsgTypeCombatAction},
			{"MsgTypeManagement", models.MsgTypeManagement},
			{"MsgTypePing", models.MsgTypePing},
		}

		for _, c := range constants {
			if c.value == "" {
				t.Errorf("%s should not be empty", c.name)
			}
		}
	})

	t.Run("server message type constants", func(t *testing.T) {
		constants := []struct {
			name  string
			value string
		}{
			{"MsgTypeNarration", models.MsgTypeNarration},
			{"MsgTypeStateUpdate", models.MsgTypeStateUpdate},
			{"MsgTypeDiceResult", models.MsgTypeDiceResult},
			{"MsgTypeCombatEvent", models.MsgTypeCombatEvent},
			{"MsgTypeError", models.MsgTypeError},
			{"MsgTypePong", models.MsgTypePong},
		}

		for _, c := range constants {
			if c.value == "" {
				t.Errorf("%s should not be empty", c.name)
			}
		}
	})

	t.Run("constants have correct values", func(t *testing.T) {
		if models.MsgTypeUserInput != "user_input" {
			t.Errorf("MsgTypeUserInput should be 'user_input'")
		}
		if models.MsgTypePing != "ping" {
			t.Errorf("MsgTypePing should be 'ping'")
		}
		if models.MsgTypePong != "pong" {
			t.Errorf("MsgTypePong should be 'pong'")
		}
	})
}

func TestDiceResult(t *testing.T) {
	t.Run("create dice result", func(t *testing.T) {
		result := &models.DiceResult{
			Formula:  "2d6+3",
			Dice:     []int{4, 5},
			Modifier: 3,
			Total:    12,
			IsCrit:   false,
			IsFumble: false,
		}

		if result.Formula != "2d6+3" {
			t.Errorf("Formula mismatch")
		}
		if result.Total != 12 {
			t.Errorf("Total mismatch")
		}
	})

	t.Run("critical hit", func(t *testing.T) {
		result := &models.DiceResult{
			Formula:  "1d20",
			Dice:     []int{20},
			Modifier: 5,
			Total:    25,
			IsCrit:   true,
			IsFumble: false,
		}

		if !result.IsCrit {
			t.Errorf("Expected IsCrit to be true")
		}
		if result.IsFumble {
			t.Errorf("Expected IsFumble to be false")
		}
	})

	t.Run("fumble", func(t *testing.T) {
		result := &models.DiceResult{
			Formula:  "1d20",
			Dice:     []int{1},
			Modifier: 0,
			Total:    1,
			IsCrit:   false,
			IsFumble: true,
		}

		if result.IsCrit {
			t.Errorf("Expected IsCrit to be false")
		}
		if !result.IsFumble {
			t.Errorf("Expected IsFumble to be true")
		}
	})
}

func TestCheckResult(t *testing.T) {
	t.Run("successful check", func(t *testing.T) {
		result := &models.CheckResult{
			Success:      true,
			Roll:         15,
			Modifier:     3,
			Total:        18,
			DC:           15,
			Advantage:    false,
			Disadvantage: false,
			Crit:         false,
		}

		if !result.Success {
			t.Errorf("Expected success")
		}
		if result.Total != 18 {
			t.Errorf("Total mismatch")
		}
	})

	t.Run("failed check", func(t *testing.T) {
		result := &models.CheckResult{
			Success:      false,
			Roll:         5,
			Modifier:     2,
			Total:        7,
			DC:           15,
			Advantage:    false,
			Disadvantage: false,
			Crit:         false,
		}

		if result.Success {
			t.Errorf("Expected failure")
		}
	})

	t.Run("check with advantage", func(t *testing.T) {
		result := &models.CheckResult{
			Success:      true,
			Roll:         14,
			Modifier:     3,
			Total:        17,
			DC:           15,
			Advantage:    true,
			Disadvantage: false,
			Crit:         false,
		}

		if !result.Advantage {
			t.Errorf("Expected advantage")
		}
		if result.Disadvantage {
			t.Errorf("Expected no disadvantage")
		}
	})

	t.Run("critical success", func(t *testing.T) {
		result := &models.CheckResult{
			Success:      true,
			Roll:         20,
			Modifier:     0,
			Total:        20,
			DC:           30,
			Advantage:    false,
			Disadvantage: false,
			Crit:         true,
		}

		if !result.Crit {
			t.Errorf("Expected crit")
		}
		if !result.Success {
			t.Errorf("Crit should be success")
		}
	})
}

func TestMessageJSONSerialization(t *testing.T) {
	t.Run("server message serialization", func(t *testing.T) {
		msg := &models.ServerMessage{
			Type: models.MsgTypeDiceResult,
			Payload: &models.DiceResult{
				Formula:  "2d6+3",
				Dice:     []int{4, 5},
				Modifier: 3,
				Total:    12,
			},
			Timestamp: 1234567890,
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Errorf("Marshal error: %v", err)
		}

		var decoded models.ServerMessage
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Errorf("Unmarshal error: %v", err)
		}

		if decoded.Type != models.MsgTypeDiceResult {
			t.Errorf("Type mismatch after round-trip")
		}
	})

	t.Run("client message serialization", func(t *testing.T) {
		msg := &models.ClientMessage{
			Type:      models.MsgTypeUserInput,
			Payload:   json.RawMessage(`{"text":"attack the goblin"}`),
			RequestID: "req-456",
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Errorf("Marshal error: %v", err)
		}

		var decoded models.ClientMessage
		if err := json.Unmarshal(data, &decoded); err != nil {
			t.Errorf("Unmarshal error: %v", err)
		}

		if decoded.Type != models.MsgTypeUserInput {
			t.Errorf("Type mismatch after round-trip")
		}
		if decoded.RequestID != "req-456" {
			t.Errorf("RequestID mismatch after round-trip")
		}
	})
}
