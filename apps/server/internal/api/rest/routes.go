// Package rest provides REST API handlers for the D&D game server.
package rest

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// RegisterRoutes registers all REST API routes.
func RegisterRoutes(router *gin.Engine, sm StateManager, p Persistence, logger *zerolog.Logger) {
	handler := NewHandler(sm, p, logger)

	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", handler.handleHealth)

		// Session management
		sessions := api.Group("/sessions")
		{
			sessions.POST("", handler.createSession)
			sessions.GET("/:id", handler.getSession)
			sessions.DELETE("/:id", handler.deleteSession)
			sessions.GET("", handler.listSessions)
		}

		// Configuration
		api.GET("/config", handler.getConfig)
	}
}

// RegisterRoutesWithCharacters registers all REST API routes including character management.
// The CharacterStateManager parameter provides access to game state for character operations.
// The Broadcaster parameter (optional, may be nil) enables WebSocket broadcast of state changes.
func RegisterRoutesWithCharacters(router *gin.Engine, sm CharacterStateManager, b Broadcaster, p Persistence, logger *zerolog.Logger) {
	handler := NewHandler(sm, p, logger)

	api := router.Group("/api")
	{
		// Health check
		api.GET("/health", handler.handleHealth)

		// Session management
		sessions := api.Group("/sessions")
		{
			sessions.POST("", handler.createSession)
			sessions.GET("/:id", handler.getSession)
			sessions.DELETE("/:id", handler.deleteSession)
			sessions.GET("", handler.listSessions)
		}

		// Character management
		RegisterCharacterRoutes(api, sm, b, handler)

		// Configuration
		api.GET("/config", handler.getConfig)
	}
}

// handleHealth responds to health check requests.
func (h *Handler) handleHealth(c *gin.Context) {
	h.success(c, gin.H{
		"status":  "ok",
		"service": "dnd-game-server",
	})
}

// createSession creates a new game session.
func (h *Handler) createSession(c *gin.Context) {
	var req struct {
		SessionID string `json:"sessionId,omitempty"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		// No body is ok, we'll generate an ID
	}

	sessionID := req.SessionID
	if sessionID == "" {
		sessionID = generateSessionID()
	}

	// Create session in persistence first (creates directory)
	// This will return an error if the session already exists, making the check-then-create atomic
	if err := h.persistence.CreateSession(sessionID); err != nil {
		if os.IsExist(err) {
			h.badRequest(c, "session already exists")
			return
		}
		h.logger.Error().Err(err).Str("session_id", sessionID).Msg("create session in persistence")
		h.internalError(c, "failed to create session")
		return
	}

	// Create session in state manager (this will save the initial state)
	h.stateManager.CreateSession(sessionID)

	h.logger.Info().Str("session_id", sessionID).Msg("session created")

	c.JSON(http.StatusCreated, Response{
		Status: "success",
		Data: gin.H{
			"sessionId": sessionID,
		},
	})
}

// getSession retrieves a session by ID.
func (h *Handler) getSession(c *gin.Context) {
	sessionID := c.Param("id")

	// Load from persistence
	state, err := h.persistence.LoadState(sessionID)
	if err != nil {
		h.notFound(c, "session not found")
		return
	}

	h.success(c, state)
}

// deleteSession deletes a session.
func (h *Handler) deleteSession(c *gin.Context) {
	sessionID := c.Param("id")

	// Check if session exists
	if !h.persistence.SessionExists(sessionID) {
		h.notFound(c, "session not found")
		return
	}

	// Delete from state manager
	h.stateManager.DeleteSession(sessionID)

	// Delete from persistence
	if err := h.persistence.DeleteSession(sessionID); err != nil {
		h.logger.Error().Err(err).Str("session_id", sessionID).Msg("delete session from persistence")
		h.internalError(c, "failed to delete session")
		return
	}

	h.logger.Info().Str("session_id", sessionID).Msg("session deleted")

	h.success(c, gin.H{
		"sessionId": sessionID,
		"deleted":   true,
	})
}

// listSessions lists all active sessions.
func (h *Handler) listSessions(c *gin.Context) {
	sessions, err := h.persistence.ListSessions()
	if err != nil {
		h.internalError(c, "failed to list sessions")
		return
	}

	h.success(c, gin.H{
		"sessions": sessions,
		"count":    len(sessions),
	})
}

// getConfig returns the server configuration (sanitized).
func (h *Handler) getConfig(c *gin.Context) {
	// Return a sanitized config (no API keys)
	h.success(c, gin.H{
		"features": []string{
			"websocket",
			"rest_api",
			"llm_integration",
			"dice_rolling",
			"persistence",
		},
	})
}

// generateSessionID generates a new session ID using UUID.
func generateSessionID() string {
	return "sess_" + uuid.New().String()
}
