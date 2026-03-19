// Package session manages LLM conversation sessions for the D&D game server.
package session

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/dnd-game/server/internal/client/llm"
)

// Manager manages LLM conversation sessions.
type Manager struct {
	provider llm.Provider
	mu       sync.RWMutex
	sessions map[string]*Session
}

// Session represents an active LLM conversation.
type Session struct {
	ID       string
	Messages []llm.Message
	mu       sync.Mutex
}

// NewManager creates a new session manager.
func NewManager(provider llm.Provider) *Manager {
	return &Manager{
		provider: provider,
		sessions: make(map[string]*Session),
	}
}

// CreateSession creates a new conversation session.
func (m *Manager) CreateSession(sessionID string) *Session {
	m.mu.Lock()
	defer m.mu.Unlock()

	if sess, exists := m.sessions[sessionID]; exists {
		return sess
	}

	sess := &Session{
		ID:       sessionID,
		Messages: []llm.Message{},
	}
	m.sessions[sessionID] = sess
	return sess
}

// GetSession retrieves a session by ID.
func (m *Manager) GetSession(sessionID string) (*Session, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sess, exists := m.sessions[sessionID]
	return sess, exists
}

// DeleteSession removes a session.
func (m *Manager) DeleteSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, sessionID)
}

// SendMessage sends a user message and returns a stream of response chunks.
func (m *Manager) SendMessage(ctx context.Context, sessionID, userContent string, tools []llm.ToolDefinition) (<-chan llm.StreamChunk, error) {
	sess := m.CreateSession(sessionID)

	// Add user message
	sess.Messages = append(sess.Messages, llm.NewUserMessage(userContent))

	// Create request
	req := &llm.Request{
		Messages:    sess.Messages,
		Tools:       tools,
		Temperature: 0.8,
	}

	// Stream response
	stream, err := m.provider.StreamMessage(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("stream message: %w", err)
	}

	// Process stream in goroutine to update session
	resultStream := make(chan llm.StreamChunk, 100)

	go func() {
		defer close(resultStream)

		var fullContent strings.Builder
		var currentToolCall *llm.ToolCall

		for chunk := range stream {
			if chunk.Error != nil {
				resultStream <- chunk
				return
			}

			if chunk.Done {
				// Add assistant message to session
				msg := llm.NewAssistantMessage(fullContent.String())
				if currentToolCall != nil {
					msg.ToolCalls = []llm.ToolCall{*currentToolCall}
				}
				sess.Messages = append(sess.Messages, msg)

				resultStream <- llm.StreamChunk{Done: true}
				return
			}

			if chunk.Delta != "" {
				fullContent.WriteString(chunk.Delta)
				resultStream <- chunk
			}

			if chunk.ToolCall != nil {
				if currentToolCall == nil {
					currentToolCall = &llm.ToolCall{
						ID:   chunk.ToolCall.ID,
						Name: chunk.ToolCall.Name,
					}
				}
				if chunk.ToolCall.Name != "" {
					currentToolCall.Name = chunk.ToolCall.Name
				}
				if chunk.ToolCall.ID != "" {
					currentToolCall.ID = chunk.ToolCall.ID
				}
				if chunk.ToolCall.Arguments != nil {
					if currentToolCall.Arguments == nil {
						currentToolCall.Arguments = make(map[string]interface{})
					}
					for k, v := range chunk.ToolCall.Arguments {
						currentToolCall.Arguments[k] = v
					}
				}
				resultStream <- chunk
			}
		}
	}()

	return resultStream, nil
}

// AddToolResult adds a tool result message to the session.
func (m *Manager) AddToolResult(sessionID, toolCallID, result string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	sess.Messages = append(sess.Messages, llm.NewToolMessage(toolCallID, result))
	return nil
}

// SetSystemMessage sets or replaces the system message for a session.
func (m *Manager) SetSystemMessage(sessionID, content string) {
	sess := m.CreateSession(sessionID)

	m.mu.Lock()
	defer m.mu.Unlock()

	// Remove existing system message if any
	if len(sess.Messages) > 0 && sess.Messages[0].Role == llm.RoleSystem {
		sess.Messages[0] = llm.NewSystemMessage(content)
	} else {
		sess.Messages = append([]llm.Message{llm.NewSystemMessage(content)}, sess.Messages...)
	}
}

// GetMessages returns all messages in a session (for debugging/logging).
func (m *Manager) GetMessages(sessionID string) []llm.Message {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return nil
	}
	return sess.Messages
}

// ClearMessages clears all messages in a session except the system message.
func (m *Manager) ClearMessages(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return
	}

	sess.mu.Lock()
	defer sess.mu.Unlock()

	// Keep system message
	if len(sess.Messages) > 0 && sess.Messages[0].Role == llm.RoleSystem {
		sess.Messages = []llm.Message{sess.Messages[0]}
	} else {
		sess.Messages = []llm.Message{}
	}
}

// DefaultDMSystemPrompt is the default system prompt for the DM.
const DefaultDMSystemPrompt = `You are the Dungeon Master (DM) for a D&D 5e game. Your role is to:

1. Guide players through an engaging fantasy adventure
2. Describe scenes vividly but concisely
3. Role-play NPCs with distinct personalities
4. Adjudicate rules fairly
5. Use dice rolls for random outcomes when appropriate

When creating characters, ask players for:
- Their character's name
- Race and class
- Background story

For ability scores, use the 4d6 drop lowest method (roll 4d6, keep the highest 3).

Keep responses concise and engaging. Focus on narrative and player agency.`
