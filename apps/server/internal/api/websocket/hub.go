// Package websocket implements WebSocket connections for the D&D game server.
package websocket

import (
	"sync"
	"time"

	"github.com/dnd-game/server/internal/client/session"
	"github.com/dnd-game/server/internal/client/tools"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/rs/zerolog"
)

// Hub manages active WebSocket connections and broadcasts messages.
type Hub struct {
	clients    map[*Client]bool
	register   chan *Client
	unregister chan *Client
	broadcast  chan []byte

	stateManager *state.Manager
	sessionMgr   *session.Manager
	toolRegistry *tools.Registry
	logger       *zerolog.Logger

	mu sync.RWMutex
}

// NewHub creates a new WebSocket hub.
func NewHub(stateManager *state.Manager, sessionMgr *session.Manager, toolRegistry *tools.Registry, logger *zerolog.Logger) *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		broadcast:    make(chan []byte, 256),
		stateManager: stateManager,
		sessionMgr:   sessionMgr,
		toolRegistry: toolRegistry,
		logger:       logger,
	}
}

// Run starts the hub's main event loop.
func (h *Hub) Run() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case client := <-h.register:
			h.registerClient(client)

		case client := <-h.unregister:
			h.unregisterClient(client)

		case message := <-h.broadcast:
			h.broadcastMessage(message)

		case <-ticker.C:
			// Periodic cleanup of stale clients
			h.cleanupStaleClients()
		}
	}
}

// registerClient adds a new client to the hub.
func (h *Hub) registerClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	h.clients[client] = true
	h.logger.Info().
		Str("session_id", client.SessionID).
		Msg("client connected")

	// Initialize session with system prompt
	h.sessionMgr.SetSystemMessage(client.SessionID, session.DefaultDMSystemPrompt)
}

// unregisterClient removes a client from the hub.
func (h *Hub) unregisterClient(client *Client) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if _, ok := h.clients[client]; ok {
		delete(h.clients, client)
		close(client.send)
		h.logger.Info().
			Str("session_id", client.SessionID).
			Msg("client disconnected")
	}
}

// broadcastMessage sends a message to all connected clients.
func (h *Hub) broadcastMessage(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			// Client buffer full, close connection
			h.unregisterClient(client)
		}
	}
}

// SendToSession sends a message to all clients in a session.
func (h *Hub) SendToSession(sessionID string, message *models.ServerMessage) {
	data, err := models.EncodeServerMessage(message)
	if err != nil {
		h.logger.Error().Err(err).Str("session_id", sessionID).Msg("encode message")
		return
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		if client.SessionID == sessionID {
			select {
			case client.send <- data:
			default:
				h.unregisterClient(client)
			}
		}
	}
}

// SendError sends an error message to a client.
func (h *Hub) SendError(client *Client, errMsg string) {
	message := &models.ServerMessage{
		Type:      models.MsgTypeError,
		Payload:   map[string]string{"error": errMsg},
		Timestamp: time.Now().Unix(),
	}
	client.SendMessage(message)
}

// cleanupStaleClients removes clients that haven't sent a ping recently.
func (h *Hub) cleanupStaleClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	for client := range h.clients {
		if now.Sub(client.LastActivity) > 2*time.Minute {
			h.logger.Info().
				Str("session_id", client.SessionID).
				Msg("removing stale client")
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// GetClientCount returns the number of connected clients.
func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}
