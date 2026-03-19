// Package state manages the game state for D&D sessions.
package state

import (
	"sync"
)

// Manager manages game states for multiple sessions.
type Manager struct {
	mu       sync.RWMutex
	sessions map[string]*GameState
}

// NewManager creates a new state manager.
func NewManager() *Manager {
	return &Manager{
		sessions: make(map[string]*GameState),
	}
}

// GetSession retrieves a game session by ID. Returns nil if not found.
func (m *Manager) GetSession(sessionID string) *GameState {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.sessions[sessionID]
}

// CreateSession creates a new game session with the given ID.
func (m *Manager) CreateSession(sessionID string) *GameState {
	m.mu.Lock()
	defer m.mu.Unlock()

	if state, exists := m.sessions[sessionID]; exists {
		return state
	}

	state := NewGameState(sessionID)
	m.sessions[sessionID] = state
	return state
}

// DeleteSession removes a game session.
func (m *Manager) DeleteSession(sessionID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.sessions, sessionID)
}

// UpdateSession atomically updates a session state using the provided function.
func (m *Manager) UpdateSession(sessionID string, updateFn func(*GameState)) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	state, exists := m.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	updateFn(state)
	return nil
}

// UpdateSessionInterface updates a session with a generic function signature.
func (m *Manager) UpdateSessionInterface(sessionID string, updateFn func(interface{})) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	state, exists := m.sessions[sessionID]
	if !exists {
		return ErrSessionNotFound
	}

	updateFn(state)
	return nil
}

// ListSessions returns a list of all session IDs.
func (m *Manager) ListSessions() []string {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ids := make([]string, 0, len(m.sessions))
	for id := range m.sessions {
		ids = append(ids, id)
	}
	return ids
}

// Errors
var (
	// ErrSessionNotFound is returned when a session ID is not found.
	ErrSessionNotFound = &StateError{Code: "SESSION_NOT_FOUND", Message: "session not found"}
)

// StateError represents an error related to state management.
type StateError struct {
	Code    string
	Message string
}

func (e *StateError) Error() string {
	return e.Message
}
