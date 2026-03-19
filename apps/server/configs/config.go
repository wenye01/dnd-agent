// Package configs provides configuration management for the D&D game server.
package configs

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/spf13/viper"
)

// Config holds the complete server configuration.
type Config struct {
	Server      ServerConfig      `mapstructure:"server"`
	Log         LogConfig         `mapstructure:"log"`
	CORS        CORSConfig        `mapstructure:"cors"`
	WebSocket   WebSocketConfig   `mapstructure:"websocket"`
	Game        GameConfig        `mapstructure:"game"`
	LLM         LLMConfig         `mapstructure:"llm"`
	Persistence PersistenceConfig `mapstructure:"persistence"`
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Host         string `mapstructure:"host"`
	Port         int    `mapstructure:"port"`
	ReadTimeout  int    `mapstructure:"read_timeout"`
	WriteTimeout int    `mapstructure:"write_timeout"`
}

// Address returns the formatted server address (host:port).
func (s ServerConfig) Address() string {
	return fmt.Sprintf("%s:%d", s.Host, s.Port)
}

// LogConfig holds logging configuration.
type LogConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
	Output string `mapstructure:"output"`
}

// CORSConfig holds CORS configuration.
type CORSConfig struct {
	AllowedOrigins []string `mapstructure:"allowed_origins"`
	AllowedMethods []string `mapstructure:"allowed_methods"`
	AllowedHeaders []string `mapstructure:"allowed_headers"`
}

// WebSocketConfig holds WebSocket configuration.
type WebSocketConfig struct {
	ReadBufferSize  int `mapstructure:"read_buffer_size"`
	WriteBufferSize int `mapstructure:"write_buffer_size"`
	PingPeriod      int `mapstructure:"ping_period"`
	PongWait        int `mapstructure:"pong_wait"`
}

// GameConfig holds game-specific configuration.
type GameConfig struct {
	MaxPlayersPerRoom int `mapstructure:"max_players_per_room"`
	TurnTimeout       int `mapstructure:"turn_timeout"`
	AutoSaveInterval  int `mapstructure:"auto_save_interval"`
}

// LLMConfig holds LLM provider configuration.
type LLMConfig struct {
	Provider  string          `mapstructure:"provider"`
	OpenAI    OpenAIConfig    `mapstructure:"openai"`
	Anthropic AnthropicConfig `mapstructure:"anthropic"`
}

// OpenAIConfig holds OpenAI-compatible API configuration.
type OpenAIConfig struct {
	APIKey  string `mapstructure:"api_key"`
	BaseURL string `mapstructure:"base_url"`
	Model   string `mapstructure:"model"`
}

// AnthropicConfig holds Anthropic API configuration.
type AnthropicConfig struct {
	APIKey string `mapstructure:"api_key"`
	Model  string `mapstructure:"model"`
}

// PersistenceConfig holds data persistence configuration.
type PersistenceConfig struct {
	DataDir  string `mapstructure:"data_dir"`
	AutoSave bool   `mapstructure:"auto_save"`
}

// Load loads configuration from file and environment variables.
// It searches for config.yaml in the current directory and ./configs/.
// Environment variables override config file values.
func Load() (*Config, error) {
	v := viper.New()

	// Set defaults
	setDefaults(v)

	// Configure file loading
	v.SetConfigName("config")
	v.SetConfigType("yaml")
	v.AddConfigPath(".")
	v.AddConfigPath("./configs")
	v.AddConfigPath("../configs")

	// Enable environment variable override
	v.SetEnvPrefix("DND")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read config file (optional - we have defaults)
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("read config: %w", err)
		}
		// Config file not found, use defaults
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	// Expand environment variables in string values
	expandEnvVars(&cfg)

	return &cfg, nil
}

// LoadFromPath loads configuration from a specific file path.
func LoadFromPath(path string) (*Config, error) {
	v := viper.New()

	setDefaults(v)

	v.SetConfigFile(path)

	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("read config from %s: %w", path, err)
	}

	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshal config: %w", err)
	}

	expandEnvVars(&cfg)

	return &cfg, nil
}

// setDefaults sets default configuration values.
func setDefaults(v *viper.Viper) {
	// Server defaults
	v.SetDefault("server.host", "0.0.0.0")
	v.SetDefault("server.port", 8080)
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)

	// Log defaults
	v.SetDefault("log.level", "debug")
	v.SetDefault("log.format", "json")
	v.SetDefault("log.output", "stdout")

	// CORS defaults
	v.SetDefault("cors.allowed_origins", []string{"http://localhost:5173", "http://localhost:3000"})
	v.SetDefault("cors.allowed_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"})
	v.SetDefault("cors.allowed_headers", []string{"Content-Type", "Authorization"})

	// WebSocket defaults
	v.SetDefault("websocket.read_buffer_size", 1024)
	v.SetDefault("websocket.write_buffer_size", 1024)
	v.SetDefault("websocket.ping_period", 54)
	v.SetDefault("websocket.pong_wait", 60)

	// Game defaults
	v.SetDefault("game.max_players_per_room", 6)
	v.SetDefault("game.turn_timeout", 30000)
	v.SetDefault("game.auto_save_interval", 60000)

	// LLM defaults
	v.SetDefault("llm.provider", "openai")
	v.SetDefault("llm.openai.base_url", "https://api.openai.com/v1")
	v.SetDefault("llm.openai.model", "gpt-4o")

	// Persistence defaults
	v.SetDefault("persistence.data_dir", "./data/sessions")
	v.SetDefault("persistence.auto_save", true)
}

// expandEnvVars expands environment variables in config string values.
// Supports shell-style ${VAR:-default} syntax for defaults.
func expandEnvVars(cfg *Config) {
	cfg.LLM.OpenAI.APIKey = expandShellString(cfg.LLM.OpenAI.APIKey)
	cfg.LLM.OpenAI.BaseURL = expandShellString(cfg.LLM.OpenAI.BaseURL)
	cfg.LLM.OpenAI.Model = expandShellString(cfg.LLM.OpenAI.Model)
	cfg.LLM.Anthropic.APIKey = expandShellString(cfg.LLM.Anthropic.APIKey)
	cfg.Persistence.DataDir = os.ExpandEnv(cfg.Persistence.DataDir)
}

// expandShellString expands environment variables with default value support.
// Supports ${VAR:-default} and ${VAR} syntax.
func expandShellString(s string) string {
	// First handle ${VAR:-default} syntax before os.ExpandEnv
	// because os.ExpandEnv doesn't support defaults
	re := regexp.MustCompile(`\$\{([^:}]+):-([^}]*)\}`)

	// Use ReplaceAllStringFunc to replace all matches in a single pass
	result := re.ReplaceAllStringFunc(s, func(match string) string {
		// Extract variable name and default value from the match
		submatches := re.FindStringSubmatch(match)
		if len(submatches) >= 3 {
			varName := submatches[1]
			defaultVal := submatches[2]
			if envVal := os.Getenv(varName); envVal != "" {
				return envVal
			}
			return defaultVal
		}
		return match
	})

	// Then handle simple ${VAR} syntax
	result = os.ExpandEnv(result)

	return result
}
