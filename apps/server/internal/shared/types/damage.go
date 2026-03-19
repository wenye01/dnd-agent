// Package types defines core enumerations and type aliases for the D&D game system.
package types

// DamageType represents one of the 13 damage types in D&D 5e.
type DamageType string

const (
	// DamageAcid represents acid damage.
	DamageAcid DamageType = "acid"
	// DamageBludgeoning represents bludgeoning damage (crushing force).
	DamageBludgeoning DamageType = "bludgeoning"
	// DamageCold represents cold damage.
	DamageCold DamageType = "cold"
	// DamageFire represents fire damage.
	DamageFire DamageType = "fire"
	// DamageForce represents force damage (pure magical energy).
	DamageForce DamageType = "force"
	// DamageLightning represents lightning damage.
	DamageLightning DamageType = "lightning"
	// DamageNecrotic represents necrotic damage (withering life force).
	DamageNecrotic DamageType = "necrotic"
	// DamagePiercing represents piercing damage (puncturing).
	DamagePiercing DamageType = "piercing"
	// DamagePoison represents poison damage.
	DamagePoison DamageType = "poison"
	// DamagePsychic represents psychic damage (mental assault).
	DamagePsychic DamageType = "psychic"
	// DamageRadiant represents radiant damage (divine energy).
	DamageRadiant DamageType = "radiant"
	// DamageSlashing represents slashing damage (cutting).
	DamageSlashing DamageType = "slashing"
	// DamageThunder represents thunder damage (concussive force).
	DamageThunder DamageType = "thunder"
)

// Valid returns true if the damage type is one of the defined constants.
func (d DamageType) Valid() bool {
	switch d {
	case DamageAcid, DamageBludgeoning, DamageCold, DamageFire, DamageForce,
		DamageLightning, DamageNecrotic, DamagePiercing, DamagePoison,
		DamagePsychic, DamageRadiant, DamageSlashing, DamageThunder:
		return true
	}
	return false
}

// Condition represents one of the conditions that can affect a creature in D&D 5e.
type Condition string

const (
	// ConditionBlinded - A blinded creature can't see and automatically fails
	// any ability check that requires sight.
	ConditionBlinded Condition = "blinded"
	// ConditionCharmed - A charmed creature can't attack the charmer or target
	// the charmer with harmful abilities or magical effects.
	ConditionCharmed Condition = "charmed"
	// ConditionDeafened - A deafened creature can't hear and automatically fails
	// any ability check that requires hearing.
	ConditionDeafened Condition = "deafened"
	// ConditionFrightened - A frightened creature has disadvantage on ability
	// checks and attack rolls while the source of its fear is within line of sight.
	ConditionFrightened Condition = "frightened"
	// ConditionGrappled - A grappled creature's speed becomes 0, and it can't
	// benefit from any bonus to its speed.
	ConditionGrappled Condition = "grappled"
	// ConditionIncapacitated - An incapacitated creature can't take actions or reactions.
	ConditionIncapacitated Condition = "incapacitated"
	// ConditionInvisible - An invisible creature is impossible to see without the aid
	// of magic or a special sense.
	ConditionInvisible Condition = "invisible"
	// ConditionParalyzed - A paralyzed creature is incapacitated and can't move or speak.
	ConditionParalyzed Condition = "paralyzed"
	// ConditionPetrified - A petrified creature is transformed into a solid substance.
	ConditionPetrified Condition = "petrified"
	// ConditionPoisoned - A poisoned creature has disadvantage on attack rolls and
	// ability checks.
	ConditionPoisoned Condition = "poisoned"
	// ConditionProne - A prone creature has only disadvantage on attack rolls.
	ConditionProne Condition = "prone"
	// ConditionRestrained - A restrained creature's speed becomes 0.
	ConditionRestrained Condition = "restrained"
	// ConditionStunned - A stunned creature is incapacitated, can't move, and can
	// speak only falteringly.
	ConditionStunned Condition = "stunned"
	// ConditionUnconscious - An unconscious creature is incapacitated, can't move or speak,
	// and is unaware of its surroundings.
	ConditionUnconscious Condition = "unconscious"
	// ConditionExhaustion is a special condition that has 6 levels (1-6).
	ConditionExhaustion Condition = "exhaustion"
)

// Valid returns true if the condition is one of the defined constants.
func (c Condition) Valid() bool {
	switch c {
	case ConditionBlinded, ConditionCharmed, ConditionDeafened, ConditionFrightened,
		ConditionGrappled, ConditionIncapacitated, ConditionInvisible, ConditionParalyzed,
		ConditionPetrified, ConditionPoisoned, ConditionProne, ConditionRestrained,
		ConditionStunned, ConditionUnconscious, ConditionExhaustion:
		return true
	}
	return false
}
