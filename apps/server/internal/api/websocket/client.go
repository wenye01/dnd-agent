// Package websocket implements WebSocket connections for the D&D game server.
package websocket

import (
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/gorilla/websocket"
	"github.com/rs/zerolog"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period.
	pingPeriod = 54 * time.Second

	// Maximum message size allowed from peer.
	maxMessageSize = 512 * 1024
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		// Allow localhost and 127.0.0.1 for development
		if origin == "" {
			return true // Same-origin requests have no Origin header
		}
		// Check for localhost with any port
		if strings.HasPrefix(origin, "http://localhost:") ||
			strings.HasPrefix(origin, "http://127.0.0.1:") ||
			strings.HasPrefix(origin, "https://localhost:") ||
			strings.HasPrefix(origin, "https://127.0.0.1:") {
			return true
		}
		// Log warning for non-allowed origins
		// In production, configure this properly based on environment
		return false
	},
}

// Client represents a WebSocket client connection.
type Client struct {
	hub       *Hub
	conn      *websocket.Conn
	send      chan []byte
	SessionID string
	closed    bool // Track if client is closed

	// Last activity timestamp for cleanup
	LastActivity time.Time
	mu           sync.Mutex
	logger       *zerolog.Logger
}

// NewClient creates a new WebSocket client.
func NewClient(hub *Hub, conn *websocket.Conn, sessionID string, logger *zerolog.Logger) *Client {
	return &Client{
		hub:          hub,
		conn:         conn,
		send:         make(chan []byte, 256),
		SessionID:    sessionID,
		LastActivity: time.Now(),
		logger:       logger,
	}
}

// ReadPump pumps messages from the WebSocket connection to the hub.
func (c *Client) ReadPump() {
	defer func() {
		c.mu.Lock()
		c.closed = true
		close(c.send)
		c.mu.Unlock()
		// Use non-blocking send to avoid goroutine leak if Hub.Run() has
		// already stopped and is no longer draining the unregister channel.
		select {
		case c.hub.unregister <- c:
		default:
		}
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		c.updateActivity()
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				c.logger.Error().Err(err).Str("session_id", c.SessionID).Msg("read error")
			}
			break
		}

		c.updateActivity()
		c.hub.HandleMessage(c, message)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// SendMessage sends a server message to this client.
func (c *Client) SendMessage(message *models.ServerMessage) {
	c.mu.Lock()
	if c.closed {
		c.mu.Unlock()
		return
	}
	c.mu.Unlock()

	data, err := models.EncodeServerMessage(message)
	if err != nil {
		c.logger.Error().Err(err).Str("session_id", c.SessionID).Msg("encode message")
		return
	}

	select {
	case c.send <- data:
	default:
		// Channel full, client might be slow or disconnected
		c.logger.Warn().Str("session_id", c.SessionID).Msg("client send channel full")
	}
}

// updateActivity updates the last activity timestamp.
func (c *Client) updateActivity() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.LastActivity = time.Now()
}
