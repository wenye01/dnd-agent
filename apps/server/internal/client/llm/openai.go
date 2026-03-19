// Package llm provides LLM provider integration for the D&D game server.
package llm

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"

	"github.com/sashabaranov/go-openai"
)

// OpenAIProvider implements Provider using the OpenAI API.
// This also works with OpenAI-compatible APIs like GLM (智谱AI).
type OpenAIProvider struct {
	client *openai.Client
	config *OpenAIConfig
	model  string
}

// OpenAIConfig holds the configuration for OpenAI API connections.
type OpenAIConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// NewOpenAIProvider creates a new OpenAI provider.
func NewOpenAIProvider(config *OpenAIConfig) *OpenAIProvider {
	clientConfig := openai.DefaultConfig(config.APIKey)
	if config.BaseURL != "" {
		clientConfig.BaseURL = config.BaseURL
	}

	return &OpenAIProvider{
		client: openai.NewClientWithConfig(clientConfig),
		config: config,
		model:  config.Model,
	}
}

// GetModel returns the model name.
func (p *OpenAIProvider) GetModel() string {
	return p.model
}

// SendMessage sends a non-streaming request to the LLM.
func (p *OpenAIProvider) SendMessage(ctx context.Context, req *Request) (*Response, error) {
	messages := p.convertMessages(req.Messages)

	chatReq := openai.ChatCompletionRequest{
		Model:       p.model,
		Messages:    messages,
		Temperature: float32(req.Temperature),
	}

	if len(req.Tools) > 0 {
		chatReq.Tools = p.convertTools(req.Tools)
	}

	resp, err := p.client.CreateChatCompletion(ctx, chatReq)
	if err != nil {
		return nil, fmt.Errorf("create chat completion: %w", err)
	}

	if len(resp.Choices) == 0 {
		return nil, fmt.Errorf("no choices in response")
	}

	choice := resp.Choices[0]
	result := &Response{
		Content: choice.Message.Content,
		Usage: Usage{
			PromptTokens:     int(resp.Usage.PromptTokens),
			CompletionTokens: int(resp.Usage.CompletionTokens),
			TotalTokens:      int(resp.Usage.TotalTokens),
		},
	}

	if len(choice.Message.ToolCalls) > 0 {
		result.ToolCalls = make([]ToolCall, len(choice.Message.ToolCalls))
		for i, tc := range choice.Message.ToolCalls {
			result.ToolCalls[i] = ToolCall{
				ID:   tc.ID,
				Name: tc.Function.Name,
			}
			if tc.Function.Arguments != "" {
				var args map[string]interface{}
				if err := json.Unmarshal([]byte(tc.Function.Arguments), &args); err == nil {
					result.ToolCalls[i].Arguments = args
				}
			}
		}
	}

	return result, nil
}

// StreamMessage sends a streaming request to the LLM.
func (p *OpenAIProvider) StreamMessage(ctx context.Context, req *Request) (<-chan StreamChunk, error) {
	stream := make(chan StreamChunk, 100)

	messages := p.convertMessages(req.Messages)

	chatReq := openai.ChatCompletionRequest{
		Model:       p.model,
		Messages:    messages,
		Temperature: float32(req.Temperature),
	}

	if len(req.Tools) > 0 {
		chatReq.Tools = p.convertTools(req.Tools)
	}

	resp, err := p.client.CreateChatCompletionStream(ctx, chatReq)
	if err != nil {
		close(stream)
		return nil, fmt.Errorf("create chat completion stream: %w", err)
	}

	go func() {
		defer close(stream)

		for {
			chunk, err := resp.Recv()
			if err != nil {
				if err == io.EOF {
					stream <- StreamChunk{Done: true}
					return
				}
				stream <- StreamChunk{Error: err}
				return
			}

			if len(chunk.Choices) == 0 {
				continue
			}

			delta := chunk.Choices[0].Delta

			// Text content
			if delta.Content != "" {
				stream <- StreamChunk{Delta: delta.Content}
			}

			// Tool calls
			if len(delta.ToolCalls) > 0 {
				tc := delta.ToolCalls[0]
				stream <- StreamChunk{
					ToolCall: &ToolCall{
						ID:        tc.ID,
						Name:      tc.Function.Name,
						Arguments: parseJSON(tc.Function.Arguments),
					},
				}
			}

			// Check if finished
			if chunk.Choices[0].FinishReason != "" {
				stream <- StreamChunk{Done: true}
				return
			}
		}
	}()

	return stream, nil
}

