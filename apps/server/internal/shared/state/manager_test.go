package state_test

import (
	"strconv"
	"sync"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
	state "github.com/dnd-game/server/internal/shared/state"
)

func TestNewManager(t *testing.T) {
	t.Run("creates new manager", func(t *testing.T) {
		mgr := state.NewManager()

		if mgr == nil {
			t.Errorf("NewManager() should return non-nil")
		}
	})

	t.Run("multiple managers are independent", func(t *testing.T) {
		mgr1 := state.NewManager()
		mgr2 := state.NewManager()

		if mgr1 == mgr2 {
			t.Errorf("NewManager() should return new instances")
		}
	})
}

func TestManager_CreateSession(t *testing.T) {
	t.Run("creates new session", func(t *testing.T) {
		mgr := state.NewManager()
		gameState := mgr.CreateSession("test-session")

		if gameState == nil {
			t.Errorf("CreateSession() should return non-nil")
		}
		if gameState.SessionID != "test-session" {
			t.Errorf("Expected session ID 'test-session', got %s", gameState.SessionID)
		}

		// Verify it's stored
		retrieved := mgr.GetSession("test-session")
		if retrieved != gameState {
			t.Errorf("Retrieved session should match created session")
		}
	})

	t.Run("returns existing session if already exists", func(t *testing.T) {
		mgr := state.NewManager()
		gameState1 := mgr.CreateSession("test-session")

		// Create a character to verify we get the same session
		gameState1.Party = append(gameState1.Party, &models.Character{
			ID:   "char-1",
			Name: "Test Character",
		})

		// Create session again with same ID
		gameState2 := mgr.CreateSession("test-session")

		if gameState1 != gameState2 {
			t.Errorf("Should return existing session")
		}
		if len(gameState2.Party) != 1 {
			t.Errorf("Existing session should preserve its state")
		}
	})
}

func TestManager_GetSession(t *testing.T) {
	t.Run("retrieves existing session", func(t *testing.T) {
		mgr := state.NewManager()
		created := mgr.CreateSession("test-session")

		retrieved := mgr.GetSession("test-session")

		if retrieved == nil {
			t.Errorf("GetSession() should return the session")
		}
		if retrieved != created {
			t.Errorf("Retrieved session should be the same as created")
		}
	})

	t.Run("returns nil for non-existent session", func(t *testing.T) {
		mgr := state.NewManager()
		retrieved := mgr.GetSession("non-existent")

		if retrieved != nil {
			t.Errorf("GetSession() should return nil for non-existent session")
		}
	})
}

func TestManager_DeleteSession(t *testing.T) {
	t.Run("deletes existing session", func(t *testing.T) {
		mgr := state.NewManager()
		mgr.CreateSession("test-session")

		// Verify it exists
		if mgr.GetSession("test-session") == nil {
			t.Errorf("Session should exist before deletion")
		}

		// Delete it
		mgr.DeleteSession("test-session")

		// Verify it's gone
		if mgr.GetSession("test-session") != nil {
			t.Errorf("Session should not exist after deletion")
		}
	})

	t.Run("deleting non-existent session is safe", func(t *testing.T) {
		mgr := state.NewManager()

		// Should not panic
		mgr.DeleteSession("non-existent")
	})
}

func TestManager_UpdateSession(t *testing.T) {
	t.Run("updates existing session", func(t *testing.T) {
		mgr := state.NewManager()
		mgr.CreateSession("test-session")

		err := mgr.UpdateSession("test-session", func(gameState *state.GameState) {
			gameState.Phase = state.PhaseCombat
			gameState.CurrentMapID = "dungeon-1"
		})

		if err != nil {
			t.Errorf("UpdateSession() should not return error: %v", err)
		}

		// Verify updates
		gameState := mgr.GetSession("test-session")
		if gameState.Phase != state.PhaseCombat {
			t.Errorf("Expected phase 'combat', got %s", gameState.Phase)
		}
		if gameState.CurrentMapID != "dungeon-1" {
			t.Errorf("Expected map ID 'dungeon-1', got %s", gameState.CurrentMapID)
		}
	})

	t.Run("returns error for non-existent session", func(t *testing.T) {
		mgr := state.NewManager()
		err := mgr.UpdateSession("non-existent", func(gameState *state.GameState) {
			gameState.Phase = state.PhaseCombat
		})

		if err != state.ErrSessionNotFound {
			t.Errorf("Expected ErrSessionNotFound, got %v", err)
		}
	})

	t.Run("update adds party member", func(t *testing.T) {
		mgr := state.NewManager()
		mgr.CreateSession("test-session")

		err := mgr.UpdateSession("test-session", func(gameState *state.GameState) {
			char := &models.Character{
				ID:    "char-1",
				Name:  "Hero",
				Race:  "Human",
				Class: "Fighter",
				Level: 1,
			}
			gameState.Party = append(gameState.Party, char)
		})

		if err != nil {
			t.Errorf("UpdateSession() error: %v", err)
		}

		gameState := mgr.GetSession("test-session")
		if len(gameState.Party) != 1 {
			t.Errorf("Expected 1 party member, got %d", len(gameState.Party))
		}
	})
}

