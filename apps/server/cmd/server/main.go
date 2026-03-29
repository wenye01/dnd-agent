// Package main is the entry point for the D&D game server
package main

import (
	"context"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/dnd-game/server/configs"
	"github.com/dnd-game/server/internal/api/rest"
	"github.com/dnd-game/server/internal/api/websocket"
	"github.com/dnd-game/server/internal/client/llm"
	"github.com/dnd-game/server/internal/client/session"
	"github.com/dnd-game/server/internal/client/tools"
	"github.com/dnd-game/server/internal/persistence"
	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/state"
	"github.com/gin-gonic/gin"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

func main() {
	// Load configuration
	cfg, err := configs.Load()
	if err != nil {
		log.Fatal().Err(err).Msg("failed to load config")
	}

	// Initialize logger
	setupLogger(cfg)
	log.Info().Msg("D&D Game Server starting...")

	// Create state manager
	stateManager := state.NewManager()

	// Create persistence manager
	persistenceManager, err := persistence.NewManager(cfg.Persistence.DataDir)
	if err != nil {
		log.Fatal().Err(err).Msg("failed to create persistence manager")
	}

	// Create LLM provider
	llmProvider := createLLMProvider(cfg)
	log.Info().Str("model", llmProvider.GetModel()).Msg("LLM provider initialized")

	// Create session manager
	sessionManager := session.NewManager(llmProvider)

	// Create dice service
	diceService := dice.NewService()

	// Create tool registry
	toolRegistry := tools.NewRegistry()
	tools.RegisterDiceTools(toolRegistry, diceService)
	log.Info().Int("tools", len(toolRegistry.List())).Msg("tools registered")

	// Create WebSocket hub
	logger := &log.Logger
	wsHub := websocket.NewHub(stateManager, sessionManager, toolRegistry, logger)
	go wsHub.Run()

	// Setup HTTP server
	router := setupRouter(cfg, wsHub, stateManager, persistenceManager)

	// Start server
	srv := &http.Server{
		Addr:         cfg.Server.Address(),
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeout) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeout) * time.Second,
	}

	// Graceful shutdown handling
	serverWg := sync.WaitGroup{}
	serverWg.Add(1)

	go func() {
		defer serverWg.Done()
		log.Info().Str("addr", srv.Addr).Msg("server listening")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Error().Err(err).Msg("server failed")
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Info().Msg("shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Error().Err(err).Msg("server forced to shutdown")
	}

	// Wait for server goroutine to finish
	serverWg.Wait()

	log.Info().Msg("server exited")
}

// setupLogger configures the global logger based on config.
func setupLogger(cfg *configs.Config) {
	// Set log level
	switch cfg.Log.Level {
	case "debug":
		zerolog.SetGlobalLevel(zerolog.DebugLevel)
	case "info":
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	case "warn":
		zerolog.SetGlobalLevel(zerolog.WarnLevel)
	case "error":
		zerolog.SetGlobalLevel(zerolog.ErrorLevel)
	default:
		zerolog.SetGlobalLevel(zerolog.InfoLevel)
	}

	// Set time format
	zerolog.TimeFieldFormat = time.RFC3339

	// Configure output
	if cfg.Log.Format == "console" {
		log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stdout, TimeFormat: "15:04:05"})
	}
}

// createLLMProvider creates the LLM provider based on configuration.
func createLLMProvider(cfg *configs.Config) llm.Provider {
	switch cfg.LLM.Provider {
	case "openai":
		// Use GLMProvider for OpenAI-compatible APIs (including GLM)
		// GLM-4.7-Flash returns content in reasoning_content field
		return llm.NewGLMProvider(&llm.GLMConfig{
			APIKey:  cfg.LLM.OpenAI.APIKey,
			BaseURL: cfg.LLM.OpenAI.BaseURL,
			Model:   cfg.LLM.OpenAI.Model,
		})
	case "glm":
		return llm.NewGLMProvider(&llm.GLMConfig{
			APIKey:  cfg.LLM.OpenAI.APIKey,
			BaseURL: cfg.LLM.OpenAI.BaseURL,
			Model:   cfg.LLM.OpenAI.Model,
		})
	default:
		return llm.NewGLMProvider(&llm.GLMConfig{
			APIKey:  cfg.LLM.OpenAI.APIKey,
			BaseURL: cfg.LLM.OpenAI.BaseURL,
			Model:   cfg.LLM.OpenAI.Model,
		})
	}
}

// setupRouter configures the Gin router with all routes.
func setupRouter(cfg *configs.Config, wsHub *websocket.Hub, sm *state.Manager, pm *persistence.Manager) *gin.Engine {
	// Set Gin mode
	if cfg.Log.Level != "debug" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(loggerMiddleware())
	router.Use(corsMiddleware(cfg))

	// Register REST API routes (including character management)
	logger := &log.Logger
	rest.RegisterRoutesWithCharacters(router, &stateAdapter{sm, pm, logger}, &persistenceAdapter{pm}, logger)

	// Register WebSocket route
	router.GET("/ws", func(c *gin.Context) {
		websocket.ServeWS(wsHub, c.Writer, c.Request, logger)
	})

	return router
}

// stateAdapter adapts *state.Manager to rest.StateManager interface.
type stateAdapter struct {
	*state.Manager
	persistence *persistence.Manager
	logger      *zerolog.Logger
}

func (a *stateAdapter) CreateSession(sessionID string) interface{} {
	gs := a.Manager.CreateSession(sessionID)
	// Save the initial state to persistence
	if err := a.persistence.SaveState(sessionID, gs); err != nil {
		a.logger.Error().Err(err).Str("session_id", sessionID).Msg("failed to save initial state")
	}
	return gs
}

func (a *stateAdapter) GetSession(sessionID string) interface{} {
	return a.Manager.GetSession(sessionID)
}

func (a *stateAdapter) GetGameState(sessionID string) *state.GameState {
	return a.Manager.GetSession(sessionID)
}

func (a *stateAdapter) UpdateGameState(sessionID string, updateFn func(*state.GameState)) error {
	return a.Manager.UpdateSession(sessionID, updateFn)
}

// persistenceAdapter adapts *persistence.Manager to rest.Persistence interface.
type persistenceAdapter struct {
	*persistence.Manager
}

func (a *persistenceAdapter) SaveState(sessionID string, st interface{}) error {
	gs, ok := st.(*state.GameState)
	if !ok {
		return &persistence.AdapterError{Message: "invalid state type"}
	}
	return a.Manager.SaveState(sessionID, gs)
}

func (a *persistenceAdapter) LoadState(sessionID string) (interface{}, error) {
	return a.Manager.LoadState(sessionID)
}

// loggerMiddleware is a Gin middleware for request logging.
func loggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		end := time.Now()
		latency := end.Sub(start)

		log.Info().
			Str("method", c.Request.Method).
			Str("path", path).
			Str("query", query).
			Int("status", c.Writer.Status()).
			Dur("latency", latency).
			Str("ip", c.ClientIP()).
			Msg("HTTP request")
	}
}

// corsMiddleware adds CORS headers to responses.
func corsMiddleware(cfg *configs.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")

		// Check if origin is allowed
		allowed := false
		for _, allowedOrigin := range cfg.CORS.AllowedOrigins {
			if allowedOrigin == "*" || allowedOrigin == origin {
				allowed = true
				break
			}
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
