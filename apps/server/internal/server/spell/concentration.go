package spell

import (
	"fmt"
	"sync"
	"time"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// ConcentrationManager tracks active concentration spells and handles
// concentration checks when a concentrating caster takes damage.
type ConcentrationManager struct {
	mu     sync.RWMutex
	active map[string]*models.ConcentrationInfo // casterID -> concentration

	diceService dice.DiceRoller
}

// NewConcentrationManager creates a new ConcentrationManager.
func NewConcentrationManager(diceService dice.DiceRoller) *ConcentrationManager {
	return &ConcentrationManager{
		active:      make(map[string]*models.ConcentrationInfo),
		diceService: diceService,
	}
}

// StartConcentration begins concentration on a spell for the given caster.
// If the caster is already concentrating on a spell, the old concentration
// is automatically ended before the new one begins (per D&D 5e rules).
func (cm *ConcentrationManager) StartConcentration(casterID, spellID, spellName, targetID string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	// End existing concentration if any (automatic, no error).
	if existing, ok := cm.active[casterID]; ok {
		// Silently end old concentration.
		_ = existing
		delete(cm.active, casterID)
	}

	cm.active[casterID] = &models.ConcentrationInfo{
		SpellID:   spellID,
		SpellName: spellName,
		CasterID:  casterID,
		TargetID:  targetID,
		StartedAt: time.Now(),
	}
	return nil
}

// EndConcentration ends the active concentration for the given caster.
// Returns an error if the caster is not concentrating on any spell.
func (cm *ConcentrationManager) EndConcentration(casterID string) error {
	cm.mu.Lock()
	defer cm.mu.Unlock()

	if _, ok := cm.active[casterID]; !ok {
		return NewSpellError(ErrNotConcentrating,
			fmt.Sprintf("caster %s is not concentrating on any spell", casterID))
	}
	delete(cm.active, casterID)
	return nil
}

// GetActiveConcentration returns the active concentration for a caster,
// or nil if they are not concentrating on any spell.
func (cm *ConcentrationManager) GetActiveConcentration(casterID string) *models.ConcentrationInfo {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	return cm.active[casterID]
}

// IsConcentrating returns true if the caster has an active concentration spell.
func (cm *ConcentrationManager) IsConcentrating(casterID string) bool {
	cm.mu.RLock()
	defer cm.mu.RUnlock()
	_, ok := cm.active[casterID]
	return ok
}

// ConcentrationCheck performs a Constitution saving throw to maintain
// concentration after taking damage.
//
// D&D 5e rules: DC = max(10, damage/2). The check is a Constitution
// saving throw with the caster's normal modifier and proficiency bonus
// (if proficient in Constitution saves).
//
// Returns (maintained bool, err error):
//   - maintained=true means concentration is kept
//   - maintained=false means concentration is broken (and the spell ends)
func (cm *ConcentrationManager) ConcentrationCheck(caster *models.Character, damage int) (bool, error) {
	cm.mu.RLock()
	_, concentrating := cm.active[caster.ID]
	cm.mu.RUnlock()

	if !concentrating {
		// Not concentrating, nothing to check.
		return true, nil
	}

	// Calculate DC: max(10, damage/2)
	dc := 10
	halfDamage := damage / 2
	if halfDamage > dc {
		dc = halfDamage
	}

	// Calculate Constitution saving throw modifier.
	conMod := caster.Stats.GetModifier(types.Constitution)
	saveModifier := conMod
	if caster.SavingThrows[types.Constitution] {
		saveModifier += caster.ProficiencyBonus
	}

	// Roll the save using the dice service (d20 + modifier).
	roll, err := cm.diceService.Roll("1d20")
	if err != nil {
		return false, fmt.Errorf("concentration check roll failed: %w", err)
	}
	total := roll.Total + saveModifier

	if total >= dc {
		// Concentration maintained.
		return true, nil
	}

	// Concentration broken. End concentration.
	cm.mu.Lock()
	delete(cm.active, caster.ID)
	cm.mu.Unlock()
	return false, nil
}

// GetBreakDC calculates the concentration break DC for a given damage amount.
// DC = max(10, damage/2).
func GetBreakDC(damage int) int {
	dc := 10
	half := damage / 2
	if half > dc {
		dc = half
	}
	return dc
}
