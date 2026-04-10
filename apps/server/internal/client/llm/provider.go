// Package llm provides LLM provider integration for the D&D game server.
package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// Provider defines the interface for LLM providers.
type Provider interface {
	// StreamMessage sends a message to the LLM and returns a stream of response chunks.
	StreamMessage(ctx context.Context, req *Request) (<-chan StreamChunk, error)

	// GetModel returns the model name used by this provider.
	GetModel() string
}

// Request represents a request to the LLM.
type Request struct {
	Messages []Message        `json:"messages"`
	Tools    []ToolDefinition `json:"tools,omitempty"`
	// Temperature controls randomness (0.0 to 2.0).
	Temperature float64 `json:"temperature,omitempty"`
	// MaxTokens limits the response length.
	MaxTokens int `json:"max_tokens,omitempty"`
}

// Message represents a single message in the conversation.
type Message struct {
	Role       string     `json:"role"` // system, user, assistant, tool
	Content    string     `json:"content"`
	ToolCalls  []ToolCall `json:"tool_calls,omitempty"`
	ToolCallID string     `json:"tool_call_id,omitempty"`
}

// ToolDefinition defines a tool/function that the LLM can call.
type ToolDefinition struct {
	Type     string             `json:"type"`
	Function FunctionDefinition `json:"function"`
}

// FunctionDefinition defines a function that can be called by the LLM.
type FunctionDefinition struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// Response represents a complete response from the LLM.
type Response struct {
	Content   string     `json:"content"`
	ToolCalls []ToolCall `json:"tool_calls,omitempty"`
	Usage     Usage      `json:"usage"`
}

// Usage represents token usage information.
type Usage struct {
	PromptTokens     int `json:"prompt_tokens"`
	CompletionTokens int `json:"completion_tokens"`
	TotalTokens      int `json:"total_tokens"`
}

// ToolCall represents a tool/function call made by the LLM.
type ToolCall struct {
	ID        string                 `json:"id"`
	Name      string                 `json:"name"`
	Arguments map[string]interface{} `json:"arguments"`
}

// StreamChunk represents a chunk of a streaming response.
type StreamChunk struct {
	Delta    string    `json:"delta,omitempty"`
	ToolCall *ToolCall `json:"tool_call,omitempty"`
	Done     bool      `json:"done"`
	Error    error     `json:"error,omitempty"`
}

// Message role constants.
const (
	RoleSystem    = "system"
	RoleUser      = "user"
	RoleAssistant = "assistant"
	RoleTool      = "tool"
)

// NewSystemMessage creates a new system message.
func NewSystemMessage(content string) Message {
	return Message{Role: RoleSystem, Content: content}
}

// NewUserMessage creates a new user message.
func NewUserMessage(content string) Message {
	return Message{Role: RoleUser, Content: content}
}

// NewAssistantMessage creates a new assistant message.
func NewAssistantMessage(content string) Message {
	return Message{Role: RoleAssistant, Content: content}
}

// NewToolMessage creates a new tool result message.
func NewToolMessage(toolCallID, content string) Message {
	return Message{Role: RoleTool, ToolCallID: toolCallID, Content: content}
}

// flushToolCall builds a ToolCall from accumulated streaming arguments.
// Returns a non-nil error if the buffered JSON arguments cannot be parsed.
func flushToolCall(id, name string, buf *strings.Builder) (*ToolCall, error) {
	var args map[string]interface{}
	if buf != nil && buf.Len() > 0 {
		if err := json.Unmarshal([]byte(buf.String()), &args); err != nil {
			return nil, fmt.Errorf("parse tool call arguments for %q: %w", name, err)
		}
	}
	return &ToolCall{ID: id, Name: name, Arguments: args}, nil
}
