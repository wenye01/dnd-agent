// Package websocket implements WebSocket connections for the D&D game server.
package websocket

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/rs/zerolog"
)

// ServeWS handles WebSocket connection requests.
func ServeWS(hub *Hub, w http.ResponseWriter, r *http.Request, logger *zerolog.Logger) {
	// Extract session ID from query param or generate new one
	sessionID := r.URL.Query().Get("session_id")
	if sessionID == "" {
		sessionID = uuid.New().String()
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logger.Error().Err(err).Msg("websocket upgrade failed")
		return
	}

	// Create client and start pumps
	client := NewClient(hub, conn, sessionID, logger)
	hub.register <- client

	go client.WritePump()
	go client.ReadPump()
}
