package state

import (
	"strconv"
	"sync"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

func TestNewManager(t *testing.T) {
	t.Run("creates new manager", func(t *testing.T) {
		mgr := NewManager()

		if mgr == nil {
			t.Errorf("NewManager() should return non-nil")
		}
		if mgr.sessions == nil {
			t.Errorf("Sessions map should be initialized")
		}
	})

	t.Run("multiple managers are independent", func(t *testing.T) {
		mgr1 := NewManager()
		mgr2 := NewManager()

		if mgr1 == mgr2 {
			t.Errorf("NewManager() should return new instances")
		}
	})
}

func TestManager_CreateSession(t *testing.T) {
	t.Run("creates new session", func(t *testing.T) {
		mgr := NewManager()
		state := mgr.CreateSession("test-session")

		if state == nil {
			t.Errorf("CreateSession() should return non-nil")
		}
		if state.SessionID != "test-session" {
			t.Errorf("Expected session ID 'test-session', got %s", state.SessionID)
		}

		// Verify it's stored
		retrieved := mgr.GetSession("test-session")
		if retrieved != state {
			t.Errorf("Retrieved session should match created session")
		}
	})

	t.Run("returns existing session if already exists", func(t *testing.T) {
		mgr := NewManager()
		state1 := mgr.CreateSession("test-session")

		// Create a character to verify we get the same session
		state1.Party = append(state1.Party, &models.Character{
			ID:   "char-1",
			Name: "Test Character",
		})

		// Create session again with same ID
		state2 := mgr.CreateSession("test-session")

		if state1 != state2 {
			t.Errorf("Should return existing session")
		}
		if len(state2.Party) != 1 {
			t.Errorf("Existing session should preserve its state")
		}
	})
}

func TestManager_GetSession(t *testing.T) {
	t.Run("retrieves existing session", func(t *testing.T) {
		mgr := NewManager()
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
		mgr := NewManager()
		retrieved := mgr.GetSession("non-existent")

		if retrieved != nil {
			t.Errorf("GetSession() should return nil for non-existent session")
		}
	})
}

func TestManager_DeleteSession(t *testing.T) {
	t.Run("deletes existing session", func(t *testing.T) {
		mgr := NewManager()
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
		mgr := NewManager()

		// Should not panic
		mgr.DeleteSession("non-existent")
	})
}

func TestManager_UpdateSession(t *testing.T) {
	t.Run("updates existing session", func(t *testing.T) {
		mgr := NewManager()
		mgr.CreateSession("test-session")

		err := mgr.UpdateSession("test-session", func(state *GameState) {
			state.Phase = PhaseCombat
			state.CurrentMapID = "dungeon-1"
		})

		if err != nil {
			t.Errorf("UpdateSession() should not return error: %v", err)
		}

		// Verify updates
		state := mgr.GetSession("test-session")
		if state.Phase != PhaseCombat {
			t.Errorf("Expected phase 'combat', got %s", state.Phase)
		}
		if state.CurrentMapID != "dungeon-1" {
			t.Errorf("Expected map ID 'dungeon-1', got %s", state.CurrentMapID)
		}
	})

	t.Run("returns error for non-existent session", func(t *testing.T) {
		mgr := NewManager()
		err := mgr.UpdateSession("non-existent", func(state *GameState) {
			state.Phase = PhaseCombat
		})

		if err != ErrSessionNotFound {
			t.Errorf("Expected ErrSessionNotFound, got %v", err)
		}
	})

	t.Run("update adds party member", func(t *testing.T) {
		mgr := NewManager()
		mgr.CreateSession("test-session")

		err := mgr.UpdateSession("test-session", func(state *GameState) {
			char := &models.Character{
				ID:    "char-1",
				Name:  "Hero",
				Race:  "Human",
				Class: "Fighter",
				Level: 1,
			}
			state.Party = append(state.Party, char)
		})

		if err != nil {
			t.Errorf("UpdateSession() error: %v", err)
		}

		state := mgr.GetSession("test-session")
		if len(state.Party) != 1 {
			t.Errorf("Expected 1 party member, got %d", len(state.Party))
		}
	})
}

func TestManager_UpdateSessionInterface(t *testing.T) {
	t.Run("updates with interface function", func(t *testing.T) {
		mgr := NewManager()
		mgr.CreateSession("test-session")

		err := mgr.UpdateSessionInterface("test-session", func(state interface{}) {
			gs, ok := state.(*GameState)
			if !ok {
				t.Errorf("Expected *GameState")
				return
			}
			gs.Phase = PhaseDialog
		})

		if err != nil {
			t.Errorf("UpdateSessionInterface() error: %v", err)
		}

		state := mgr.GetSession("test-session")
		if state.Phase != PhaseDialog {
			t.Errorf("Expected phase 'dialog', got %s", state.Phase)
		}
	})

	t.Run("returns error for non-existent session", func(t *testing.T) {
		mgr := NewManager()
		err := mgr.UpdateSessionInterface("non-existent", func(state interface{}) {
			// This should not be called
		})

		if err != ErrSessionNotFound {
			t.Errorf("Expected ErrSessionNotFound, got %v", err)
		}
	})
}

func TestManager_ListSessions(t *testing.T) {
	t.Run("empty manager returns empty list", func(t *testing.T) {
		mgr := NewManager()
		ids := mgr.ListSessions()

		if len(ids) != 0 {
			t.Errorf("Expected empty list, got %d sessions", len(ids))
		}
	})

	t.Run("lists all sessions", func(t *testing.T) {
		mgr := NewManager()
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
		mgr := NewManager()
		var wg sync.WaitGroup
		errors := make(chan error, 100)
		done := make(chan bool, 100)

		for i := 0; i < 100; i++ {
			wg.Add(1)
			go func(n int) {
				defer wg.Done()
				sessionID := "session-" + strconv.Itoa(n)
				state := mgr.CreateSession(sessionID)
				if state == nil {
					errors <- &StateError{
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
		for _ = range done {
			completed++
		}
		if completed != 100 {
			t.Errorf("Expected 100 completed creations, got %d", completed)
		}
	})

	t.Run("concurrent reads and writes", func(t *testing.T) {
		mgr := NewManager()
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
				mgr.UpdateSession("test-session", func(state *GameState) {
					state.CurrentMapID = "map-" + strconv.Itoa(n%10)
				})
			}(i)
		}

		wg.Wait()
		// If we get here without deadlock, test passes
	})
}

func TestManager_ThreadSafety(t *testing.T) {
	t.Run("safe concurrent access", func(t *testing.T) {
		mgr := NewManager()
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
