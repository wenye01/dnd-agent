package spells

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func TestLoadSpells(t *testing.T) {
	// Create a temp spells JSON file
	tmpDir := t.TempDir()
	spells := []map[string]interface{}{
		{
			"id":              "test_spell",
			"name":            "Test Spell",
			"level":           1,
			"school":          "evocation",
			"castingTime":     "1 action",
			"castingTimeType": "action",
			"range":           "30 feet",
			"duration":        "Instantaneous",
			"durationType":    "instantaneous",
			"concentration":   false,
			"ritual":          false,
			"description":     "A test spell.",
			"classes":         []string{"wizard", "sorcerer"},
		},
		{
			"id":              "test_cantrip",
			"name":            "Test Cantrip",
			"level":           0,
			"school":          "abjuration",
			"castingTime":     "1 action",
			"castingTimeType": "action",
			"range":           "Touch",
			"duration":        "Instantaneous",
			"durationType":    "instantaneous",
			"concentration":   false,
			"ritual":          false,
			"description":     "A test cantrip.",
			"classes":         []string{"wizard"},
		},
	}
	data, _ := json.Marshal(spells)
	path := filepath.Join(tmpDir, "spells.json")
	os.WriteFile(path, data, 0644)

	result, err := LoadSpells(path)
	if err != nil {
		t.Fatalf("LoadSpells failed: %v", err)
	}
	if len(result) != 2 {
		t.Fatalf("expected 2 spells, got %d", len(result))
	}
	if _, ok := result["test_spell"]; !ok {
		t.Error("test_spell not found in result")
	}
	if _, ok := result["test_cantrip"]; !ok {
		t.Error("test_cantrip not found in result")
	}
}

func TestLoadSpells_FileNotFound(t *testing.T) {
	_, err := LoadSpells("nonexistent.json")
	if err == nil {
		t.Error("expected error for missing file")
	}
}

func TestLoadSpells_InvalidJSON(t *testing.T) {
	tmpDir := t.TempDir()
	path := filepath.Join(tmpDir, "spells.json")
	os.WriteFile(path, []byte("invalid json"), 0644)

	_, err := LoadSpells(path)
	if err == nil {
		t.Error("expected error for invalid JSON")
	}
}

func TestSpellStore_GetSpell(t *testing.T) {
	store := NewSpellStore(map[string]*SpellData{
		"fireball": {ID: "fireball", Name: "Fireball", Level: 3},
	})

	spell := store.GetSpell("fireball")
	if spell == nil {
		t.Fatal("expected spell, got nil")
	}
	if spell.Name != "Fireball" {
		t.Errorf("expected Fireball, got %s", spell.Name)
	}

	if store.GetSpell("nonexistent") != nil {
		t.Error("expected nil for nonexistent spell")
	}
}

func TestSpellStore_GetSpellsByClass(t *testing.T) {
	store := NewSpellStore(map[string]*SpellData{
		"fireball":      {ID: "fireball", Name: "Fireball", Classes: []string{"wizard", "sorcerer"}},
		"magic_missile": {ID: "magic_missile", Name: "Magic Missile", Classes: []string{"wizard", "sorcerer"}},
		"sacred_flame":  {ID: "sacred_flame", Name: "Sacred Flame", Classes: []string{"cleric"}},
	})

	wizardSpells := store.GetSpellsByClass("wizard")
	if len(wizardSpells) != 2 {
		t.Errorf("expected 2 wizard spells, got %d", len(wizardSpells))
	}

	clericSpells := store.GetSpellsByClass("cleric")
	if len(clericSpells) != 1 {
		t.Errorf("expected 1 cleric spell, got %d", len(clericSpells))
	}

	none := store.GetSpellsByClass("barbarian")
	if len(none) != 0 {
		t.Errorf("expected 0 barbarian spells, got %d", len(none))
	}
}

func TestSpellStore_GetSpellsByLevel(t *testing.T) {
	store := NewSpellStore(map[string]*SpellData{
		"fireball":      {ID: "fireball", Level: 3},
		"magic_missile": {ID: "magic_missile", Level: 1},
		"shield":        {ID: "shield", Level: 1},
	})

	level1 := store.GetSpellsByLevel(1)
	if len(level1) != 2 {
		t.Errorf("expected 2 level 1 spells, got %d", len(level1))
	}

	level3 := store.GetSpellsByLevel(3)
	if len(level3) != 1 {
		t.Errorf("expected 1 level 3 spell, got %d", len(level3))
	}
}

func TestSpellStore_GetSpellsBySchool(t *testing.T) {
	store := NewSpellStore(map[string]*SpellData{
		"fireball":      {ID: "fireball", School: "evocation"},
		"magic_missile": {ID: "magic_missile", School: "evocation"},
		"charm_person":  {ID: "charm_person", School: "enchantment"},
	})

	evo := store.GetSpellsBySchool("evocation")
	if len(evo) != 2 {
		t.Errorf("expected 2 evocation spells, got %d", len(evo))
	}
}

func TestSpellStore_ListSpells(t *testing.T) {
	store := NewSpellStore(map[string]*SpellData{
		"a": {ID: "a"},
		"b": {ID: "b"},
		"c": {ID: "c"},
	})

	all := store.ListSpells()
	if len(all) != 3 {
		t.Errorf("expected 3 spells, got %d", len(all))
	}
}

func TestLoadSpellStore(t *testing.T) {
	tmpDir := t.TempDir()
	spells := []map[string]interface{}{
		{
			"id": "test", "name": "Test", "level": 1, "school": "evocation",
			"castingTime": "1 action", "castingTimeType": "action", "range": "30 feet",
			"duration": "Instantaneous", "durationType": "instantaneous",
			"concentration": false, "ritual": false, "description": "test",
			"classes": []string{"wizard"},
		},
	}
	data, _ := json.Marshal(spells)
	path := filepath.Join(tmpDir, "spells.json")
	os.WriteFile(path, data, 0644)

	store, err := LoadSpellStore(path)
	if err != nil {
		t.Fatalf("LoadSpellStore failed: %v", err)
	}
	if store.GetSpell("test") == nil {
		t.Error("expected spell to be loaded")
	}
}

func TestLoadRealSpellsData(t *testing.T) {
	path := filepath.Join("data", "spells.json")
	store, err := LoadSpellStore(path)
	if err != nil {
		t.Skipf("skipping: spells data file not found at %s", path)
	}

	all := store.ListSpells()
	if len(all) < 20 {
		t.Errorf("expected at least 20 spells, got %d", len(all))
	}

	// Verify specific spells exist
	if store.GetSpell("magic_missile") == nil {
		t.Error("magic_missile not found")
	}
	if store.GetSpell("fireball") == nil {
		t.Error("fireball not found")
	}
	if store.GetSpell("cure_wounds") == nil {
		t.Error("cure_wounds not found")
	}

	// Test class filtering
	wizardSpells := store.GetSpellsByClass("wizard")
	if len(wizardSpells) == 0 {
		t.Error("expected wizard spells")
	}

	// Test level filtering
	cantrips := store.GetSpellsByLevel(0)
	if len(cantrips) == 0 {
		t.Error("expected cantrips")
	}
}
