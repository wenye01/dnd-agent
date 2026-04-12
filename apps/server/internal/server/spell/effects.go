package spell

import (
	"fmt"

	"github.com/dnd-game/server/internal/server/dice"
	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
)

// EffectResult is the structured result returned by the Spell module.
// It describes the calculated effect without directly modifying combat state.
// The caller (tools layer or combat module) is responsible for applying the effect.
type EffectResult struct {
	Type        string `json:"type"`
	TargetID    string `json:"targetId,omitempty"`

	// Damage result
	Damage     int             `json:"damage,omitempty"`
	DamageType types.DamageType `json:"damageType,omitempty"`
	SaveResult *SaveResultInfo `json:"saveResult,omitempty"`

	// Healing result
	Healing int `json:"healing,omitempty"`

	// Buff/debuff bonus value
	BonusValue int `json:"bonusValue,omitempty"`

	// Description of the effect for display
	Description string `json:"description"`

	// Dice formula that was rolled
	DiceRolled string `json:"diceRolled,omitempty"`
}

// SaveResultInfo contains the result of a saving throw during spell effect resolution.
type SaveResultInfo struct {
	Ability   string `json:"ability"`
	DC        int    `json:"dc"`
	RollTotal int    `json:"rollTotal"`
	Modifier  int    `json:"modifier"`
	Success   bool   `json:"success"`
	HalfDamage bool  `json:"halfDamage,omitempty"`
}

// EffectApplier calculates spell effects without directly modifying game state.
// It returns structured EffectResult data that callers can apply.
type EffectApplier struct {
	diceService dice.DiceRoller
}

// NewEffectApplier creates a new EffectApplier.
func NewEffectApplier(diceService dice.DiceRoller) *EffectApplier {
	return &EffectApplier{diceService: diceService}
}

// ApplyEffect calculates the result of a spell effect and returns it.
// level is the slot level used to cast the spell (for upcasting).
func (ea *EffectApplier) ApplyEffect(
	caster *models.Character,
	spell *models.Spell,
	effect models.SpellEffect,
	targetID string,
	level int,
) EffectResult {
	switch effect.Type {
	case models.SpellEffectTypeDamage:
		return ea.calculateDamageEffect(caster, spell, effect, targetID, level)
	case models.SpellEffectTypeHeal:
		return ea.calculateHealEffect(caster, spell, effect, targetID, level)
	case models.SpellEffectTypeBuff:
		return ea.calculateBuffEffect(spell, effect, targetID)
	case models.SpellEffectTypeDebuff:
		return ea.calculateDebuffEffect(spell, effect, targetID)
	case models.SpellEffectTypeUtility:
		return EffectResult{
			Type:        models.SpellEffectTypeUtility,
			TargetID:    targetID,
			Description: spell.Description,
		}
	default:
		return EffectResult{
			Type:        effect.Type,
			TargetID:    targetID,
			Description: fmt.Sprintf("Unknown spell effect type: %s", effect.Type),
		}
	}
}

// calculateDamageEffect computes damage for a damage-type spell effect.
func (ea *EffectApplier) calculateDamageEffect(
	caster *models.Character,
	spell *models.Spell,
	effect models.SpellEffect,
	targetID string,
	level int,
) EffectResult {
	result := EffectResult{
		Type:      models.SpellEffectTypeDamage,
		TargetID:  targetID,
		DamageType: types.DamageType(effect.DamageType),
	}

	// Calculate the number of dice.
	diceCount := effect.DiceCount
	bonus := effect.BonusValue

	// Apply scaling for upcasting (slot_level scaling).
	if effect.ScalingType == models.ScalingTypeSlotLevel && level > spell.Level {
		extraLevels := level - spell.Level
		if effect.ScalingInterval == 0 {
			diceCount += extraLevels
		} else {
			diceCount += extraLevels / effect.ScalingInterval
		}
	}
	// Apply character_level scaling for cantrips.
	if effect.ScalingType == models.ScalingTypeCharacterLevel && caster != nil {
		charLevel := caster.Level
		interval := effect.ScalingInterval
		if interval > 0 {
			// Cantrip scaling: extra dice at level 5, 11, 17
			// total dice = base + (level/interval - baseLevel/interval)
			// For base cantrip dice count 1 at level 1:
			// level 1-4: 1 die, 5-10: 2 dice, 11-16: 3 dice, 17+: 4 dice
			extraDice := 0
			if charLevel >= 17 {
				extraDice = 3
			} else if charLevel >= 11 {
				extraDice = 2
			} else if charLevel >= 5 {
				extraDice = 1
			}
			diceCount = effect.DiceCount + extraDice
		}
	}

	// Build dice formula and roll.
	diceFormula := fmt.Sprintf("%dd%d", diceCount, effect.DiceSize)
	if bonus > 0 {
		diceFormula = fmt.Sprintf("%dd%d+%d", diceCount, effect.DiceSize, bonus)
	}
	result.DiceRolled = diceFormula

	roll, err := ea.diceService.Roll(diceFormula)
	if err != nil {
		result.Description = fmt.Sprintf("Failed to roll damage: %v", err)
		return result
	}
	result.Damage = roll.Total

	// Handle saving throw if specified.
	if effect.SaveAbility != "" && targetID != "" {
		saveDC := ea.calculateSpellDC(caster)
		result.SaveResult = &SaveResultInfo{
			Ability: effect.SaveAbility,
			DC:      saveDC,
		}
		result.Description = fmt.Sprintf(
			"%s deals %d %s damage (DC %d %s save)",
			spell.Name, result.Damage, effect.DamageType, saveDC, effect.SaveAbility,
		)
	} else {
		result.Description = fmt.Sprintf(
			"%s deals %d %s damage",
			spell.Name, result.Damage, effect.DamageType,
		)
	}

	return result
}

