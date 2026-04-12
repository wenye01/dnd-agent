package scenarios

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"

	"github.com/dnd-game/server/internal/shared/models"
)

func TestLoadScenario(t *testing.T) {
	tmpDir := t.TempDir()
	scenario := models.Scenario{
		ID:          "test_scenario",
		Name:        "Test Scenario",
		Description: "A test scenario",
		Version:     "0.1.0",
		LevelRange:  [2]int{1, 5},
		Chapters: []models.Chapter{
			{
				ID:    "ch1",
				Name:  "Chapter 1",
				Order: 1,
				Scenes: []models.Scene{
					{ID: "scene_1", Name: "Scene 1", MapID: "test_map"},
				},
			},
		},
		StartChapter:  "ch1",
		StartScene:    "scene_1",
		StartMap:      "test_map",
		StartPosition: models.Position{X: 5, Y: 5},
	}
	data, _ := json.Marshal(scenario)
	path := filepath.Join(tmpDir, "test.json")
	os.WriteFile(path, data, 0644)

	result, err := LoadScenario(path)
	if err != nil {
		t.Fatalf("LoadScenario failed: %v", err)
	}
	if result.ID != "test_scenario" {
		t.Errorf("expected test_scenario, got %s", result.ID)
	}
	if len(result.Chapters) != 1 {
		t.Errorf("expected 1 chapter, got %d", len(result.Chapters))
	}
}

func TestLoadScenario_FileNotFound(t *testing.T) {
	_, err := LoadScenario("nonexistent.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestLoadScenariosFromDir(t *testing.T) {
	tmpDir := t.TempDir()

	for _, id := range []string{"scenario_a", "scenario_b"} {
		scenario := models.Scenario{ID: id, Name: id, Version: "1.0"}
		data, _ := json.Marshal(scenario)
		os.WriteFile(filepath.Join(tmpDir, id+".json"), data, 0644)
	}

	result, err := LoadScenariosFromDir(tmpDir)
	if err != nil {
		t.Fatalf("LoadScenariosFromDir failed: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 scenarios, got %d", len(result))
	}
}

func TestLoadRealScenarioData(t *testing.T) {
	path := filepath.Join("data", "tutorial.json")
	result, err := LoadScenario(path)
	if err != nil {
		t.Skipf("skipping: tutorial scenario not found at %s", path)
	}
	if result.ID != "tutorial" {
		t.Errorf("expected tutorial, got %s", result.ID)
	}
	if len(result.Chapters) == 0 {
		t.Error("expected at least one chapter")
	}
	if result.StartMap == "" {
		t.Error("expected non-empty start map")
	}
}
