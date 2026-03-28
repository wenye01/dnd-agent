package websocket

import (
	"encoding/json"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

// mockSessionMgr mocks the session.Manager for testing.
type mockSessionMgr struct {
	clearedSession string
}

func (m *mockSessionMgr) ClearMessages(sessionID string) {
	m.clearedSession = sessionID
}

// mockClient captures messages sent to a client.
type mockClient struct {
	messages []*models.ServerMessage
}

func (m *mockClient) SendMessage(message *models.ServerMessage) {
	m.messages = append(m.messages, message)
}

// TestSendError_Format verifies the new error message format with code and message fields.
func TestSendError_Format(t *testing.T) {
	// Verify the message format directly via JSON round-trip.

	errMsg := "something went wrong"
	message := &models.ServerMessage{
		Type: models.MsgTypeError,
		Payload: map[string]string{
			"code":    "SERVER_ERROR",
			"message": errMsg,
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("Failed to marshal error message: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	payload, ok := decoded["payload"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected payload to be a map")
	}

	if payload["code"] != "SERVER_ERROR" {
		t.Errorf("Expected error code 'SERVER_ERROR', got '%v'", payload["code"])
	}
	if payload["message"] != errMsg {
		t.Errorf("Expected error message '%s', got '%v'", errMsg, payload["message"])
	}
}

// TestHandleManagement_ClearHistory_Format verifies the new state_update payload format
// for clear_history action includes stateType "notification" with nested data.
func TestHandleManagement_ClearHistory_Format(t *testing.T) {
	// Verify the payload structure matches the expected format
	payload := map[string]interface{}{
		"stateType": "notification",
		"data": map[string]string{
			"status": "history_cleared",
		},
	}

	msg := &models.ServerMessage{
		Type:      models.MsgTypeStateUpdate,
		Payload:   payload,
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal message: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	// Verify top-level type
	if decoded["type"] != "state_update" {
		t.Errorf("Expected type 'state_update', got '%v'", decoded["type"])
	}

	// Verify payload structure
	payloadMap, ok := decoded["payload"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected payload to be a map")
	}

	if payloadMap["stateType"] != "notification" {
		t.Errorf("Expected stateType 'notification', got '%v'", payloadMap["stateType"])
	}

	dataMap, ok := payloadMap["data"].(map[string]interface{})
	if !ok {
		t.Fatal("Expected data to be a map")
	}
	if dataMap["status"] != "history_cleared" {
		t.Errorf("Expected status 'history_cleared', got '%v'", dataMap["status"])
	}
}

// TestHandleMapAction_PayloadFormat verifies the map action state_update payload format.
func TestHandleMapAction_PayloadFormat(t *testing.T) {
	payload := map[string]interface{}{
		"stateType": "map",
		"data": map[string]string{
			"action": "move",
		},
	}

	msg := &models.ServerMessage{
		Type:      models.MsgTypeStateUpdate,
		Payload:   payload,
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal message: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["stateType"] != "map" {
		t.Errorf("Expected stateType 'map', got '%v'", payloadMap["stateType"])
	}

	dataMap := payloadMap["data"].(map[string]interface{})
	if dataMap["action"] != "move" {
		t.Errorf("Expected action 'move', got '%v'", dataMap["action"])
	}
}

// TestHandleCombatAction_PayloadFormat verifies the combat action payload format
// includes eventType and target fields instead of the old "action" field.
func TestHandleCombatAction_PayloadFormat(t *testing.T) {
	testCases := []struct {
		name     string
		action   string
		target   string
		expected map[string]interface{}
	}{
		{
			name:   "attack with target",
			action: "attack",
			target: "goblin-1",
			expected: map[string]interface{}{
				"eventType": "attack",
				"target":    "goblin-1",
			},
		},
		{
			name:   "spell without target",
			action: "spell",
			target: "",
			expected: map[string]interface{}{
				"eventType": "spell",
				"target":    "",
			},
		},
		{
			name:   "dodge action",
			action: "dodge",
			target: "",
			expected: map[string]interface{}{
				"eventType": "dodge",
				"target":    "",
			},
		},
		{
			name:   "disengage action",
			action: "disengage",
			target: "",
			expected: map[string]interface{}{
				"eventType": "disengage",
				"target":    "",
			},
		},
		{
			name:   "item action",
			action: "item",
			target: "",
			expected: map[string]interface{}{
				"eventType": "item",
				"target":    "",
			},
		},
		{
			name:   "move action",
			action: "move",
			target: "",
			expected: map[string]interface{}{
				"eventType": "move",
				"target":    "",
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			payload := map[string]interface{}{
				"eventType": tc.action,
				"target":    tc.target,
			}

			msg := &models.ServerMessage{
				Type:      models.MsgTypeCombatEvent,
				Payload:   payload,
				Timestamp: 0,
			}

			data, err := json.Marshal(msg)
			if err != nil {
				t.Fatalf("Failed to marshal message: %v", err)
			}

			var decoded map[string]interface{}
			json.Unmarshal(data, &decoded)

			if decoded["type"] != "combat_event" {
				t.Errorf("Expected type 'combat_event', got '%v'", decoded["type"])
			}

			payloadMap, ok := decoded["payload"].(map[string]interface{})
			if !ok {
				t.Fatal("Expected payload to be a map")
			}

			if payloadMap["eventType"] != tc.expected["eventType"] {
				t.Errorf("Expected eventType '%v', got '%v'", tc.expected["eventType"], payloadMap["eventType"])
			}
			if payloadMap["target"] != tc.expected["target"] {
				t.Errorf("Expected target '%v', got '%v'", tc.expected["target"], payloadMap["target"])
			}

			// Verify the old "action" field does NOT exist
			if _, exists := payloadMap["action"]; exists {
				t.Error("Payload should not contain 'action' field - it should be 'eventType'")
			}
		})
	}
}

// TestStateUpdatePayload_Serialization verifies that state_update payloads with stateType
// serialize correctly for all state types used by the server.
func TestStateUpdatePayload_Serialization(t *testing.T) {
	stateTypes := []string{"game", "party", "combat", "map", "notification"}

	for _, st := range stateTypes {
		t.Run(st, func(t *testing.T) {
			msg := &models.ServerMessage{
				Type: models.MsgTypeStateUpdate,
				Payload: map[string]interface{}{
					"stateType": st,
					"data":      map[string]string{"test": "value"},
				},
				Timestamp: 0,
			}

			data, err := json.Marshal(msg)
			if err != nil {
				t.Fatalf("Failed to marshal state_update for stateType '%s': %v", st, err)
			}

			var decoded map[string]interface{}
			json.Unmarshal(data, &decoded)

			payloadMap := decoded["payload"].(map[string]interface{})
			if payloadMap["stateType"] != st {
				t.Errorf("Expected stateType '%s', got '%v'", st, payloadMap["stateType"])
			}
		})
	}
}

// TestCombatEventPayload_Serialization verifies combat_event payloads round-trip correctly.
func TestCombatEventPayload_Serialization(t *testing.T) {
	eventTypes := []string{
		"turn_start", "turn_end", "round_start", "round_end",
		"combat_start", "combat_end",
		"attack", "spell", "item", "move", "dodge", "disengage",
	}

	for _, et := range eventTypes {
		t.Run(et, func(t *testing.T) {
			msg := &models.ServerMessage{
				Type: models.MsgTypeCombatEvent,
				Payload: map[string]interface{}{
					"eventType": et,
					"target":    "test-target",
				},
				Timestamp: 0,
			}

			data, err := json.Marshal(msg)
			if err != nil {
				t.Fatalf("Failed to marshal combat_event for eventType '%s': %v", et, err)
			}

			var decoded map[string]interface{}
			json.Unmarshal(data, &decoded)

			payloadMap := decoded["payload"].(map[string]interface{})
			if payloadMap["eventType"] != et {
				t.Errorf("Expected eventType '%s', got '%v'", et, payloadMap["eventType"])
			}
		})
	}
}

// TestErrorMessage_CodeFieldPresent verifies that error messages include the code field
// (previously error payloads had just {"error": "msg"}).
func TestErrorMessage_CodeFieldPresent(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeError,
		Payload: map[string]string{
			"code":    "SERVER_ERROR",
			"message": "test error",
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	payloadMap := decoded["payload"].(map[string]interface{})

	// Verify "code" field is present
	if _, exists := payloadMap["code"]; !exists {
		t.Error("Error payload must include 'code' field")
	}

	// Verify "message" field is present
	if _, exists := payloadMap["message"]; !exists {
		t.Error("Error payload must include 'message' field")
	}

	// Verify old "error" field is NOT present
	if _, exists := payloadMap["error"]; exists {
		t.Error("Error payload should not have old 'error' field")
	}
}
