// Package rest provides REST API handlers for the D&D game server.
package rest

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
)

// Handler manages REST API endpoints.
type Handler struct {
	stateManager StateManager
	persistence  Persistence
	logger       *zerolog.Logger
}

// StateManager defines the interface for state management operations.
type StateManager interface {
	GetSession(sessionID string) interface{}
	CreateSession(sessionID string) interface{}
	DeleteSession(sessionID string)
	ListSessions() []string
}

// Persistence defines the interface for persistence operations.
type Persistence interface {
	CreateSession(sessionID string) error
	DeleteSession(sessionID string) error
	SessionExists(sessionID string) bool
	SaveState(sessionID string, state interface{}) error
	LoadState(sessionID string) (interface{}, error)
	ListSessions() ([]string, error)
}

// NewHandler creates a new REST API handler.
func NewHandler(sm StateManager, p Persistence, logger *zerolog.Logger) *Handler {
	return &Handler{
		stateManager: sm,
		persistence:  p,
		logger:       logger,
	}
}

// Response is a standard API response structure.
type Response struct {
	Status  string      `json:"status"`
	Message string      `json:"message,omitempty"`
	Data    interface{} `json:"data,omitempty"`
	Error   *ErrorInfo  `json:"error,omitempty"`
}

// ErrorInfo represents error details in API responses.
type ErrorInfo struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// success sends a successful response.
func (h *Handler) success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Status: "success",
		Data:   data,
	})
}

// errorResponse sends an error response.
func (h *Handler) errorResponse(c *gin.Context, code int, errCode, message string) {
	c.JSON(code, Response{
		Status: "error",
		Error: &ErrorInfo{
			Code:    errCode,
			Message: message,
		},
	})
}

// badRequest sends a 400 Bad Request response.
func (h *Handler) badRequest(c *gin.Context, message string) {
	h.errorResponse(c, http.StatusBadRequest, "BAD_REQUEST", message)
}

// notFound sends a 404 Not Found response.
func (h *Handler) notFound(c *gin.Context, message string) {
	h.errorResponse(c, http.StatusNotFound, "NOT_FOUND", message)
}

// internalError sends a 500 Internal Server Error response.
func (h *Handler) internalError(c *gin.Context, message string) {
	h.errorResponse(c, http.StatusInternalServerError, "INTERNAL_ERROR", message)
}