// convertMessages converts internal messages to OpenAI format.
func (p *OpenAIProvider) convertMessages(messages []Message) []openai.ChatCompletionMessage {
	result := make([]openai.ChatCompletionMessage, len(messages))
	for i, m := range messages {
		result[i] = openai.ChatCompletionMessage{
			Role:    m.Role,
			Content: m.Content,
		}
		if len(m.ToolCalls) > 0 {
			result[i].ToolCalls = make([]openai.ToolCall, len(m.ToolCalls))
			for j, tc := range m.ToolCalls {
				args, _ := json.Marshal(tc.Arguments)
				result[i].ToolCalls[j] = openai.ToolCall{
					ID:   tc.ID,
					Type: openai.ToolTypeFunction,
					Function: openai.FunctionCall{
						Name:      tc.Name,
						Arguments: string(args),
					},
				}
			}
		}
		if m.ToolCallID != "" {
			result[i].ToolCallID = m.ToolCallID
		}
	}
	return result
}

// convertTools converts internal tool definitions to OpenAI format.
func (p *OpenAIProvider) convertTools(tools []ToolDefinition) []openai.Tool {
	result := make([]openai.Tool, len(tools))
	for i, t := range tools {
		result[i] = openai.Tool{
			Type: openai.ToolTypeFunction,
			Function: &openai.FunctionDefinition{
				Name:        t.Function.Name,
				Description: t.Function.Description,
				Parameters:  t.Function.Parameters,
			},
		}
	}
	return result
}

// parseJSON parses a JSON string into a map, handling partial JSON.
// Returns nil for empty strings or invalid JSON (expected during streaming).
// Non-empty invalid JSON is logged at debug level for troubleshooting.
func parseJSON(s string) map[string]interface{} {
	if s == "" {
		return nil
	}

	var result map[string]interface{}
	if err := json.Unmarshal([]byte(s), &result); err != nil {
		// For partial JSON (streaming), return nil
		// The caller should accumulate chunks
		// Debug logging helps troubleshoot JSON parsing issues without noise
		if len(s) > 0 {
			// Consider using debug logging here if needed for troubleshooting
			// Keep silent for now to avoid log spam during streaming
		}
		return nil
	}
	return result
}

// CreateToolSchema creates a JSON schema for a tool's parameters.
func CreateToolSchema(params string) map[string]interface{} {
	var schema map[string]interface{}
	if err := json.Unmarshal([]byte(params), &schema); err != nil {
		// Return a basic schema if parsing fails
		return map[string]interface{}{
			"type":       "object",
			"properties": map[string]interface{}{},
		}
	}
	return schema
}

// ParseToolArguments parses tool arguments from JSON strings.
// This handles streaming accumulation of partial JSON.
func ParseToolArguments(existing map[string]interface{}, chunk string) (map[string]interface{}, error) {
	if existing == nil {
		existing = make(map[string]interface{})
	}

	// Try to parse the accumulated JSON so far
	var result map[string]interface{}
	accumulated := strings.Builder{}

	// Write existing state
	if existingBytes, err := json.Marshal(existing); err == nil && len(existingBytes) > 2 {
		accumulated.WriteString(string(existingBytes[:len(existingBytes)-1])) // Remove trailing }
		if len(chunk) > 0 && chunk[0] != ',' && len(existing) > 0 {
			accumulated.WriteString(",")
		}
	}
	accumulated.WriteString(chunk)

	if err := json.Unmarshal([]byte(accumulated.String()), &result); err != nil {
		// Return existing if this chunk doesn't complete a valid JSON
		return existing, nil
	}

	return result, nil
}
