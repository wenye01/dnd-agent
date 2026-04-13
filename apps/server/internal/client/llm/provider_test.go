package llm

import (
	"strings"
	"testing"
)

func TestFlushToolCall_EmptyBuffer(t *testing.T) {
	tc, err := flushToolCall("id1", "roll_dice", nil)
	if err != nil {
		t.Fatalf("expected no error for nil buffer, got: %v", err)
	}
	if tc.ID != "id1" || tc.Name != "roll_dice" {
		t.Fatalf("unexpected tool call fields: id=%q name=%q", tc.ID, tc.Name)
	}
	if tc.Arguments != nil {
		t.Fatalf("expected nil arguments for nil buffer, got: %v", tc.Arguments)
	}
}

func TestFlushToolCall_EmptyStringBuilder(t *testing.T) {
	var buf strings.Builder
	tc, err := flushToolCall("id1", "roll_dice", &buf)
	if err != nil {
		t.Fatalf("expected no error for empty buffer, got: %v", err)
	}
	if tc.Arguments != nil {
		t.Fatalf("expected nil arguments for empty buffer, got: %v", tc.Arguments)
	}
}

func TestFlushToolCall_StandardJSON(t *testing.T) {
	// Normal OpenAI-style: fragments concatenate into a single valid JSON
	var buf strings.Builder
	buf.WriteString(`{"formula":"2d`)
	buf.WriteString(`6+3"}`)

	tc, err := flushToolCall("call_1", "roll_dice", &buf)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	if tc.Name != "roll_dice" {
		t.Fatalf("expected name roll_dice, got %q", tc.Name)
	}
	formula, ok := tc.Arguments["formula"].(string)
	if !ok || formula != "2d6+3" {
		t.Fatalf("expected formula=2d6+3, got %v", tc.Arguments["formula"])
	}
}

func TestFlushToolCall_JSONLConcatenated(t *testing.T) {
	// MiniMax-style: each chunk is a complete JSON object, concatenated
	var buf strings.Builder
	buf.WriteString(`{"formula":"2d6+3"}`)
	buf.WriteString(`{"formula":"2d6+3"}`)

	tc, err := flushToolCall("call_2", "roll_dice", &buf)
	if err != nil {
		t.Fatalf("expected no error for JSONL input, got: %v", err)
	}
	formula, ok := tc.Arguments["formula"].(string)
	if !ok || formula != "2d6+3" {
		t.Fatalf("expected formula=2d6+3, got %v", tc.Arguments["formula"])
	}
}

func TestFlushToolCall_JSONLThreeObjects(t *testing.T) {
	// Three concatenated JSON objects
	var buf strings.Builder
	buf.WriteString(`{"formula":"1d20"}`)
	buf.WriteString(`{"formula":"1d20","modifier":2}`)
	buf.WriteString(`{"formula":"1d20","modifier":2}`)

	tc, err := flushToolCall("call_3", "roll_dice", &buf)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	formula, _ := tc.Arguments["formula"].(string)
	mod, _ := tc.Arguments["modifier"].(float64)
	if formula != "1d20" {
		t.Fatalf("expected formula=1d20, got %q", formula)
	}
	if mod != 2 {
		t.Fatalf("expected modifier=2, got %v", mod)
	}
}

func TestFlushToolCall_InvalidJSON(t *testing.T) {
	var buf strings.Builder
	buf.WriteString(`not json at all`)

	_, err := flushToolCall("call_4", "roll_dice", &buf)
	if err == nil {
		t.Fatal("expected error for invalid JSON, got nil")
	}
}

func TestFlushToolCall_JSONLInvalidParts(t *testing.T) {
	var buf strings.Builder
	buf.WriteString(`{broken}{also broken}`)

	_, err := flushToolCall("call_5", "roll_dice", &buf)
	if err == nil {
		t.Fatal("expected error for all-invalid JSONL parts, got nil")
	}
}

func TestFlushToolCall_StandardComplexJSON(t *testing.T) {
	// More complex standard fragment accumulation
	var buf strings.Builder
	buf.WriteString(`{"ability":"str","dc":15,"`)
	buf.WriteString(`modifier":3}`)

	tc, err := flushToolCall("call_6", "ability_check", &buf)
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}
	ability, _ := tc.Arguments["ability"].(string)
	if ability != "str" {
		t.Fatalf("expected ability=str, got %q", ability)
	}
	dc, _ := tc.Arguments["dc"].(float64)
	if dc != 15 {
		t.Fatalf("expected dc=15, got %v", dc)
	}
}
