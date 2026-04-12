package spell

import (
	"fmt"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/pkg/dnd5e/spells"
)

// CastSpellRequest contains all parameters for a spell cast.
type CastSpellRequest struct {
	CasterID string `json:"casterId"`
	SpellID  string `json:"spellId"`
	// Level is the slot level to use. 0 means use the spell's natural level.
	Level    int    `json:"level,omitempty"`
	TargetID string `json:"targetId,omitempty"`
}

// CastSpellResult contains the outcome of a spell cast.
type CastSpellResult struct {
	SpellID        string         `json:"spellId"`
	SpellName      string         `json:"spellName"`
	Level          int            `json:"level"`
	Success        bool           `json:"success"`
	Effects        []EffectResult `json:"effects"`
	Concentrating  bool           `json:"concentrating"`
	SlotLevelUsed  int            `json:"slotLevelUsed"`
	Message        string         `json:"message"`
}

// CastingManager orchestrates the full spellcasting workflow:
// validation -> slot consumption -> concentration handling -> effect calculation.
type CastingManager struct {
	spellStore  *spells.SpellStore
	slotMgr     *SlotManager
	concMgr     *ConcentrationManager
	effectCalc  *EffectApplier
	diceService dice.DiceRoller
}

// NewCastingManager creates a new CastingManager with its dependencies.
func NewCastingManager(
	spellStore *spells.SpellStore,
	slotMgr *SlotManager,
	concMgr *ConcentrationManager,
	effectCalc *EffectApplier,
	diceService dice.DiceRoller,
) *CastingManager {
	return &CastingManager{
		spellStore:  spellStore,
		slotMgr:     slotMgr,
		concMgr:     concMgr,
		effectCalc:  effectCalc,
		diceService: diceService,
	}
}

// CastSpell executes the full casting workflow for a spell.
//
// Steps:
//  1. Look up the spell definition.
//  2. Validate the caster knows/has prepared the spell.
//  3. Determine the effective slot level (upcasting).
//  4. Validate and consume spell slot (cantrips skip this).
//  5. Handle concentration (end old if needed, start new).
//  6. Calculate spell effects.
//  7. Return the result.
func (cm *CastingManager) CastSpell(
	caster *models.Character,
	req *CastSpellRequest,
) (*CastSpellResult, error) {
	// 1. Look up spell.
	spell := cm.spellStore.GetSpell(req.SpellID)
	if spell == nil {
		return nil, spellNotFoundf("spell %s not found", req.SpellID)
	}

	// 2. Validate known/prepared.
	if err := cm.validateKnownOrPrepared(caster, spell); err != nil {
		return nil, err
	}

	// 3. Determine effective level.
	level := req.Level
	if level == 0 {
		level = spell.Level
	}
	// Cantrips are always level 0.
	if spell.Level == 0 {
		level = 0
	}
	if level < 0 || level > 9 {
		return nil, invalidSlotLevelf("invalid spell level %d", level)
	}
	// Cannot cast at a level lower than the spell's natural level.
	if spell.Level > 0 && level < spell.Level {
		return nil, invalidSlotLevelf(
			"cannot cast %s (level %d) at level %d: slot level must be at least %d",
			spell.Name, spell.Level, level, spell.Level)
	}

	// 4. Validate and consume spell slot.
	if spell.Level > 0 {
		if !cm.slotMgr.HasAvailableSlot(caster, level) {
			return nil, noAvailableSlotf(
				"no available level %d spell slot to cast %s",
				level, spell.Name)
		}
		if err := cm.slotMgr.ConsumeSlot(caster, level); err != nil {
			return nil, err
		}
	}

	result := &CastSpellResult{
		SpellID:       req.SpellID,
		SpellName:     spell.Name,
		Level:         level,
		Success:       true,
		SlotLevelUsed: level,
	}

	// 5. Handle concentration.
	if spell.Concentration {
		_ = cm.concMgr.StartConcentration(caster.ID, spell.ID, spell.Name, req.TargetID)
		result.Concentrating = true
	}

	// 6. Calculate effects.
	for _, effect := range spell.Effects {
		effectResult := cm.effectCalc.ApplyEffect(caster, spell, effect, req.TargetID, level)
		result.Effects = append(result.Effects, effectResult)
	}

	// 7. Build message.
	result.Message = cm.buildCastMessage(caster, spell, result)

	return result, nil
}

