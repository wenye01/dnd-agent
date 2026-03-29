// Package session manages LLM conversation sessions for the D&D game server.
package session

import (
	"context"
	"fmt"
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
// The caller is responsible for adding the assistant message to the session
// after processing the stream (for text responses or tool call responses).
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

	// Process stream in goroutine - just forward chunks, do NOT update session.
	// The caller (handler) manages session history for the agentic loop.
	resultStream := make(chan llm.StreamChunk, 100)

	go func() {
		defer close(resultStream)

		for chunk := range stream {
			if chunk.Error != nil {
				resultStream <- chunk
				return
			}

			if chunk.Done {
				resultStream <- llm.StreamChunk{Done: true}
				return
			}

			if chunk.Delta != "" {
				resultStream <- chunk
			}

			if chunk.ToolCall != nil {
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

// AddAssistantToolCalls adds an assistant message with tool calls to the session.
// This is needed to record the LLM's tool call before adding tool results.
func (m *Manager) AddAssistantToolCalls(sessionID string, content string, toolCalls []llm.ToolCall) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	msg := llm.Message{
		Role:      llm.RoleAssistant,
		Content:   content,
		ToolCalls: toolCalls,
	}
	sess.Messages = append(sess.Messages, msg)
	return nil
}

// AddAssistantMessage adds a plain text assistant message to the session.
func (m *Manager) AddAssistantMessage(sessionID string, content string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return fmt.Errorf("session not found: %s", sessionID)
	}

	sess.Messages = append(sess.Messages, llm.NewAssistantMessage(content))
	return nil
}

// ContinueMessage sends the current conversation (with tool results) to the LLM
// and returns a stream of response chunks. Unlike SendMessage, it does not add
// a new user message -- it just calls the LLM with whatever is in the session.
// The caller is responsible for adding the assistant message to the session.
func (m *Manager) ContinueMessage(ctx context.Context, sessionID string, tools []llm.ToolDefinition) (<-chan llm.StreamChunk, error) {
	sess, exists := m.GetSession(sessionID)
	if !exists {
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}

	// Create request from existing session messages
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

	// Process stream in goroutine - just forward chunks, do NOT update session.
	resultStream := make(chan llm.StreamChunk, 100)

	go func() {
		defer close(resultStream)

		for chunk := range stream {
			if chunk.Error != nil {
				resultStream <- chunk
				return
			}

			if chunk.Done {
				resultStream <- llm.StreamChunk{Done: true}
				return
			}

			if chunk.Delta != "" {
				resultStream <- chunk
			}

			if chunk.ToolCall != nil {
				resultStream <- chunk
			}
		}
	}()

	return resultStream, nil
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

IMPORTANT: You have access to tools for dice rolling. You MUST use these tools whenever a dice roll is needed - do NOT just describe the result narratively.

Available tools:
- roll_dice: Roll dice using D&D notation (e.g., "d20", "2d6+3", "4d6k3"). Use this for any random outcome, damage rolls, loot generation, etc.
- ability_check: Perform an ability check with a modifier against a DC. Use this when a player attempts an action with uncertain outcome (e.g., breaking down a door, persuading a guard, spotting a hidden trap).

When to use tools:
- When a player describes an action that has uncertainty or risk, call ability_check to determine the outcome.
- When rolling for damage, random encounters, or any other dice-based mechanic, call roll_dice.
- Always use the tools rather than picking a number yourself.

When creating characters, ask players for:
- Their character's name
- Race and class
- Background story

For ability scores, use the 4d6 drop lowest method (roll 4d6, keep the highest 3).

Keep responses concise and engaging. Focus on narrative and player agency.`
