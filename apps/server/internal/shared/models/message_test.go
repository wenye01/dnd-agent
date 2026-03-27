package models

import (
	"encoding/json"
	"testing"
)

func TestClientMessage_Serialization(t *testing.T) {
	tests := []struct {
		name    string
		message ClientMessage
	}{
		{
			name: "user input message",
			message: ClientMessage{
				Type:      MsgTypeUserInput,
				Payload:   json.RawMessage(`{"text":"I attack the goblin!"}`),
				RequestID: "req-123",
			},
		},
		{
			name: "map action message",
			message: ClientMessage{
				Type:      MsgTypeMapAction,
				Payload:   json.RawMessage(`{"x":5,"y":10,"action":"move"}`),
				RequestID: "req-456",
			},
		},
		{
			name: "combat action message",
			message: ClientMessage{
				Type:      MsgTypeCombatAction,
				Payload:   json.RawMessage(`{"targetId":"enemy-1","action":"attack"}`),
				RequestID: "req-789",
			},
		},
		{
			name: "management message",
			message: ClientMessage{
				Type:      MsgTypeManagement,
				Payload:   json.RawMessage(`{"action":"createCharacter"}`),
				RequestID: "req-abc",
			},
		},
		{
			name: "ping message",
			message: ClientMessage{
				Type:    MsgTypePing,
				Payload: json.RawMessage(`{}`),
			},
		},
		{
			name: "message without request ID",
			message: ClientMessage{
				Type:    MsgTypeUserInput,
				Payload: json.RawMessage(`{"text":"Hello"}`),
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test JSON marshaling
			data, err := json.Marshal(tt.message)
			if err != nil {
				t.Fatalf("JSON Marshal failed: %v", err)
			}

			// Test JSON unmarshaling
			var unmarshaled ClientMessage
			err = json.Unmarshal(data, &unmarshaled)
			if err != nil {
				t.Fatalf("JSON Unmarshal failed: %v", err)
			}

			// Verify fields match
			if unmarshaled.Type != tt.message.Type {
				t.Errorf("Type mismatch: got %s, want %s", unmarshaled.Type, tt.message.Type)
			}
			if unmarshaled.RequestID != tt.message.RequestID {
				t.Errorf("RequestID mismatch: got %s, want %s", unmarshaled.RequestID, tt.message.RequestID)
			}
			if string(unmarshaled.Payload) != string(tt.message.Payload) {
				t.Errorf("Payload mismatch: got %s, want %s", string(unmarshaled.Payload), string(tt.message.Payload))
			}
		})
	}
}

