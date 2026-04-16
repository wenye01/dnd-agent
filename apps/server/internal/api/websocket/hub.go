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

// Persistence defines the interface for persistence operations needed by the Hub.
type Persistence interface {
	SaveState(sessionID string, gs *state.GameState) error
}

// Hub configuration constants.
const (
	unregisterChanSize    = 64
	broadcastChanSize     = 256
	staleCleanupInterval  = 30 * time.Second
	staleClientTimeout     = 2 * time.Minute
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
	persistence  Persistence
	logger       *zerolog.Logger

	mu sync.RWMutex
}

// NewHub creates a new WebSocket hub.
func NewHub(stateManager *state.Manager, sessionMgr *session.Manager, toolRegistry *tools.Registry, persistence Persistence, logger *zerolog.Logger) *Hub {
	return &Hub{
		clients:      make(map[*Client]bool),
		register:     make(chan *Client),
		unregister:   make(chan *Client, unregisterChanSize),
		broadcast:    make(chan []byte, broadcastChanSize),
		stateManager: stateManager,
		sessionMgr:   sessionMgr,
		toolRegistry: toolRegistry,
		persistence:  persistence,
		logger:       logger,
	}
}

// Run starts the hub's main event loop.
func (h *Hub) Run() {
	ticker := time.NewTicker(staleCleanupInterval)
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
		// Note: client.send channel is already closed in ReadPump's defer
		// so we don't close it here to avoid "close of closed channel" panic
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
			// Client buffer full, schedule async unregister.
			// We cannot call unregisterClient here because it acquires a write
			// lock, and we currently hold a read lock. Go's RWMutex does not
			// support lock upgrade, so we send the client to the unregister
			// channel and let Hub.Run() handle it safely.
			select {
			case h.unregister <- client:
			default:
				// unregister channel full — drop silently to avoid blocking
				// the broadcast loop. The periodic cleanup will catch it.
				h.logger.Warn().
					Str("session_id", client.SessionID).
					Msg("unregister channel full during broadcast, client will be cleaned up later")
			}
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
				// Client buffer full, schedule async unregister.
				// Cannot call unregisterClient under RLock — see broadcastMessage.
				select {
				case h.unregister <- client:
				default:
					h.logger.Warn().
						Str("session_id", client.SessionID).
						Msg("unregister channel full in SendToSession, client will be cleaned up later")
				}
			}
		}
	}
}

// SendError sends an error message to a client.
func (h *Hub) SendError(client *Client, errMsg string) {
	message := &models.ServerMessage{
		Type: models.MsgTypeError,
		Payload: map[string]string{
			"code":    "SERVER_ERROR",
			"message": errMsg,
		},
		Timestamp: getCurrentTimestamp(),
	}
	client.SendMessage(message)
}

// cleanupStaleClients removes clients that haven't sent a ping recently.
//
// Design note: we do NOT close client.send here. The channel is closed by
// ReadPump's defer (client.go) which guards against double-close via the
// client.closed flag. Instead we close the underlying WebSocket connection,
// which causes ReadPump to exit and perform its own cleanup (close channel,
// send to unregister channel). We only delete the map entry here to prevent
// the stale client from receiving further broadcasts.
func (h *Hub) cleanupStaleClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	now := time.Now()
	for client := range h.clients {
		if now.Sub(client.LastActivity) > staleClientTimeout {
			h.logger.Info().
				Str("session_id", client.SessionID).
				Msg("removing stale client")
			// Close the underlying connection; ReadPump will detect the error,
			// close the send channel, and send to the unregister channel.
			// Errors from closing an already-closed connection are safe to ignore.
			_ = client.conn.Close()
			delete(h.clients, client)
		}
	}
}

