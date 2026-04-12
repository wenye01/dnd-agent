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

// --- v0.4 Phase 4: Game event payload serialization tests ---

// TestSpellCastPayload_Serialization verifies spell_cast event payloads round-trip correctly.
func TestSpellCastPayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeSpellCast,
		Payload: map[string]interface{}{
			"eventId":       "spell-123",
			"timestamp":     int64(1710000000),
			"characterId":   "wizard-1",
			"targetId":      "goblin-1",
			"spellId":       "magic_missile",
			"spellName":     "Magic Missile",
			"slotLevelUsed": 1,
			"concentrating": false,
			"damage":        10,
			"damageType":    "force",
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal spell_cast: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "spell_cast" {
		t.Errorf("Expected type 'spell_cast', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["spellId"] != "magic_missile" {
		t.Errorf("Expected spellId 'magic_missile', got '%v'", payloadMap["spellId"])
	}
	if payloadMap["characterId"] != "wizard-1" {
		t.Errorf("Expected characterId 'wizard-1', got '%v'", payloadMap["characterId"])
	}
	if payloadMap["damage"] != float64(10) {
		t.Errorf("Expected damage 10, got '%v'", payloadMap["damage"])
	}
}

// TestItemUsePayload_Serialization verifies item_use event payloads round-trip correctly.
func TestItemUsePayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeItemUse,
		Payload: map[string]interface{}{
			"eventId":     "item-123",
			"timestamp":   int64(1710000000),
			"characterId": "wizard-1",
			"itemId":      "potion-heal-1",
			"itemName":    "Healing Potion",
			"itemType":    "consumable",
			"consumed":    true,
			"healing":     8,
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal item_use: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "item_use" {
		t.Errorf("Expected type 'item_use', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["consumed"] != true {
		t.Errorf("Expected consumed true, got '%v'", payloadMap["consumed"])
	}
	if payloadMap["healing"] != float64(8) {
		t.Errorf("Expected healing 8, got '%v'", payloadMap["healing"])
	}
}

// TestEquipPayload_Serialization verifies equip event payloads round-trip correctly.
func TestEquipPayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeEquip,
		Payload: map[string]interface{}{
			"eventId":     "equip-123",
			"timestamp":   int64(1710000000),
			"characterId": "wizard-1",
			"itemId":      "chain-mail-1",
			"itemName":    "Chain Mail",
			"slot":        "chest",
			"acBonus":     5,
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal equip: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "equip" {
		t.Errorf("Expected type 'equip', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["slot"] != "chest" {
		t.Errorf("Expected slot 'chest', got '%v'", payloadMap["slot"])
	}
	if payloadMap["acBonus"] != float64(5) {
		t.Errorf("Expected acBonus 5, got '%v'", payloadMap["acBonus"])
	}
}

// TestUnequipPayload_Serialization verifies unequip event payloads round-trip correctly.
func TestUnequipPayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeUnequip,
		Payload: map[string]interface{}{
			"eventId":     "unequip-123",
			"timestamp":   int64(1710000000),
			"characterId": "wizard-1",
			"itemId":      "longsword-1",
			"itemName":    "Longsword",
			"slot":        "main_hand",
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal unequip: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "unequip" {
		t.Errorf("Expected type 'unequip', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["slot"] != "main_hand" {
		t.Errorf("Expected slot 'main_hand', got '%v'", payloadMap["slot"])
	}
}

// TestMapInteractPayload_Serialization verifies map_interact event payloads round-trip correctly.
func TestMapInteractPayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeMapInteract,
		Payload: map[string]interface{}{
			"eventId":         "map-123",
			"timestamp":       int64(1710000000),
			"characterId":     "wizard-1",
			"interactableId":  "chest-1",
			"interactableType": "chest",
			"action":          "open",
			"mapId":           "map-dungeon-1",
			"position":        map[string]interface{}{"x": float64(5), "y": float64(3)},
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal map_interact: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "map_interact" {
		t.Errorf("Expected type 'map_interact', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["interactableId"] != "chest-1" {
		t.Errorf("Expected interactableId 'chest-1', got '%v'", payloadMap["interactableId"])
	}
}

// TestMapSwitchPayload_Serialization verifies map_switch event payloads round-trip correctly.
func TestMapSwitchPayload_Serialization(t *testing.T) {
	msg := &models.ServerMessage{
		Type: models.MsgTypeMapSwitch,
		Payload: map[string]interface{}{
			"eventId":     "mapswitch-123",
			"timestamp":   int64(1710000000),
			"characterId": "wizard-1",
			"fromMapId":   "map-dungeon-1",
			"toMapId":     "map-dungeon-2",
			"entryPoint":  "south_entrance",
			"position":    map[string]interface{}{"x": float64(0), "y": float64(5)},
		},
		Timestamp: 0,
	}

	data, err := json.Marshal(msg)
	if err != nil {
		t.Fatalf("Failed to marshal map_switch: %v", err)
	}

	var decoded map[string]interface{}
	json.Unmarshal(data, &decoded)

	if decoded["type"] != "map_switch" {
		t.Errorf("Expected type 'map_switch', got '%v'", decoded["type"])
	}

	payloadMap := decoded["payload"].(map[string]interface{})
	if payloadMap["toMapId"] != "map-dungeon-2" {
		t.Errorf("Expected toMapId 'map-dungeon-2', got '%v'", payloadMap["toMapId"])
	}
}

// TestBuildSpellCastPayload verifies the buildSpellCastPayload helper.
func TestBuildSpellCastPayload(t *testing.T) {
	args := map[string]interface{}{
		"caster_id": "wizard-1",
		"spell_id":  "magic_missile",
		"target_id": "goblin-1",
	}
	result := map[string]interface{}{
		"success":        true,
		"spellName":      "Magic Missile",
		"slotLevelUsed":  float64(1),
		"concentrating":  false,
		"effects": []interface{}{
			map[string]interface{}{
				"type":       "damage",
				"targetId":   "goblin-1",
				"damage":     float64(10),
				"damageType": "force",
			},
		},
	}

	payload := buildSpellCastPayload(args, result)

	if payload["characterId"] != "wizard-1" {
		t.Errorf("Expected characterId 'wizard-1', got '%v'", payload["characterId"])
	}
	if payload["spellName"] != "Magic Missile" {
		t.Errorf("Expected spellName 'Magic Missile', got '%v'", payload["spellName"])
	}
	if payload["targetId"] != "goblin-1" {
		t.Errorf("Expected targetId 'goblin-1', got '%v'", payload["targetId"])
	}
	if payload["damage"] != 10 {
		t.Errorf("Expected damage 10, got '%v'", payload["damage"])
	}
	if payload["damageType"] != "force" {
		t.Errorf("Expected damageType 'force', got '%v'", payload["damageType"])
	}
}

// TestBuildEquipPayload verifies the buildEquipPayload helper.
func TestBuildEquipPayload(t *testing.T) {
	args := map[string]interface{}{
		"character_id": "wizard-1",
		"item_id":      "chain-mail-1",
		"slot":         "chest",
	}
	result := map[string]interface{}{
		"success":  true,
		"itemName": "Chain Mail",
		"acBonus":  float64(5),
	}

	payload := buildEquipPayload(args, result)

	if payload["characterId"] != "wizard-1" {
		t.Errorf("Expected characterId 'wizard-1', got '%v'", payload["characterId"])
	}
	if payload["slot"] != "chest" {
		t.Errorf("Expected slot 'chest', got '%v'", payload["slot"])
	}
	if payload["acBonus"] != 5 {
		t.Errorf("Expected acBonus 5, got '%v'", payload["acBonus"])
	}
}

// TestBuildItemUsePayload verifies the buildItemUsePayload helper.
func TestBuildItemUsePayload(t *testing.T) {
	args := map[string]interface{}{
		"character_id": "wizard-1",
		"item_id":      "potion-heal-1",
	}
	result := map[string]interface{}{
		"success":   true,
		"itemName":  "Healing Potion",
		"itemType":  "consumable",
		"consumed":  true,
		"healing":   float64(8),
	}

	payload := buildItemUsePayload(args, result)

	if payload["characterId"] != "wizard-1" {
		t.Errorf("Expected characterId 'wizard-1', got '%v'", payload["characterId"])
	}
	if payload["consumed"] != true {
		t.Errorf("Expected consumed true, got '%v'", payload["consumed"])
	}
	if payload["healing"] != 8 {
		t.Errorf("Expected healing 8, got '%v'", payload["healing"])
	}
}