func TestServerMessage_Serialization(t *testing.T) {
	tests := []struct {
		name    string
		message ServerMessage
	}{
		{
			name: "narration message",
			message: ServerMessage{
				Type:      MsgTypeNarration,
				Payload:   map[string]string{"text": "You enter a dark room."},
				Timestamp: 1234567890,
			},
		},
		{
			name: "state update message",
			message: ServerMessage{
				Type:      MsgTypeStateUpdate,
				Payload:   map[string]interface{}{"phase": "combat", "round": 1},
				Timestamp: 1234567890,
			},
		},
		{
			name: "dice result message",
			message: ServerMessage{
				Type: MsgTypeDiceResult,
				Payload: map[string]interface{}{
					"formula":  "2d6+3",
					"dice":     []int{4, 2},
					"modifier": 3,
					"total":    9,
				},
				Timestamp: 1234567890,
			},
		},
		{
			name: "error message",
			message: ServerMessage{
				Type:      MsgTypeError,
				Payload:   map[string]string{"code": "INVALID_INPUT", "message": "Invalid action"},
				Timestamp: 1234567890,
			},
		},
		{
			name: "pong message",
			message: ServerMessage{
				Type:      MsgTypePong,
				Payload:   nil,
				Timestamp: 1234567890,
			},
		},
		{
			name: "message with request ID",
			message: ServerMessage{
				Type:      MsgTypeStateUpdate,
				Payload:   map[string]string{"status": "updated"},
				RequestID: "req-123",
				Timestamp: 1234567890,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Test JSON marshaling
			data, err := json.Marshal(tt.message)
			if err != nil {
				t.Fatalf("JSON Marshal failed: %v", err)
			}

			// Test JSON unmarshaling
			var unmarshaled ServerMessage
			err = json.Unmarshal(data, &unmarshaled)
			if err != nil {
				t.Fatalf("JSON Unmarshal failed: %v", err)
			}

			// Verify fields match
			if unmarshaled.Type != tt.message.Type {
				t.Errorf("Type mismatch: got %s, want %s", unmarshaled.Type, tt.message.Type)
			}
			if unmarshaled.Timestamp != tt.message.Timestamp {
				t.Errorf("Timestamp mismatch: got %d, want %d", unmarshaled.Timestamp, tt.message.Timestamp)
			}
			if unmarshaled.RequestID != tt.message.RequestID {
				t.Errorf("RequestID mismatch: got %s, want %s", unmarshaled.RequestID, tt.message.RequestID)
			}
			// Verify payload round-trips correctly
			payloadData, _ := json.Marshal(tt.message.Payload)
			unmarshaledPayloadData, _ := json.Marshal(unmarshaled.Payload)
			if string(payloadData) != string(unmarshaledPayloadData) {
				t.Errorf("Payload mismatch: got %s, want %s", string(unmarshaledPayloadData), string(payloadData))
			}
		})
	}
}

func TestDecodeClientMessage(t *testing.T) {
	tests := []struct {
		name      string
		jsonData  string
		wantErr   bool
		wantType  string
		wantReqID string
	}{
		{
			name:      "valid user input message",
			jsonData:  `{"type":"user_input","payload":{"text":"Hello"},"requestId":"req-1"}`,
			wantErr:   false,
			wantType:  MsgTypeUserInput,
			wantReqID: "req-1",
		},
		{
			name:      "valid message without request ID",
			jsonData:  `{"type":"ping","payload":{}}`,
			wantErr:   false,
			wantType:  MsgTypePing,
			wantReqID: "",
		},
		{
			name:      "valid map action message",
			jsonData:  `{"type":"map_action","payload":{"x":5}}`,
			wantErr:   false,
			wantType:  MsgTypeMapAction,
		},
		{
			name:     "invalid JSON",
			jsonData: `not valid json`,
			wantErr:  true,
		},
		{
			name:     "empty payload",
			jsonData:  `{"type":"user_input","payload":null}`,
			wantErr:   false,
			wantType:  MsgTypeUserInput,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			msg, err := DecodeClientMessage([]byte(tt.jsonData))
			if (err != nil) != tt.wantErr {
				t.Errorf("DecodeClientMessage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				if msg.Type != tt.wantType {
					t.Errorf("Type = %s, want %s", msg.Type, tt.wantType)
				}
				if tt.wantReqID != "" && msg.RequestID != tt.wantReqID {
					t.Errorf("RequestID = %s, want %s", msg.RequestID, tt.wantReqID)
				}
			}
		})
	}
}

