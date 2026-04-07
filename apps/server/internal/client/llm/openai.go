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

		// Accumulators for streaming tool call arguments
		var tcID string
		var tcName string
		var tcArgsBuf strings.Builder
		var inToolCall bool

		for {
			chunk, err := resp.Recv()
			if err != nil {
				if err == io.EOF {
					// Flush any pending tool call before ending
					if inToolCall && tcName != "" {
						var args map[string]interface{}
						if tcArgsBuf.Len() > 0 {
							json.Unmarshal([]byte(tcArgsBuf.String()), &args)
						}
						stream <- StreamChunk{
							ToolCall: &ToolCall{
								ID:        tcID,
								Name:      tcName,
								Arguments: args,
							},
						}
					}
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

			// Tool calls - accumulate arguments across streaming chunks
			if len(delta.ToolCalls) > 0 {
				tc := delta.ToolCalls[0]
				if tc.ID != "" {
					tcID = tc.ID
				}
				if tc.Function.Name != "" {
					tcName = tc.Function.Name
				}
				if tc.Function.Arguments != "" {
					tcArgsBuf.WriteString(tc.Function.Arguments)
				}
				inToolCall = true
			}

			// Check if finished - flush accumulated tool call
			finishReason := chunk.Choices[0].FinishReason
			if finishReason != "" {
				if inToolCall && tcName != "" {
					var args map[string]interface{}
					if tcArgsBuf.Len() > 0 {
						json.Unmarshal([]byte(tcArgsBuf.String()), &args)
					}
					stream <- StreamChunk{
						ToolCall: &ToolCall{
							ID:        tcID,
							Name:      tcName,
							Arguments: args,
						},
					}
				}
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
