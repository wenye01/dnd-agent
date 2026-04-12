package maps

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

func TestLoadMap(t *testing.T) {
	tmpDir := t.TempDir()
	gameMap := models.GameMap{
		ID:          "test_map",
		Name:        "Test Map",
		Description: "A test map",
		Width:       10,
		Height:      8,
		GridType:    "square",
		Entrances: []models.Entrance{
			{ID: "main", Position: models.Position{X: 5, Y: 7}, Direction: "south"},
		},
	}
	data, _ := json.Marshal(gameMap)
	path := filepath.Join(tmpDir, "test.json")
	os.WriteFile(path, data, 0644)

	result, err := LoadMap(path)
	if err != nil {
		t.Fatalf("LoadMap failed: %v", err)
	}
	if result.ID != "test_map" {
		t.Errorf("expected test_map, got %s", result.ID)
	}
	if result.Width != 10 || result.Height != 8 {
		t.Errorf("expected 10x8, got %dx%d", result.Width, result.Height)
	}
}

func TestLoadMap_FileNotFound(t *testing.T) {
	_, err := LoadMap("nonexistent.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestLoadMap_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "bad.json")
	os.WriteFile(path, []byte("not json"), 0644)

	_, err := LoadMap(path)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestLoadMapsFromDir(t *testing.T) {
	tmpDir := t.TempDir()

	// Create two map files
	for _, id := range []string{"map_a", "map_b"} {
		gameMap := models.GameMap{ID: id, Name: id, Width: 5, Height: 5, GridType: "square"}
		data, _ := json.Marshal(gameMap)
		os.WriteFile(filepath.Join(tmpDir, id+".json"), data, 0644)
	}

	// Create a non-JSON file that should be skipped
	os.WriteFile(filepath.Join(tmpDir, "readme.txt"), []byte("skip me"), 0644)

	result, err := LoadMapsFromDir(tmpDir)
	if err != nil {
		t.Fatalf("LoadMapsFromDir failed: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 maps, got %d", len(result))
	}
	if _, ok := result["map_a"]; !ok {
		t.Error("map_a not found")
	}
	if _, ok := result["map_b"]; !ok {
		t.Error("map_b not found")
	}
}

func TestLoadRealMapData(t *testing.T) {
	path := filepath.Join("data", "tavern.json")
	result, err := LoadMap(path)
	if err != nil {
		t.Skipf("skipping: tavern map not found at %s", path)
	}
	if result.ID != "tavern" {
		t.Errorf("expected tavern, got %s", result.ID)
	}
	if result.Name == "" {
		t.Error("expected non-empty name")
	}
	if len(result.Objects) == 0 {
		t.Error("expected at least one map object")
	}
	if len(result.Entrances) == 0 {
		t.Error("expected at least one entrance")
	}
}
