// Package types defines core enumerations and type aliases for the D&D game system.
package types

// Ability represents one of the six core ability scores in D&D 5e.
type Ability string

const (
	// Strength measures bodily power, athletic training, and the
	// capacity to exert physical force.
	Strength Ability = "strength"
	// Dexterity measures agility, reflexes, and balance.
	Dexterity Ability = "dexterity"
	// Constitution measures health, stamina, and vital force.
	Constitution Ability = "constitution"
	// Intelligence measures mental acuity, accuracy of recall,
	// and the ability to reason.
	Intelligence Ability = "intelligence"
	// Wisdom measures attunement to the world around you,
	// perception, and insight.
	Wisdom Ability = "wisdom"
	// Charisma measures your ability to interact effectively
	// with others.
	Charisma Ability = "charisma"
)

// Abilities is a slice of all ability constants, useful for iteration.
var Abilities = []Ability{Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma}

// Valid returns true if the ability is one of the defined constants.
func (a Ability) Valid() bool {
	switch a {
	case Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma:
		return true
	}
	return false
}

// Skill represents a skill that can be proficient in D&D 5e.
type Skill string

const (
	Acrobatics     Skill = "acrobatics"
	AnimalHandling Skill = "animal_handling"
	Arcana         Skill = "arcana"
	Athletics      Skill = "athletics"
	Deception      Skill = "deception"
	History        Skill = "history"
	Insight        Skill = "insight"
	Intimidation   Skill = "intimidation"
	Investigation  Skill = "investigation"
	Medicine       Skill = "medicine"
	Nature         Skill = "nature"
	Perception     Skill = "perception"
	Performance    Skill = "performance"
	Persuasion     Skill = "persuasion"
	Religion       Skill = "religion"
	SleightOfHand  Skill = "sleight_of_hand"
	Stealth        Skill = "stealth"
	Survival       Skill = "survival"
)

// SkillAbility maps each skill to its base ability.
var SkillAbility = map[Skill]Ability{
	Acrobatics:     Dexterity,
	AnimalHandling: Wisdom,
	Arcana:         Intelligence,
	Athletics:      Strength,
	Deception:      Charisma,
	History:        Intelligence,
	Insight:        Wisdom,
	Intimidation:   Charisma,
	Investigation:  Intelligence,
	Medicine:       Wisdom,
	Nature:         Intelligence,
	Perception:     Wisdom,
	Performance:    Charisma,
	Persuasion:     Charisma,
	Religion:       Intelligence,
	SleightOfHand:  Dexterity,
	Stealth:        Dexterity,
	Survival:       Wisdom,
}

// GetAbilityForSkill returns the base ability for a given skill.
func GetAbilityForSkill(skill Skill) (Ability, bool) {
	ability, ok := SkillAbility[skill]
	return ability, ok
}
