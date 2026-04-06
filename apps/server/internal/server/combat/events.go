// Package combat implements D&D 5e combat mechanics.
// This file defines combat event types used throughout the combat system.
package combat

// CombatEventType identifies a type of combat event.
type CombatEventType string

const (
	EventCombatStart       CombatEventType = "combat_start"
	EventCombatEnd         CombatEventType = "combat_end"
	EventInitiativeRolled  CombatEventType = "initiative_rolled"
	EventTurnStart         CombatEventType = "turn_start"
	EventTurnEnd           CombatEventType = "turn_end"
	EventRoundEnd          CombatEventType = "round_end"
	EventAttack            CombatEventType = "attack"
	EventDamage            CombatEventType = "damage"
	EventHeal              CombatEventType = "heal"
	EventDeath             CombatEventType = "death"
	EventUnconscious       CombatEventType = "unconscious"
	EventConditionApplied  CombatEventType = "condition_applied"
	EventConditionRemoved  CombatEventType = "condition_removed"
	EventOpportunityAttack CombatEventType = "opportunity_attack"
)

// CombatEvent represents an event that occurs during combat.
type CombatEvent struct {
	Type      CombatEventType `json:"type"`
	Timestamp int64           `json:"timestamp"`
	Data      interface{}     `json:"data"`
}

// AttackEventData contains details about an attack event.
type AttackEventData struct {
	AttackerID string `json:"attackerId"`
	TargetID   string `json:"targetId"`
	AttackRoll int    `json:"attackRoll"`
	TargetAC   int    `json:"targetAc"`
	Hit        bool   `json:"hit"`
	Critical   bool   `json:"critical"`
	Damage     int    `json:"damage,omitempty"`
	DamageType string `json:"damageType,omitempty"`
}

// DamageEventData contains details about a damage event.
type DamageEventData struct {
	TargetID          string `json:"targetId"`
	OriginalDamage    int    `json:"originalDamage"`
	ModifiedDamage    int    `json:"modifiedDamage"`
	ResistanceApplied bool   `json:"resistanceApplied"`
	ImmunityApplied   bool   `json:"immunityApplied"`
	CurrentHP         int    `json:"currentHp"`
	Unconscious       bool   `json:"unconscious"`
	Dead              bool   `json:"dead"`
}

// HealEventData contains details about a healing event.
type HealEventData struct {
	TargetID  string `json:"targetId"`
	Healing   int    `json:"healing"`
	CurrentHP int    `json:"currentHp"`
	Conscious bool   `json:"conscious"`
}

// DeathEventData contains details about a character death event.
type DeathEventData struct {
	CombatantID   string `json:"combatantId"`
	CombatantType string `json:"combatantType"`
	KillerID      string `json:"killerId,omitempty"`
}

// ConditionEventData contains details about a condition change event.
type ConditionEventData struct {
	CombatantID string `json:"combatantId"`
	Condition   string `json:"condition"`
	Applied     bool   `json:"applied"`
}

// DeathSaveEventData contains details about a death save event.
type DeathSaveEventData struct {
	CombatantID string `json:"combatantId"`
	Roll        int    `json:"roll"`
	IsSuccess   bool   `json:"isSuccess"`
	Successes   int    `json:"successes"`
	Failures    int    `json:"failures"`
	Stable      bool   `json:"stable"`
	Dead        bool   `json:"dead"`
	RegainedHP  bool   `json:"regainedHp"`
}
