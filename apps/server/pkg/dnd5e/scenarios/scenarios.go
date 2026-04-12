// Package scenarios provides scenario data loading and querying.
package scenarios

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/dnd-game/server/internal/shared/models"
)

// LoadScenario loads a scenario definition from a JSON file.
func LoadScenario(path string) (*models.Scenario, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read scenario file: %w", err)
	}

	var scenario models.Scenario
	if err := json.Unmarshal(data, &scenario); err != nil {
		return nil, fmt.Errorf("parse scenario JSON: %w", err)
	}

	return &scenario, nil
}

// LoadScenariosFromDir loads all scenario definitions from a directory.
// Only files with .json extension are loaded.
func LoadScenariosFromDir(dir string) (map[string]*models.Scenario, error) {
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("read scenarios directory: %w", err)
	}

	scenarios := make(map[string]*models.Scenario)
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}

		path := filepath.Join(dir, entry.Name())
		scenario, err := LoadScenario(path)
		if err != nil {
			return nil, fmt.Errorf("load scenario %s: %w", entry.Name(), err)
		}

		scenarios[scenario.ID] = scenario
	}

	return scenarios, nil
}
