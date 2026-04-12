// Package models provides the core data models for the D&D game.
package models

import (
	"encoding/json"
	"time"
)

// SpellSchool represents one of the eight schools of magic in D&D 5e.
type SpellSchool string

const (
	SpellSchoolAbjuration    SpellSchool = "abjuration"
	SpellSchoolConjuration   SpellSchool = "conjuration"
	SpellSchoolDivination    SpellSchool = "divination"
	SpellSchoolEnchantment   SpellSchool = "enchantment"
	SpellSchoolEvocation     SpellSchool = "evocation"
	SpellSchoolIllusion      SpellSchool = "illusion"
	SpellSchoolNecromancy    SpellSchool = "necromancy"
	SpellSchoolTransmutation SpellSchool = "transmutation"
)

// CastingTimeType represents the type of casting time for a spell.
type CastingTimeType string

const (
	CastingTimeAction      CastingTimeType = "action"
	CastingTimeBonusAction CastingTimeType = "bonus_action"
	CastingTimeReaction    CastingTimeType = "reaction"
	CastingTimeMinute      CastingTimeType = "minute"
	CastingTimeHour        CastingTimeType = "hour"
)

// DurationType represents the duration type of a spell.
type DurationType string

const (
	DurationInstantaneous DurationType = "instantaneous"
	DurationRound         DurationType = "round"
	DurationMinute        DurationType = "minute"
	DurationHour          DurationType = "hour"
	DurationConcentration DurationType = "concentration"
	DurationPermanent     DurationType = "permanent"
	DurationSpecial       DurationType = "special"
)

// Spell represents a D&D 5e spell definition.
type Spell struct {
	ID             string          `json:"id"`
	Name           string          `json:"name"`
	Level          int             `json:"level"`
	School         SpellSchool     `json:"school"`
	CastingTime    string          `json:"castingTime"`
	CastingTimeType CastingTimeType `json:"castingTimeType"`
	Range          string          `json:"range"`
	Duration       string          `json:"duration"`
	DurationType   DurationType    `json:"durationType"`
	Concentration  bool            `json:"concentration"`
	Ritual         bool            `json:"ritual"`
	Description    string          `json:"description"`
	HigherLevels   string          `json:"higherLevels,omitempty"`
	Classes        []string        `json:"classes"`
	Components     SpellComponents `json:"components"`
	Effects        []SpellEffect   `json:"effects,omitempty"`
}

// SpellComponents represents the components required to cast a spell.
type SpellComponents struct {
	Verbal      bool     `json:"verbal"`
	Somatic     bool     `json:"somatic"`
	Material    bool     `json:"material"`
	Materials   []string `json:"materials,omitempty"`
	GoldCost    int      `json:"goldCost,omitempty"`
}

// SpellSlot tracks the usage of spell slots for a specific level.
type SpellSlot struct {
	Level int `json:"level"`
	Max   int `json:"max"`
	Used  int `json:"used"`
}

// ConcentrationInfo tracks active concentration on a spell.
type ConcentrationInfo struct {
	SpellID   string    `json:"spellId"`
	SpellName string    `json:"spellName"`
	CasterID  string    `json:"casterId"`
	TargetID  string    `json:"targetId"`
	StartedAt time.Time `json:"startedAt"`
}

// SpellEffect describes the mechanical effect of a spell.
type SpellEffect struct {
	Type            string `json:"type"`            // damage, heal, buff, debuff, save, utility
	DamageType      string `json:"damageType,omitempty"`
	SaveAbility     string `json:"saveAbility,omitempty"`
	DiceCount       int    `json:"diceCount,omitempty"`
	DiceSize        int    `json:"diceSize,omitempty"`
	BonusValue      int    `json:"bonusValue,omitempty"`
	ScalingType     string `json:"scalingType,omitempty"`     // none, level, character_level
	ScalingInterval int    `json:"scalingInterval,omitempty"` // e.g., +1d6 per slot level above 3rd
}

// SpellEffectType constants for spell effect types.
const (
	SpellEffectTypeDamage  = "damage"
	SpellEffectTypeHeal    = "heal"
	SpellEffectTypeBuff    = "buff"
	SpellEffectTypeDebuff  = "debuff"
	SpellEffectTypeSave    = "save"
	SpellEffectTypeUtility = "utility"
)

// ScalingType constants for spell effect scaling.
const (
	ScalingTypeNone           = "none"
	ScalingTypeSlotLevel      = "slot_level"
	ScalingTypeCharacterLevel = "character_level"
)

// NPCSpellcasting represents spellcasting capability for an NPC.
type NPCSpellcasting struct {
	Ability        string         `json:"ability"`
	Level          int            `json:"level"`
	SpellSaveDC    int            `json:"spellSaveDc"`
	SpellAttackMod int            `json:"spellAttackMod"`
	SpellsKnown    json.RawMessage `json:"spellsKnown,omitempty"`
	SpellsPrepared json.RawMessage `json:"spellsPrepared,omitempty"`
	Slots          json.RawMessage `json:"slots,omitempty"`
}
