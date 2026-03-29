package rest

import (
	"net/http"
	"time"

	"github.com/dnd-game/server/internal/server/character"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/gin-gonic/gin"
)

// Broadcaster defines the interface for broadcasting messages to WebSocket clients.
// The Hub implements this interface to send state updates to connected clients.
type Broadcaster interface {
	// SendToSession sends a message to all WebSocket clients in a session.
	SendToSession(sessionID string, message *models.ServerMessage)
}

// CharacterStateManager extends StateManager with game state access for character operations.
type CharacterStateManager interface {
	StateManager
	GetGameState(sessionID string) *state.GameState
	// UpdateGameState atomically updates a game session state under a write lock.
	UpdateGameState(sessionID string, updateFn func(*state.GameState)) error
}

// CreateCharacterRequest represents the request body for creating a character.
type CreateCharacterRequest struct {
	Name          string         `json:"name" binding:"required"`
	Race          string         `json:"race" binding:"required"`
	Class         string         `json:"class" binding:"required"`
	Background    string         `json:"background" binding:"required"`
	AbilityScores map[string]int `json:"abilityScores" binding:"required"`
}

// RegisterCharacterRoutes registers character-related REST API routes.
func RegisterCharacterRoutes(api *gin.RouterGroup, sm CharacterStateManager, b Broadcaster, h *Handler) {
	characters := api.Group("/characters")
	{
		characters.POST("", h.createCharacter(sm, b))
		characters.GET("/:id", h.getCharacter(sm))
		characters.GET("", h.listCharacters(sm))
		characters.DELETE("/:id", h.deleteCharacter(sm, b))
	}
}

// broadcastPartyUpdate sends a state_update message with the current party to all
// WebSocket clients in the session. This is called after party-changing operations
// (character create, delete) so the frontend stays in sync.
func broadcastPartyUpdate(b Broadcaster, sm CharacterStateManager, sessionID string) {
	if b == nil {
		return
	}
	gs := sm.GetGameState(sessionID)
	if gs == nil {
		return
	}
	b.SendToSession(sessionID, &models.ServerMessage{
		Type: models.MsgTypeStateUpdate,
		Payload: map[string]interface{}{
			"stateType": "party",
			"data":      gs.Party,
		},
		Timestamp: time.Now().Unix(),
	})
}

// createCharacter handles POST /api/characters
func (h *Handler) createCharacter(sm CharacterStateManager, b Broadcaster) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req CreateCharacterRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			h.badRequest(c, "invalid request body: "+err.Error())
			return
		}

		params := character.CreateParams{
			Name:          req.Name,
			Race:          req.Race,
			Class:         req.Class,
			Background:    req.Background,
			AbilityScores: req.AbilityScores,
		}

		char, err := character.CreateBasic(params)
		if err != nil {
			h.badRequest(c, "character creation failed: "+err.Error())
			return
		}

		sessionID := c.Query("sessionId")
		if sessionID == "" {
			sessionID = c.GetHeader("X-Session-ID")
		}

		if sessionID == "" {
			h.badRequest(c, "sessionId query parameter or X-Session-ID header required")
			return
		}

		err = sm.UpdateGameState(sessionID, func(gs *state.GameState) {
			gs.Party = append(gs.Party, char)
		})
		if err != nil {
			h.badRequest(c, "session not found: "+err.Error())
			return
		}

		// Broadcast party update to WebSocket clients
		broadcastPartyUpdate(b, sm, sessionID)

		c.JSON(http.StatusCreated, Response{
			Status: "success",
			Data:   char,
		})
	}
}

// getCharacter handles GET /api/characters/:id
func (h *Handler) getCharacter(sm CharacterStateManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		charID := c.Param("id")
		sessionID := c.Query("sessionId")
		if sessionID == "" {
			sessionID = c.GetHeader("X-Session-ID")
		}

		if sessionID == "" {
			h.badRequest(c, "sessionId query parameter or X-Session-ID header required")
			return
		}

		gameState := sm.GetGameState(sessionID)
		if gameState == nil {
			h.notFound(c, "session not found")
			return
		}

		for _, char := range gameState.Party {
			if char.ID == charID {
				h.success(c, char)
				return
			}
		}

		h.notFound(c, "character not found")
	}
}

// listCharacters handles GET /api/characters
func (h *Handler) listCharacters(sm CharacterStateManager) gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID := c.Query("sessionId")
		if sessionID == "" {
			sessionID = c.GetHeader("X-Session-ID")
		}

		if sessionID == "" {
			h.badRequest(c, "sessionId query parameter or X-Session-ID header required")
			return
		}

		gameState := sm.GetGameState(sessionID)
		if gameState == nil {
			h.notFound(c, "session not found")
			return
		}

		h.success(c, gin.H{
			"characters": gameState.Party,
			"count":      len(gameState.Party),
		})
	}
}

// deleteCharacter handles DELETE /api/characters/:id
func (h *Handler) deleteCharacter(sm CharacterStateManager, b Broadcaster) gin.HandlerFunc {
	return func(c *gin.Context) {
		charID := c.Param("id")
		sessionID := c.Query("sessionId")
		if sessionID == "" {
			sessionID = c.GetHeader("X-Session-ID")
		}

		if sessionID == "" {
			h.badRequest(c, "sessionId query parameter or X-Session-ID header required")
			return
		}

		var found bool
		err := sm.UpdateGameState(sessionID, func(gs *state.GameState) {
			for i, char := range gs.Party {
				if char.ID == charID {
					gs.Party = append(gs.Party[:i], gs.Party[i+1:]...)
					found = true
					return
				}
			}
		})
		if err != nil {
			h.notFound(c, "session not found")
			return
		}
		if !found {
			h.notFound(c, "character not found")
			return
		}

		// Broadcast party update to WebSocket clients
		broadcastPartyUpdate(b, sm, sessionID)

		h.success(c, gin.H{
			"characterId": charID,
			"deleted":     true,
		})
	}
}
