// Package maps provides map data loading and querying.
package maps

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/dnd-game/server/internal/shared/models"
)

// LoadMap loads a map definition from a JSON file.
func LoadMap(path string) (*models.GameMap, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read map file: %w", err)
	}

	var gameMap models.GameMap
	if err := json.Unmarshal(data, &gameMap); err != nil {
		return nil, fmt.Errorf("parse map JSON: %w", err)
	}

	return &gameMap, nil
}

// LoadMapsFromDir loads all map definitions from a directory.
// Only files with .json extension are loaded.
func LoadMapsFromDir(dir string) (map[string]*models.GameMap, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read maps directory: %w", err)
	}

	maps := make(map[string]*models.GameMap)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		path := filepath.Join(dir, entry.Name())
		gameMap, err := LoadMap(path)
		if err != nil {
			return nil, fmt.Errorf("load map %s: %w", entry.Name(), err)
		}

		maps[gameMap.ID] = gameMap
	}

	return maps, nil
}