// CanCastSpell checks whether a character can cast a spell and returns
// a boolean and a reason string. This is a pre-validation check that
// does not modify any state.
func (cm *CastingManager) CanCastSpell(
	caster *models.Character,
	spellID string,
	level int,
) (bool, string) {
	// Check spell exists.
	spell := cm.spellStore.GetSpell(spellID)
	if spell == nil {
		return false, fmt.Sprintf("spell %s not found", spellID)
	}

	// Check known/prepared.
	if err := cm.validateKnownOrPrepared(caster, spell); err != nil {
		return false, err.Error()
	}

	// Determine effective level.
	effectiveLevel := level
	if effectiveLevel == 0 {
		effectiveLevel = spell.Level
	}
	if spell.Level == 0 {
		return true, "" // Cantrips are always castable.
	}

	if effectiveLevel < spell.Level {
		return false, fmt.Sprintf(
			"slot level %d is below spell level %d",
			effectiveLevel, spell.Level)
	}

	// Check spell slot availability.
	if !cm.slotMgr.HasAvailableSlot(caster, effectiveLevel) {
		return false, fmt.Sprintf(
			"no available level %d spell slot",
			effectiveLevel)
	}

	return true, ""
}

// validateKnownOrPrepared checks that the caster knows (or has prepared) the spell.
func (cm *CastingManager) validateKnownOrPrepared(caster *models.Character, spell *models.Spell) error {
	// Check if the spell is in the caster's known spells.
	if containsString(caster.KnownSpells, spell.ID) {
		return nil
	}

	// Check if the spell is in the caster's prepared spells.
	if containsString(caster.PreparedSpells, spell.ID) {
		return nil
	}

	// For classes that require preparation, the spell must be prepared.
	if classesRequiringPreparation(caster.Class) {
		return spellNotPreparedf(
			"%s must prepare %s before casting (class: %s)",
			caster.Name, spell.Name, caster.Class)
	}

	// For spontaneous casters, the spell must be known.
	return spellNotKnownf(
		"%s does not know the spell %s",
		caster.Name, spell.Name)
}

// buildCastMessage creates a human-readable message for the cast result.
func (cm *CastingManager) buildCastMessage(
	caster *models.Character,
	spell *models.Spell,
	result *CastSpellResult,
) string {
	msg := fmt.Sprintf("%s casts %s", caster.Name, spell.Name)
	if result.SlotLevelUsed > 0 {
		msg += fmt.Sprintf(" at level %d", result.SlotLevelUsed)
	}
	if len(result.Effects) > 0 {
		msg += ". "
		for i, e := range result.Effects {
			if i > 0 {
				msg += "; "
			}
			msg += e.Description
		}
	}
	return msg
}

// containsString checks if a string is present in a slice.
func containsString(slice []string, s string) bool {
	for _, item := range slice {
		if item == s {
			return true
		}
	}
	return false
}

// PrepareSpell adds a spell to the character's prepared spells list.
// For classes that don't require preparation, this is a no-op.
func (cm *CastingManager) PrepareSpell(caster *models.Character, spellID string) error {
	spell := cm.spellStore.GetSpell(spellID)
	if spell == nil {
		return spellNotFoundf("spell %s not found", spellID)
	}

	// Must know the spell first.
	if !containsString(caster.KnownSpells, spellID) {
		return spellNotKnownf("%s does not know the spell %s", caster.Name, spell.Name)
	}

	// Already prepared.
	if containsString(caster.PreparedSpells, spellID) {
		return nil
	}

	caster.PreparedSpells = append(caster.PreparedSpells, spellID)
	return nil
}

// UnprepareSpell removes a spell from the character's prepared spells list.
func (cm *CastingManager) UnprepareSpell(caster *models.Character, spellID string) error {
	if !containsString(caster.PreparedSpells, spellID) {
		return spellNotPreparedf("spell %s is not prepared", spellID)
	}

	newPrepared := make([]string, 0, len(caster.PreparedSpells)-1)
	for _, s := range caster.PreparedSpells {
		if s != spellID {
			newPrepared = append(newPrepared, s)
		}
	}
	caster.PreparedSpells = newPrepared
	return nil
}

// GetActiveConcentration returns the active concentration info for a caster,
// or nil if they are not concentrating on any spell. This delegates to the
// underlying ConcentrationManager.
func (cm *CastingManager) GetActiveConcentration(casterID string) *models.ConcentrationInfo {
	return cm.concMgr.GetActiveConcentration(casterID)
}

// LearnSpell adds a spell to the character's known spells list.
func (cm *CastingManager) LearnSpell(caster *models.Character, spellID string) error {
	spell := cm.spellStore.GetSpell(spellID)
	if spell == nil {
		return spellNotFoundf("spell %s not found", spellID)
	}

	if containsString(caster.KnownSpells, spellID) {
		return nil // Already known.
	}

	caster.KnownSpells = append(caster.KnownSpells, spellID)
	return nil
}
