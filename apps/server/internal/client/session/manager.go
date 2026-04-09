// Package session manages LLM conversation sessions for the D&D game server.
//
// Concurrency model:
//
// All session data is protected by Manager.mu. Manager.mu guards both the
// sessions map AND the content of each Session (e.g. Messages). We do not use
// a per-session mutex because every Session belongs to exactly one Manager and
// all access goes through Manager methods. This avoids lock-ordering bugs and
// keeps the concurrency story simple: if you hold Manager.mu (or RLock), you
// can safely read/write any session's Messages.
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
	// mu guards both the sessions map AND the contents of every Session stored
	// in it (e.g. Messages slice). All public methods acquire this lock.
	mu       sync.RWMutex
	sessions map[string]*Session
}

// Session represents an active LLM conversation.
// Callers must NOT access fields directly; use Manager methods instead.
type Session struct {
	ID       string
	Messages []llm.Message
}

// NewManager creates a new session manager.
func NewManager(provider llm.Provider) *Manager {
	return &Manager{
		provider: provider,
		sessions: make(map[string]*Session),
	}
}

// getOrCreateSession returns an existing session or creates a new one.
// Caller MUST hold Manager.mu (at least RLock for read-only intent, Lock for
// writes). If the session needs to be created the caller must hold a full Lock.
func (m *Manager) getOrCreateSession(sessionID string) *Session {
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
	// Add user message and snapshot the conversation under a single write lock.
	// The lock is released before starting the stream so we do not block other
	// operations while waiting for the LLM provider.
	m.mu.Lock()
	sess := m.getOrCreateSession(sessionID)
	sess.Messages = append(sess.Messages, llm.NewUserMessage(userContent))
	msgsSnapshot := make([]llm.Message, len(sess.Messages))
	copy(msgsSnapshot, sess.Messages)
	m.mu.Unlock()

	// Create request from snapshot -- safe to use without holding the lock.
	req := &llm.Request{
		Messages:    msgsSnapshot,
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
	// Snapshot messages under read lock so we don't block concurrent writes.
	m.mu.RLock()
	sess, exists := m.sessions[sessionID]
	if !exists {
		m.mu.RUnlock()
		return nil, fmt.Errorf("session not found: %s", sessionID)
	}
	msgsSnapshot := make([]llm.Message, len(sess.Messages))
	copy(msgsSnapshot, sess.Messages)
	m.mu.RUnlock()

	// Create request from snapshot -- safe to use without holding the lock.
	req := &llm.Request{
		Messages:    msgsSnapshot,
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
// The entire operation (get-or-create + modify) runs under a single write lock
// to prevent TOCTOU races.
func (m *Manager) SetSystemMessage(sessionID, content string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess := m.getOrCreateSession(sessionID)

	// Remove existing system message if any
	if len(sess.Messages) > 0 && sess.Messages[0].Role == llm.RoleSystem {
		sess.Messages[0] = llm.NewSystemMessage(content)
	} else {
		sess.Messages = append([]llm.Message{llm.NewSystemMessage(content)}, sess.Messages...)
	}
}

// GetMessages returns a defensive copy of all messages in a session.
// Returns nil if the session does not exist.
// The caller can safely read/modify the returned slice without holding any lock.
func (m *Manager) GetMessages(sessionID string) []llm.Message {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return nil
	}
	// Return a copy so the caller cannot mutate internal state.
	result := make([]llm.Message, len(sess.Messages))
	copy(result, sess.Messages)
	return result
}

// ClearMessages clears all messages in a session except the system message.
func (m *Manager) ClearMessages(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	sess, exists := m.sessions[sessionID]
	if !exists {
		return
	}

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
