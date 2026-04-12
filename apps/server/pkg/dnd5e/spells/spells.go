// Package spells provides SRD spell data loading and querying.
package spells

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"

	"github.com/dnd-game/server/internal/shared/models"
)

// SpellData represents a spell definition loaded from JSON data.
type SpellData = models.Spell

// SpellStore provides read access to spell definitions.
type SpellStore struct {
	mu      sync.RWMutex
	spells  map[string]*SpellData
}

// LoadSpells loads spell definitions from a JSON file.
// Returns a map keyed by spell ID.
func LoadSpells(path string) (map[string]*SpellData, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("read spells file: %w", err)
	}

	var spellList []*SpellData
	if err := json.Unmarshal(data, &spellList); err != nil {
		return nil, fmt.Errorf("parse spells JSON: %w", err)
	}

	spells := make(map[string]*SpellData, len(spellList))
	for _, s := range spellList {
		spells[s.ID] = s
	}
	return spells, nil
}

// NewSpellStore creates a SpellStore from pre-loaded spell data.
func NewSpellStore(spells map[string]*SpellData) *SpellStore {
	return &SpellStore{
		spells: spells,
	}
}

// LoadSpellStore creates a SpellStore by loading spells from a JSON file.
func LoadSpellStore(path string) (*SpellStore, error) {
	spells, err := LoadSpells(path)
	if err != nil {
		return nil, err
	}
	return NewSpellStore(spells), nil
}

// GetSpell returns a spell by ID, or nil if not found.
func (s *SpellStore) GetSpell(id string) *SpellData {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.spells[id]
}

// GetSpellsByClass returns all spells available to a given class.
func (s *SpellStore) GetSpellsByClass(class string) []*SpellData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*SpellData
	for _, spell := range s.spells {
		for _, c := range spell.Classes {
			if c == class {
				result = append(result, spell)
				break
			}
		}
	}
	return result
}

// GetSpellsByLevel returns all spells of a given level.
func (s *SpellStore) GetSpellsByLevel(level int) []*SpellData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*SpellData
	for _, spell := range s.spells {
		if spell.Level == level {
			result = append(result, spell)
		}
	}
	return result
}

// GetSpellsBySchool returns all spells of a given school.
func (s *SpellStore) GetSpellsBySchool(school string) []*SpellData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	var result []*SpellData
	for _, spell := range s.spells {
		if string(spell.School) == school {
			result = append(result, spell)
		}
	}
	return result
}

// ListSpells returns all spells in the store.
func (s *SpellStore) ListSpells() []*SpellData {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]*SpellData, 0, len(s.spells))
	for _, spell := range s.spells {
		result = append(result, spell)
	}
	return result
}
