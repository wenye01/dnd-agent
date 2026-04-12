package spell

import (
	"github.com/dnd-game/server/internal/shared/models"
)

// SlotManager manages spell slot consumption and recovery.
// Spell slot counts are based on the SRD multiclass spell slot table,
// which applies uniformly to all full spellcasting classes.
type SlotManager struct{}

// NewSlotManager creates a new SlotManager.
func NewSlotManager() *SlotManager {
	return &SlotManager{}
}

// spellSlotsByLevel is the SRD spell slot table for full casters.
// Key: character level (1-20). Value: map of slot level -> slot count.
// This table is the same for wizard, cleric, bard, sorcerer, and druid.
// Half-casters (paladin, ranger) use a separate table.
var spellSlotsByLevel = map[int]map[int]int{
	1:  {1: 2},
	2:  {1: 3},
	3:  {1: 4, 2: 2},
	4:  {1: 4, 2: 3},
	5:  {1: 4, 2: 3, 3: 2},
	6:  {1: 4, 2: 3, 3: 3},
	7:  {1: 4, 2: 3, 3: 3, 4: 1},
	8:  {1: 4, 2: 3, 3: 3, 4: 2},
	9:  {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
	10: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
	11: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
	12: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1},
	13: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
	14: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1},
	15: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
	16: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1},
	17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
	18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1},
	19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 2, 7: 1, 8: 1, 9: 1},
	20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 2, 7: 2, 8: 1, 9: 1},
}

// halfCasterSlotsByLevel is the spell slot table for half-casters
// (paladin, ranger). Their effective spellcaster level is half their
// class level, rounded down.
var halfCasterSlotsByLevel = map[int]map[int]int{
	1:  {},
	2:  {1: 2},
	3:  {1: 3},
	4:  {1: 3},
	5:  {1: 4, 2: 2},
	6:  {1: 4, 2: 2},
	7:  {1: 4, 2: 3},
	8:  {1: 4, 2: 3},
	9:  {1: 4, 2: 3, 3: 2},
	10: {1: 4, 2: 3, 3: 2},
	11: {1: 4, 2: 3, 3: 3},
	12: {1: 4, 2: 3, 3: 3},
	13: {1: 4, 2: 3, 3: 3, 4: 1},
	14: {1: 4, 2: 3, 3: 3, 4: 1},
	15: {1: 4, 2: 3, 3: 3, 4: 2},
	16: {1: 4, 2: 3, 3: 3, 4: 2},
	17: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
	18: {1: 4, 2: 3, 3: 3, 4: 3, 5: 1},
	19: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
	20: {1: 4, 2: 3, 3: 3, 4: 3, 5: 2},
}

// fullCasterClasses are classes that use the full spell slot progression.
var fullCasterClasses = map[string]bool{
	"wizard":   true,
	"cleric":   true,
	"bard":     true,
	"sorcerer": true,
	"druid":    true,
	"warlock":  true, // simplified: treat as full caster for slot table
}

// halfCasterClasses are classes that use half-caster spell slot progression.
var halfCasterClasses = map[string]bool{
	"paladin": true,
	"ranger":  true,
}

// GetSpellSlots returns the remaining spell slots for a character.
// Reads from the character's SpellSlots map directly.
func (sm *SlotManager) GetSpellSlots(char *models.Character) map[int]int {
	if char.SpellSlots == nil {
		return map[int]int{}
	}
	// Return a copy to prevent external mutation.
	result := make(map[int]int, len(char.SpellSlots))
	for k, v := range char.SpellSlots {
		result[k] = v
	}
	return result
}

// GetMaxSpellSlots returns the maximum spell slots for a character
// based on their class and level, using the SRD spell slot tables.
func (sm *SlotManager) GetMaxSpellSlots(char *models.Character) map[int]int {
	if fullCasterClasses[char.Class] {
		return getMaxSlotsForTable(char.Level, spellSlotsByLevel)
	}
	if halfCasterClasses[char.Class] {
		return getMaxSlotsForTable(char.Level, halfCasterSlotsByLevel)
	}
	// Non-spellcasters have no spell slots.
	return map[int]int{}
}

func getMaxSlotsForTable(level int, table map[int]map[int]int) map[int]int {
	if slots, ok := table[level]; ok {
		result := make(map[int]int, len(slots))
		for k, v := range slots {
			result[k] = v
		}
		return result
	}
	return map[int]int{}
}

// ConsumeSlot consumes one spell slot of the specified level.
// Returns an error if the level is invalid or no slots are available.
// Cantrips (level 0) do not consume slots.
func (sm *SlotManager) ConsumeSlot(char *models.Character, level int) error {
	if level <= 0 {
		// Cantrips or invalid levels do not consume slots.
		return nil
	}
	if level > 9 {
		return invalidSlotLevelf("spell slot level %d exceeds maximum of 9", level)
	}
	if char.SpellSlots == nil {
		return noAvailableSlotf("character has no spell slots")
	}
	remaining, ok := char.SpellSlots[level]
	if !ok || remaining <= 0 {
		return noAvailableSlotf("no available level %d spell slots", level)
	}
	char.SpellSlots[level] = remaining - 1
	return nil
}

// RestoreAllSlots restores all spell slots to their maximum values
// based on the character's class and level (long rest).
func (sm *SlotManager) RestoreAllSlots(char *models.Character) {
	maxSlots := sm.GetMaxSpellSlots(char)
	if len(maxSlots) == 0 {
		char.SpellSlots = nil
		return
	}
	// Copy max slots as the new current slots.
	char.SpellSlots = make(map[int]int, len(maxSlots))
	for k, v := range maxSlots {
		char.SpellSlots[k] = v
	}
}

// HasAvailableSlot checks whether the character has at least one
// spell slot available at the given level.
// Cantrips (level 0) always return true.
func (sm *SlotManager) HasAvailableSlot(char *models.Character, level int) bool {
	if level <= 0 {
		return true
	}
	if char.SpellSlots == nil {
		return false
	}
	return char.SpellSlots[level] > 0
}

// InitSpellSlots initializes a character's spell slots based on their
// class and level. This should be called during character creation
// or level-up.
func (sm *SlotManager) InitSpellSlots(char *models.Character) {
	maxSlots := sm.GetMaxSpellSlots(char)
	if len(maxSlots) > 0 {
		char.SpellSlots = make(map[int]int, len(maxSlots))
		for k, v := range maxSlots {
			char.SpellSlots[k] = v
		}
	}
}
