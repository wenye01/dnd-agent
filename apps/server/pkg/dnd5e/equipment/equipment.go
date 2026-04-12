// Package equipment provides SRD equipment data loading and querying.
package equipment

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/dnd-game/server/internal/shared/models"
)

// WeaponData represents a weapon definition loaded from JSON data.
type WeaponData = models.Weapon

// ArmorData represents an armor definition loaded from JSON data.
type ArmorData = models.Armor

// ConsumableData represents a consumable item definition loaded from JSON data.
type ConsumableData = models.Consumable

// ItemData represents a generic item with type information.
type ItemData struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Type        string `json:"type"`
}

// LoadWeapons loads weapon definitions from a JSON file.
func LoadWeapons(path string) (map[string]*WeaponData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read weapons file: %w", err)
	}

	var weapons []*WeaponData
	if err := json.Unmarshal(data, &weapons); err != nil {
		return nil, fmt.Errorf("parse weapons JSON: %w", err)
	}

	result := make(map[string]*WeaponData, len(weapons))
	for _, w := range weapons {
		result[w.ID] = w
	}
	return result, nil
}

// LoadArmor loads armor definitions from a JSON file.
func LoadArmor(path string) (map[string]*ArmorData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read armor file: %w", err)
	}

	var armorList []*ArmorData
	if err := json.Unmarshal(data, &armorList); err != nil {
		return nil, fmt.Errorf("parse armor JSON: %w", err)
	}

	result := make(map[string]*ArmorData, len(armorList))
	for _, a := range armorList {
		result[a.ID] = a
	}
	return result, nil
}

// LoadConsumables loads consumable item definitions from a JSON file.
func LoadConsumables(path string) (map[string]*ConsumableData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read consumables file: %w", err)
	}

	var consumables []*ConsumableData
	if err := json.Unmarshal(data, &consumables); err != nil {
		return nil, fmt.Errorf("parse consumables JSON: %w", err)
	}

	result := make(map[string]*ConsumableData, len(consumables))
	for _, c := range consumables {
		result[c.ID] = c
	}
	return result, nil
}

// EquipmentStore provides read access to all equipment data.
type EquipmentStore struct {
	mu          sync.RWMutex
	weapons     map[string]*WeaponData
	armor       map[string]*ArmorData
	consumables map[string]*ConsumableData
	items       map[string]*ItemData
}

// NewEquipmentStore creates an EquipmentStore by loading all data files from a directory.
// Expects the directory to contain weapons.json, armor.json, and consumables.json.
func NewEquipmentStore(dataDir string) (*EquipmentStore, error) {
	store := &EquipmentStore{
		weapons:     make(map[string]*WeaponData),
		armor:       make(map[string]*ArmorData),
		consumables: make(map[string]*ConsumableData),
		items:       make(map[string]*ItemData),
	}

	// Load weapons (ignore error if file doesn't exist)
	if weapons, err := LoadWeapons(dataDir + "/weapons.json"); err == nil {
		store.weapons = weapons
		for _, w := range weapons {
			store.items[w.ID] = &ItemData{
				ID:          w.ID,
				Name:        w.Name,
				Description: w.Description,
				Type:        "weapon",
			}
		}
	}

	// Load armor (ignore error if file doesn't exist)
	if armor, err := LoadArmor(dataDir + "/armor.json"); err == nil {
		store.armor = armor
		for _, a := range armor {
			store.items[a.ID] = &ItemData{
				ID:          a.ID,
				Name:        a.Name,
				Description: a.Description,
				Type:        "armor",
			}
		}
	}

	// Load consumables (ignore error if file doesn't exist)
	if consumables, err := LoadConsumables(dataDir + "/consumables.json"); err == nil {
		store.consumables = consumables
		for _, c := range consumables {
			store.items[c.ID] = &ItemData{
				ID:          c.ID,
				Name:        c.Name,
				Description: c.Description,
				Type:        "consumable",
			}
		}
	}

	return store, nil
}

// GetWeapon returns a weapon by ID, or nil if not found.
func (s *EquipmentStore) GetWeapon(id string) *WeaponData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.weapons[id]
}

// GetArmor returns armor by ID, or nil if not found.
func (s *EquipmentStore) GetArmor(id string) *ArmorData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.armor[id]
}

// GetConsumable returns a consumable by ID, or nil if not found.
func (s *EquipmentStore) GetConsumable(id string) *ConsumableData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.consumables[id]
}

// GetItem returns generic item data by ID, or nil if not found.
func (s *EquipmentStore) GetItem(id string) *ItemData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.items[id]
}

// ListByType returns all items of a given type.
func (s *EquipmentStore) ListByType(itemType string) []ItemData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []ItemData
	for _, item := range s.items {
		if item.Type == itemType {
			result = append(result, *item)
		}
	}
	return result
}