func TestEncodeServerMessage(t *testing.T) {
	tests := []struct {
		name    string
		message *ServerMessage
		wantErr bool
	}{
		{
			name: "valid narration message",
			message: &ServerMessage{
				Type:      MsgTypeNarration,
				Payload:   map[string]string{"text": "Hello"},
				Timestamp: 1234567890,
			},
			wantErr: false,
		},
		{
			name: "valid state update message",
			message: &ServerMessage{
				Type:      MsgTypeStateUpdate,
				Payload:   map[string]interface{}{"phase": "combat"},
				Timestamp: 1234567890,
			},
			wantErr: false,
		},
		{
			name: "message with nil payload",
			message: &ServerMessage{
				Type:      MsgTypePong,
				Payload:   nil,
				Timestamp: 1234567890,
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			data, err := EncodeServerMessage(tt.message)
			if (err != nil) != tt.wantErr {
				t.Errorf("EncodeServerMessage() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Verify the JSON can be unmarshaled back
				var decoded ServerMessage
				if err := json.Unmarshal(data, &decoded); err != nil {
					t.Errorf("Encoded JSON cannot be unmarshaled: %v", err)
				}

				if decoded.Type != tt.message.Type {
					t.Errorf("Type = %s, want %s", decoded.Type, tt.message.Type)
				}
				if decoded.Timestamp != tt.message.Timestamp {
					t.Errorf("Timestamp = %d, want %d", decoded.Timestamp, tt.message.Timestamp)
				}
				// Verify payload round-trips correctly
				payloadData, _ := json.Marshal(tt.message.Payload)
				decodedPayloadData, _ := json.Marshal(decoded.Payload)
				if string(payloadData) != string(decodedPayloadData) {
					t.Errorf("Payload mismatch: got %s, want %s", string(decodedPayloadData), string(payloadData))
				}
			}
		})
	}
}

func TestMessageTypeConstants(t *testing.T) {
	t.Run("client message type constants are unique", func(t *testing.T) {
		types := []string{
			MsgTypeUserInput,
			MsgTypeMapAction,
			MsgTypeCombatAction,
			MsgTypeManagement,
			MsgTypePing,
		}

		unique := make(map[string]bool)
		for _, msgType := range types {
			if unique[msgType] {
				t.Errorf("Duplicate message type constant: %s", msgType)
			}
			unique[msgType] = true
		}

		if len(unique) != len(types) {
			t.Error("Not all client message type constants are unique")
		}
	})

	t.Run("server message type constants are unique", func(t *testing.T) {
		types := []string{
			MsgTypeNarration,
			MsgTypeStateUpdate,
			MsgTypeDiceResult,
			MsgTypeCombatEvent,
			MsgTypeError,
			MsgTypePong,
		}

		unique := make(map[string]bool)
		for _, msgType := range types {
			if unique[msgType] {
				t.Errorf("Duplicate message type constant: %s", msgType)
			}
			unique[msgType] = true
		}

		if len(unique) != len(types) {
			t.Error("Not all server message type constants are unique")
		}
	})
}

func TestClientMessage_PayloadRaw(t *testing.T) {
	t.Run("payload is preserved as raw JSON", func(t *testing.T) {
		originalPayload := []byte(`{"key":"value","nested":{"data":123}}`)
		msg := ClientMessage{
			Type:    MsgTypeUserInput,
			Payload: originalPayload,
		}

		// Marshal and unmarshal
		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Marshal failed: %v", err)
		}

		var decoded ClientMessage
		err = json.Unmarshal(data, &decoded)
		if err != nil {
			t.Fatalf("Unmarshal failed: %v", err)
		}

		// Verify payload is preserved
		if string(decoded.Payload) != string(originalPayload) {
			t.Errorf("Payload not preserved: got %s, want %s", string(decoded.Payload), string(originalPayload))
		}
	})

	t.Run("payload with special characters", func(t *testing.T) {
		originalPayload := []byte(`{"text":"Hello \"World\""}`)
		msg := ClientMessage{
			Type:    MsgTypeUserInput,
			Payload: originalPayload,
		}

		data, err := json.Marshal(msg)
		if err != nil {
			t.Fatalf("Marshal failed: %v", err)
		}

		var decoded ClientMessage
		err = json.Unmarshal(data, &decoded)
		if err != nil {
			t.Fatalf("Unmarshal failed: %v", err)
		}

		if string(decoded.Payload) != string(originalPayload) {
			t.Errorf("Payload not preserved: got %s, want %s", string(decoded.Payload), string(originalPayload))
		}
	})
}
