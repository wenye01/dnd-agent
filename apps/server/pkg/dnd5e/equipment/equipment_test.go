package equipment

import (
	"encoding/json"
	"os"
	"path/filepath"
	"testing"
)

func writeTestJSON(t *testing.T, dir, filename string, data interface{}) {
	t.Helper()
	raw, err := json.Marshal(data)
	if err != nil {
		t.Fatalf("marshal test data: %v", err)
	}
	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, raw, 0644); err != nil {
		t.Fatalf("write test file: %v", err)
	}
}

func TestLoadWeapons(t *testing.T) {
	tmpDir := t.TempDir()
	weapons := []map[string]interface{}{
		{
			"id": "dagger", "name": "Dagger", "description": "A short blade",
			"type": "weapon", "weaponCategory": "simple", "weaponType": "melee",
			"damageType": "piercing",
			"damage":     map[string]interface{}{"count": 1, "size": 4},
			"range":      map[string]interface{}{"normal": 5, "long": 20},
			"properties": []string{"finesse", "light"},
		},
	}
	writeTestJSON(t, tmpDir, "weapons.json", weapons)

	result, err := LoadWeapons(filepath.Join(tmpDir, "weapons.json"))
	if err != nil {
		t.Fatalf("LoadWeapons failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 weapon, got %d", len(result))
	}
	if result["dagger"].Name != "Dagger" {
		t.Errorf("expected Dagger, got %s", result["dagger"].Name)
	}
}

func TestLoadArmor(t *testing.T) {
	tmpDir := t.TempDir()
	armor := []map[string]interface{}{
		{
			"id": "leather_armor", "name": "Leather Armor", "description": "Sturdy leather",
			"type": "armor", "armorCategory": "light", "armorType": "leather",
			"baseAc": 11, "dexBonus": "full", "maxDexBonus": 99,
			"strengthReq": 0, "stealthDisadvantage": false,
		},
	}
	writeTestJSON(t, tmpDir, "armor.json", armor)

	result, err := LoadArmor(filepath.Join(tmpDir, "armor.json"))
	if err != nil {
		t.Fatalf("LoadArmor failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 armor, got %d", len(result))
	}
	if result["leather_armor"].BaseAC != 11 {
		t.Errorf("expected base AC 11, got %d", result["leather_armor"].BaseAC)
	}
}

func TestLoadConsumables(t *testing.T) {
	tmpDir := t.TempDir()
	consumables := []map[string]interface{}{
		{
			"id": "potion_of_healing", "name": "Potion of Healing",
			"description": "Heals 2d4+2", "type": "consumable",
			"consumableType": "potion", "uses": 1, "maxUses": 1,
			"effect": map[string]interface{}{
				"type": "heal", "diceCount": 2, "diceSize": 4, "bonusValue": 2, "duration": 0,
			},
		},
	}
	writeTestJSON(t, tmpDir, "consumables.json", consumables)

	result, err := LoadConsumables(filepath.Join(tmpDir, "consumables.json"))
	if err != nil {
		t.Fatalf("LoadConsumables failed: %v", err)
	}
	if len(result) != 1 {
		t.Fatalf("expected 1 consumable, got %d", len(result))
	}
	if result["potion_of_healing"].Effect.DiceCount != 2 {
		t.Errorf("expected dice count 2, got %d", result["potion_of_healing"].Effect.DiceCount)
	}
}

func TestEquipmentStore(t *testing.T) {
	tmpDir := t.TempDir()

	// Write test data files
	writeTestJSON(t, tmpDir, "weapons.json", []map[string]interface{}{
		{"id": "sword", "name": "Sword", "description": "A sword", "type": "weapon",
			"weaponCategory": "martial", "weaponType": "melee", "damageType": "slashing",
			"damage": map[string]interface{}{"count": 1, "size": 8},
			"range": map[string]interface{}{"normal": 5, "long": 0}, "properties": []string{}},
	})
	writeTestJSON(t, tmpDir, "armor.json", []map[string]interface{}{
		{"id": "plate", "name": "Plate Armor", "description": "Full plate", "type": "armor",
			"armorCategory": "heavy", "armorType": "plate", "baseAc": 18,
			"dexBonus": "none", "maxDexBonus": 0, "strengthReq": 15, "stealthDisadvantage": true},
	})
	writeTestJSON(t, tmpDir, "consumables.json", []map[string]interface{}{
		{"id": "potion", "name": "Potion", "description": "A potion", "type": "consumable",
			"consumableType": "potion", "uses": 1, "maxUses": 1,
			"effect": map[string]interface{}{"type": "heal", "diceCount": 2, "diceSize": 4, "bonusValue": 2, "duration": 0}},
	})

	store, err := NewEquipmentStore(tmpDir)
	if err != nil {
		t.Fatalf("NewEquipmentStore failed: %v", err)
	}

	// Test individual getters
	if store.GetWeapon("sword") == nil {
		t.Error("expected sword weapon")
	}
	if store.GetArmor("plate") == nil {
		t.Error("expected plate armor")
	}
	if store.GetConsumable("potion") == nil {
		t.Error("expected potion consumable")
	}
	if store.GetWeapon("nonexistent") != nil {
		t.Error("expected nil for nonexistent weapon")
	}

	// Test generic item lookup
	item := store.GetItem("sword")
	if item == nil || item.Type != "weapon" {
		t.Error("expected weapon item")
	}

	// Test ListByType
	weaponList := store.ListByType("weapon")
	if len(weaponList) != 1 {
		t.Errorf("expected 1 weapon, got %d", len(weaponList))
	}
}

func TestEquipmentStore_EmptyDir(t *testing.T) {
	tmpDir := t.TempDir()
	store, err := NewEquipmentStore(tmpDir)
	if err != nil {
		t.Fatalf("NewEquipmentStore with empty dir should not fail: %v", err)
	}
	if len(store.ListByType("weapon")) != 0 {
		t.Error("expected empty store")
	}
	if len(store.ListByType("armor")) != 0 {
		t.Error("expected empty store")
	}
}

func TestLoadRealEquipmentData(t *testing.T) {
	dataDir := filepath.Join("data")

	store, err := NewEquipmentStore(dataDir)
	if err != nil {
		t.Skipf("skipping: equipment data dir not found at %s", dataDir)
	}

	// Check weapons
	if store.GetWeapon("dagger") == nil {
		t.Error("dagger not found")
	}
	if store.GetWeapon("longsword") == nil {
		t.Error("longsword not found")
	}
	if store.GetWeapon("greatsword") == nil {
		t.Error("greatsword not found")
	}

	// Check armor
	if store.GetArmor("leather_armor") == nil {
		t.Error("leather_armor not found")
	}
	if store.GetArmor("chain_mail") == nil {
		t.Error("chain_mail not found")
	}
	if store.GetArmor("plate_armor") == nil {
		t.Error("plate_armor not found")
	}
	if store.GetArmor("shield") == nil {
		t.Error("shield not found")
	}

	// Check consumables
	if store.GetConsumable("potion_of_healing") == nil {
		t.Error("potion_of_healing not found")
	}

	// Test ListByType
	weapons := store.ListByType("weapon")
	if len(weapons) < 10 {
		t.Errorf("expected at least 10 weapons, got %d", len(weapons))
	}
}
