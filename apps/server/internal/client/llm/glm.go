// Package llm provides LLM provider integration for the D&D game server.
package llm

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
)

// GLMProvider implements Provider for GLM (智谱AI) API.
// GLM-4.7-Flash has special fields like reasoning_content.
type GLMProvider struct {
	apiKey  string
	baseURL string
	model   string
	client  *http.Client
}

// GLMConfig holds the configuration for GLM API connections.
type GLMConfig struct {
	APIKey  string
	BaseURL string
	Model   string
}

// NewGLMProvider creates a new GLM provider.
func NewGLMProvider(config *GLMConfig) *GLMProvider {
	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://open.bigmodel.cn/api/paas/v4/"
	}

	return &GLMProvider{
		apiKey:  config.APIKey,
		baseURL: strings.TrimSuffix(baseURL, "/"),
		model:   config.Model,
		client:  &http.Client{},
	}
}

// GetModel returns the model name.
func (p *GLMProvider) GetModel() string {
	return p.model
}

// glmRequest represents a GLM API request.
type glmRequest struct {
	Model       string           `json:"model"`
	Messages    []glmMessage     `json:"messages"`
	Temperature float64          `json:"temperature,omitempty"`
	MaxTokens   int              `json:"max_tokens,omitempty"`
	Stream      bool             `json:"stream,omitempty"`
	Tools       []glmTool        `json:"tools,omitempty"`
}

// glmMessage represents a message in GLM API.
type glmMessage struct {
	Role       string           `json:"role"`
	Content    string           `json:"content,omitempty"`
	ToolCalls  []glmToolCall    `json:"tool_calls,omitempty"`
	ToolCallID string           `json:"tool_call_id,omitempty"`
}

// glmToolCall represents a tool call in a GLM message.
type glmToolCall struct {
	ID       string             `json:"id,omitempty"`
	Type     string             `json:"type,omitempty"`
	Function glmToolCallFunction `json:"function"`
}

// glmToolCallFunction represents the function part of a tool call.
type glmToolCallFunction struct {
	Name      string `json:"name"`
	Arguments string `json:"arguments"`
}

// glmTool represents a tool definition.
type glmTool struct {
	Type     string           `json:"type"`
	Function glmToolFunction `json:"function"`
}

// glmToolFunction represents a function definition.
type glmToolFunction struct {
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
}

// glmStreamResponse represents a streaming response from GLM.
type glmStreamResponse struct {
	ID      string `json:"id"`
	Created int64  `json:"created"`
	Object  string `json:"object"`
	Model   string `json:"model"`
	Choices []struct {
		Index        int `json:"index"`
		Delta        struct {
			Role              string `json:"role,omitempty"`
			Content           string `json:"content,omitempty"`
			ReasoningContent  string `json:"reasoning_content,omitempty"`
			ToolCalls         []struct {
				ID       string `json:"id,omitempty"`
				Type     string `json:"type,omitempty"`
				Function struct {
					Name      string `json:"name,omitempty"`
					Arguments string `json:"arguments,omitempty"`
				} `json:"function,omitempty"`
			} `json:"tool_calls,omitempty"`
		} `json:"delta"`
		FinishReason string `json:"finish_reason,omitempty"`
	} `json:"choices"`
}

// SendMessage sends a non-streaming request to the GLM API.
func (p *GLMProvider) SendMessage(ctx context.Context, req *Request) (*Response, error) {
	// For simplicity, use StreamMessage and collect results
	stream, err := p.StreamMessage(ctx, req)
	if err != nil {
		return nil, err
	}

	var fullContent strings.Builder
	var toolCalls []ToolCall

	for chunk := range stream {
		if chunk.Error != nil {
			return nil, chunk.Error
		}
		if chunk.Done {
			break
		}
		if chunk.Delta != "" {
			fullContent.WriteString(chunk.Delta)
		}
		if chunk.ToolCall != nil {
			toolCalls = append(toolCalls, *chunk.ToolCall)
		}
	}

	return &Response{
		Content:   fullContent.String(),
		ToolCalls: toolCalls,
	}, nil
}

// StreamMessage sends a streaming request to the GLM API.
func (p *GLMProvider) StreamMessage(ctx context.Context, req *Request) (<-chan StreamChunk, error) {
	stream := make(chan StreamChunk, 100)

	// Build GLM request
	glmReq := glmRequest{
		Model:       p.model,
		Messages:    make([]glmMessage, len(req.Messages)),
		Temperature: req.Temperature,
		MaxTokens:   req.MaxTokens,
		Stream:      true,
	}

	for i, m := range req.Messages {
		msg := glmMessage{
			Role:       m.Role,
			Content:    m.Content,
			ToolCallID: m.ToolCallID,
		}
		if len(m.ToolCalls) > 0 {
			msg.ToolCalls = make([]glmToolCall, len(m.ToolCalls))
			for j, tc := range m.ToolCalls {
				argsJSON, _ := json.Marshal(tc.Arguments)
				msg.ToolCalls[j] = glmToolCall{
					ID:   tc.ID,
					Type: "function",
					Function: glmToolCallFunction{
						Name:      tc.Name,
						Arguments: string(argsJSON),
					},
				}
			}
		}
		glmReq.Messages[i] = msg
	}

	// Add tools if present
	if len(req.Tools) > 0 {
		glmReq.Tools = make([]glmTool, len(req.Tools))
		for i, t := range req.Tools {
			glmReq.Tools[i] = glmTool{
				Type: t.Type,
				Function: glmToolFunction{
					Name:        t.Function.Name,
					Description: t.Function.Description,
					Parameters:  t.Function.Parameters,
				},
			}
		}
	}

	body, err := json.Marshal(glmReq)
	if err != nil {
		close(stream)
		return nil, fmt.Errorf("marshal request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, "POST", p.baseURL+"/chat/completions", bytes.NewReader(body))
	if err != nil {
		close(stream)
		return nil, fmt.Errorf("create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+p.apiKey)

	resp, err := p.client.Do(httpReq)
	if err != nil {
		close(stream)
		return nil, fmt.Errorf("send request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		close(stream)
		return nil, fmt.Errorf("API error: %s - %s", resp.Status, string(respBody))
	}

	go func() {
		defer close(stream)
		defer resp.Body.Close()

		// Accumulators for streaming tool call arguments
		var tcID string
		var tcName string
		var tcArgsBuf strings.Builder
		var inToolCall bool

		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Text()

			// Skip empty lines
			if line == "" {
				continue
			}

			// Skip non-data lines
			if !strings.HasPrefix(line, "data: ") {
				continue
			}

			data := strings.TrimPrefix(line, "data: ")

			// Check for end of stream
			if data == "[DONE]" {
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

			var glmResp glmStreamResponse
			if err := json.Unmarshal([]byte(data), &glmResp); err != nil {
				stream <- StreamChunk{Error: fmt.Errorf("parse response: %w", err)}
				return
			}

			if len(glmResp.Choices) == 0 {
				continue
			}

			choice := glmResp.Choices[0]
			delta := choice.Delta

			// Handle content (standard field)
			if delta.Content != "" {
				stream <- StreamChunk{Delta: delta.Content}
			}

			// reasoning_content (GLM-specific field) is intentionally skipped.
			// It contains the model's internal thinking/reasoning process
			// and should NOT be forwarded to the user-facing narration stream.

			// Handle tool calls - accumulate arguments across streaming chunks
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

			// On finish reason, flush accumulated tool call
			if choice.FinishReason != "" {
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

		if err := scanner.Err(); err != nil {
			stream <- StreamChunk{Error: err}
		}
	}()

	return stream, nil
}