// calculateHealEffect computes healing for a heal-type spell effect.
func (ea *EffectApplier) calculateHealEffect(
	caster *models.Character,
	spell *models.Spell,
	effect models.SpellEffect,
	targetID string,
	level int,
) EffectResult {
	result := EffectResult{
		Type:     models.SpellEffectTypeHeal,
		TargetID: targetID,
	}

	diceCount := effect.DiceCount

	// Apply scaling for upcasting.
	if effect.ScalingType == models.ScalingTypeSlotLevel && level > spell.Level {
		extraLevels := level - spell.Level
		if effect.ScalingInterval == 0 {
			diceCount += extraLevels
		} else {
			diceCount += extraLevels / effect.ScalingInterval
		}
	}

	// Add spellcasting ability modifier to healing.
	healBonus := 0
	if caster != nil {
		healBonus = ea.getSpellcastingModifier(caster)
	}

	diceFormula := fmt.Sprintf("%dd%d", diceCount, effect.DiceSize)
	if healBonus > 0 {
		diceFormula = fmt.Sprintf("%dd%d+%d", diceCount, effect.DiceSize, healBonus)
	}
	result.DiceRolled = diceFormula

	roll, err := ea.diceService.Roll(diceFormula)
	if err != nil {
		result.Description = fmt.Sprintf("Failed to roll healing: %v", err)
		return result
	}
	result.Healing = roll.Total

	result.Description = fmt.Sprintf(
		"%s heals %d HP",
		spell.Name, result.Healing,
	)

	return result
}

// calculateBuffEffect computes a buff effect result.
func (ea *EffectApplier) calculateBuffEffect(
	spell *models.Spell,
	effect models.SpellEffect,
	targetID string,
) EffectResult {
	result := EffectResult{
		Type:       models.SpellEffectTypeBuff,
		TargetID:   targetID,
		BonusValue: effect.BonusValue,
	}

	// For dice-based buffs (e.g., bless 1d4), roll the dice.
	if effect.DiceCount > 0 && effect.DiceSize > 0 {
		diceFormula := fmt.Sprintf("%dd%d", effect.DiceCount, effect.DiceSize)
		roll, err := ea.diceService.Roll(diceFormula)
		if err == nil {
			result.BonusValue = roll.Total
			result.DiceRolled = diceFormula
		}
		result.Description = fmt.Sprintf(
			"%s grants %d bonus (rolled %s)",
			spell.Name, result.BonusValue, diceFormula,
		)
	} else {
		result.Description = fmt.Sprintf(
			"%s applies a buff (bonus: %d)",
			spell.Name, result.BonusValue,
		)
	}

	return result
}

// calculateDebuffEffect computes a debuff effect result.
func (ea *EffectApplier) calculateDebuffEffect(
	spell *models.Spell,
	effect models.SpellEffect,
	targetID string,
) EffectResult {
	result := EffectResult{
		Type:     models.SpellEffectTypeDebuff,
		TargetID: targetID,
	}

	if effect.SaveAbility != "" {
		result.SaveResult = &SaveResultInfo{
			Ability: effect.SaveAbility,
		}
		result.Description = fmt.Sprintf(
			"%s applies debuff (requires %s save)",
			spell.Name, effect.SaveAbility,
		)
	} else {
		result.Description = fmt.Sprintf(
			"%s applies a debuff",
			spell.Name,
		)
	}

	return result
}

// calculateSpellDC computes the spell save DC for a caster.
// DC = 8 + proficiency bonus + spellcasting ability modifier.
func (ea *EffectApplier) calculateSpellDC(caster *models.Character) int {
	if caster == nil {
		return 10
	}
	abilityMod := ea.getSpellcastingModifier(caster)
	return 8 + caster.ProficiencyBonus + abilityMod
}

// getSpellcastingModifier returns the ability modifier for the caster's
// spellcasting ability based on their class.
func (ea *EffectApplier) getSpellcastingModifier(caster *models.Character) int {
	ability := getSpellcastingAbility(caster.Class)
	return caster.Stats.GetModifier(ability)
}

// getSpellcastingAbility returns the spellcasting ability for a given class.
func getSpellcastingAbility(class string) types.Ability {
	switch class {
	case "wizard", "rogue": // Arcane Trickster
		return types.Intelligence
	case "cleric", "druid", "ranger":
		return types.Wisdom
	case "bard", "paladin", "sorcerer", "warlock":
		return types.Charisma
	default:
		return types.Intelligence
	}
}

// classesRequiringPreparation returns whether a class requires spell preparation.
// Wizards, clerics, druids, and paladins must prepare spells from their class
// spell list each day. Sorcerers, bards, warlocks, and rangers do not (they
// have a fixed list of known spells).
func classesRequiringPreparation(class string) bool {
	switch class {
	case "wizard", "cleric", "druid", "paladin":
		return true
	default:
		return false
	}
}