func TestManager_ListSessions(t *testing.T) {
	t.Run("empty manager returns empty list", func(t *testing.T) {
		mgr := state.NewManager()
		ids := mgr.ListSessions()

		if len(ids) != 0 {
			t.Errorf("Expected empty list, got %d sessions", len(ids))
		}
	})

	t.Run("lists all sessions", func(t *testing.T) {
		mgr := state.NewManager()
		mgr.CreateSession("session-1")
		mgr.CreateSession("session-2")
		mgr.CreateSession("session-3")

		ids := mgr.ListSessions()

		if len(ids) != 3 {
			t.Errorf("Expected 3 sessions, got %d", len(ids))
		}

		// Verify all IDs are present
		idMap := make(map[string]bool)
		for _, id := range ids {
			idMap[id] = true
		}

		if !idMap["session-1"] || !idMap["session-2"] || !idMap["session-3"] {
			t.Errorf("Not all session IDs were returned")
		}
	})
}

func TestManager_Concurrency(t *testing.T) {
	t.Run("concurrent session creation", func(t *testing.T) {
		mgr := state.NewManager()
		var wg sync.WaitGroup
		errors := make(chan error, 100)
		done := make(chan bool, 100)

		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				sessionID := "session-" + strconv.Itoa(n)
				gameState := mgr.CreateSession(sessionID)
				if gameState == nil {
					errors <- &state.StateError{
						Code:    "CREATE_FAILED",
						Message: "Failed to create session",
					}
				} else {
					done <- true
				}
			}(i)
		}

		wg.Wait()
		close(errors)
		close(done)

		// Check for errors
		for err := range errors {
			t.Errorf("Concurrent creation error: %v", err)
		}

		completed := 0
		for range done {
			completed++
		}
		if completed != 100 {
			t.Errorf("Expected 100 completed creations, got %d", completed)
		}
	})

	t.Run("concurrent reads and writes", func(t *testing.T) {
		mgr := state.NewManager()
		mgr.CreateSession("test-session")

		var wg sync.WaitGroup
		reads := 100
		writes := 50

		// Concurrent reads
		for i := 0; i < reads; i++ {
			wg.Add(1)
			go func() {
				defer wg.Done()
				mgr.GetSession("test-session")
			}()
		}

		// Concurrent writes
		for i := 0; i < writes; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				mgr.UpdateSession("test-session", func(gameState *state.GameState) {
					gameState.CurrentMapID = "map-" + strconv.Itoa(n%10)
				})
			}(i)
		}

		wg.Wait()
		// If we get here without deadlock, test passes
	})
}

func TestStateError(t *testing.T) {
	t.Run("Error() returns message field", func(t *testing.T) {
		err := &state.StateError{
			Code:    "TEST_ERROR",
			Message: "something went wrong",
		}

		if err.Error() != "something went wrong" {
			t.Errorf("Error() = %q, want %q", err.Error(), "something went wrong")
		}
		if err.Code != "TEST_ERROR" {
			t.Errorf("Code = %q, want %q", err.Code, "TEST_ERROR")
		}
	})

	t.Run("ErrSessionNotFound sentinel values", func(t *testing.T) {
		if state.ErrSessionNotFound.Code != "SESSION_NOT_FOUND" {
			t.Errorf("Code = %q, want %q", state.ErrSessionNotFound.Code, "SESSION_NOT_FOUND")
		}
		if state.ErrSessionNotFound.Message != "session not found" {
			t.Errorf("Message = %q, want %q", state.ErrSessionNotFound.Message, "session not found")
		}
	})
}

func TestManager_ThreadSafety(t *testing.T) {
	t.Run("safe concurrent access", func(t *testing.T) {
		mgr := state.NewManager()
		var wg sync.WaitGroup

		// Create sessions
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				sessionID := "session-" + strconv.Itoa(n)
				mgr.CreateSession(sessionID)
			}(i)
		}

		// Read sessions
		for i := 0; i < 10; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				sessionID := "session-" + strconv.Itoa(n)
				mgr.GetSession(sessionID)
			}(i)
		}

		wg.Wait()
	})
}
