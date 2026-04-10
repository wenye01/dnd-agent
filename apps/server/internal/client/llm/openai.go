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
						tc, flushErr := flushToolCall(tcID, tcName, &tcArgsBuf)
						if flushErr != nil {
							stream <- StreamChunk{Error: flushErr}
							return
						}
						stream <- StreamChunk{ToolCall: tc}
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
					tc, flushErr := flushToolCall(tcID, tcName, &tcArgsBuf)
					if flushErr != nil {
						stream <- StreamChunk{Error: flushErr}
						return
					}
					stream <- StreamChunk{ToolCall: tc}
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

