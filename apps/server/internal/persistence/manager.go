// Package persistence provides data persistence for game sessions using JSONL files.
package persistence

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"

	"github.com/dnd-game/server/internal/shared/state"
)

// AdapterError is returned when type adaptation fails.
type AdapterError struct {
	Message string
}

func (e *AdapterError) Error() string {
	return e.Message
}

// Manager handles persistence of game sessions.
type Manager struct {
	basePath string
	mu       sync.RWMutex
}

// NewManager creates a new persistence manager.
func NewManager(basePath string) (*Manager, error) {
	// Ensure base directory exists
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("create base directory: %w", err)
	}

	return &Manager{
		basePath: basePath,
	}, nil
}

// CreateSession creates a new session directory.
// Returns an error if the session directory already exists.
func (m *Manager) CreateSession(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	dir := m.sessionPath(sessionID)
	// Use Mkdir instead of MkdirAll to return an error if directory already exists
	if err := os.Mkdir(dir, 0755); err != nil {
		return fmt.Errorf("create session directory: %w", err)
	}

	return nil
}

// DeleteSession removes a session directory and all its contents.
func (m *Manager) DeleteSession(sessionID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	dir := m.sessionPath(sessionID)
	if err := os.RemoveAll(dir); err != nil {
		return fmt.Errorf("delete session directory: %w", err)
	}

	return nil
}

// SessionExists checks if a session directory exists.
func (m *Manager) SessionExists(sessionID string) bool {
	dir := m.sessionPath(sessionID)
	info, err := os.Stat(dir)
	return err == nil && info.IsDir()
}

// SaveState saves the current game state to a JSON file.
func (m *Manager) SaveState(sessionID string, gameState *state.GameState) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.sessionPath(sessionID), "state.json")

	data, err := json.MarshalIndent(gameState, "", "  ")
	if err != nil {
		return fmt.Errorf("marshal state: %w", err)
	}

	if err := os.WriteFile(path, data, 0644); err != nil {
		return fmt.Errorf("write state file: %w", err)
	}

	return nil
}

// LoadState loads the game state from a JSON file.
func (m *Manager) LoadState(sessionID string) (*state.GameState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	path := filepath.Join(m.sessionPath(sessionID), "state.json")

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read state file: %w", err)
	}

	var gameState state.GameState
	if err := json.Unmarshal(data, &gameState); err != nil {
		return nil, fmt.Errorf("unmarshal state: %w", err)
	}

	return &gameState, nil
}

// MessageEntry represents a single message in the message log.
type MessageEntry struct {
	Type      string      `json:"type"`
	Timestamp int64       `json:"timestamp"`
	Data      interface{} `json:"data"`
}

// AppendMessage appends a message to the messages JSONL file.
func (m *Manager) AppendMessage(sessionID string, entry *MessageEntry) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	path := filepath.Join(m.sessionPath(sessionID), "messages.jsonl")

	f, err := os.OpenFile(path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("open messages file: %w", err)
	}
	defer f.Close()

	data, err := json.Marshal(entry)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	if _, err := f.Write(append(data, '\n')); err != nil {
		return fmt.Errorf("write message: %w", err)
	}

	return nil
}

// LoadMessages loads messages from the messages JSONL file.
// offset is the number of messages to skip, limit is the max number to return.
// A limit of 0 means no limit.
func (m *Manager) LoadMessages(sessionID string, offset, limit int) ([]*MessageEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	path := filepath.Join(m.sessionPath(sessionID), "messages.jsonl")

	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []*MessageEntry{}, nil
		}
		return nil, fmt.Errorf("open messages file: %w", err)
	}
	defer f.Close()

	var messages []*MessageEntry
	scanner := bufio.NewScanner(f)
	lineNum := 0
	skipped := 0

	for scanner.Scan() {
		lineNum++

		// Skip lines before offset
		if skipped < offset {
			skipped++
			continue
		}

		// Check limit
		if limit > 0 && len(messages) >= limit {
			break
		}

		var entry MessageEntry
		if err := json.Unmarshal(scanner.Bytes(), &entry); err != nil {
			// Skip malformed lines
			continue
		}
		messages = append(messages, &entry)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("scan messages file: %w", err)
	}

	return messages, nil
}

// ListSessions returns a list of all session IDs.
func (m *Manager) ListSessions() ([]string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	entries, err := os.ReadDir(m.basePath)
	if err != nil {
		return nil, fmt.Errorf("read base directory: %w", err)
	}

	sessions := make([]string, 0, len(entries))
	for _, entry := range entries {
		if entry.IsDir() {
			sessions = append(sessions, entry.Name())
		}
	}

	return sessions, nil
}

// sessionPath returns the full path to a session directory.
func (m *Manager) sessionPath(sessionID string) string {
	return filepath.Join(m.basePath, sessionID)
}
