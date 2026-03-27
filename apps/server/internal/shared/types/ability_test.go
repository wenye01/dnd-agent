package types

import "testing"

func TestAbility_Valid(t *testing.T) {
	tests := []struct {
		name     string
		ability  Ability
		expected bool
	}{
		{
			name:     "strength is valid",
			ability:  Strength,
			expected: true,
		},
		{
			name:     "dexterity is valid",
			ability:  Dexterity,
			expected: true,
		},
		{
			name:     "constitution is valid",
			ability:  Constitution,
			expected: true,
		},
		{
			name:     "intelligence is valid",
			ability:  Intelligence,
			expected: true,
		},
		{
			name:     "wisdom is valid",
			ability:  Wisdom,
			expected: true,
		},
		{
			name:     "charisma is valid",
			ability:  Charisma,
			expected: true,
		},
		{
			name:     "invalid ability",
			ability:  Ability("luck"),
			expected: false,
		},
		{
			name:     "empty ability string",
			ability:  Ability(""),
			expected: false,
		},
		{
			name:     "mixed case invalid ability",
			ability:  Ability("Strength"), // Constants are lowercase
			expected: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.ability.Valid()
			if result != tt.expected {
				t.Errorf("Valid() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestAbilities_Constant(t *testing.T) {
	t.Run("Abilities slice contains all six abilities", func(t *testing.T) {
		if len(Abilities) != 6 {
			t.Errorf("Abilities length = %d, want 6", len(Abilities))
		}

		abilityMap := make(map[Ability]bool)
		for _, ability := range Abilities {
			abilityMap[ability] = true
		}

		expectedAbilities := []Ability{Strength, Dexterity, Constitution, Intelligence, Wisdom, Charisma}
		for _, expected := range expectedAbilities {
			if !abilityMap[expected] {
				t.Errorf("Abilities slice missing expected ability: %s", expected)
			}
		}
	})

	t.Run("all abilities in Abilities slice are valid", func(t *testing.T) {
		for _, ability := range Abilities {
			if !ability.Valid() {
				t.Errorf("Abilities slice contains invalid ability: %s", ability)
			}
		}
	})
}

func TestSkill(t *testing.T) {
	t.Run("all skill constants are defined", func(t *testing.T) {
		skills := []Skill{
			Acrobatics, AnimalHandling, Arcana, Athletics, Deception, History,
			Insight, Intimidation, Investigation, Medicine, Nature, Perception,
			Performance, Persuasion, Religion, SleightOfHand, Stealth, Survival,
		}

		if len(skills) != 18 {
			t.Errorf("Expected 18 skills, got %d", len(skills))
		}

		// Check for duplicates
		uniqueSkills := make(map[Skill]bool)
		for _, skill := range skills {
			if uniqueSkills[skill] {
				t.Errorf("Duplicate skill constant: %s", skill)
			}
			uniqueSkills[skill] = true
		}
	})
}

func TestSkillAbility(t *testing.T) {
	tests := []struct {
		name         string
		skill        Skill
		expectedAbility Ability
	}{
		{
			name:         "acrobatics uses dexterity",
			skill:        Acrobatics,
			expectedAbility: Dexterity,
		},
		{
			name:         "animal handling uses wisdom",
			skill:        AnimalHandling,
			expectedAbility: Wisdom,
		},
		{
			name:         "arcana uses intelligence",
			skill:        Arcana,
			expectedAbility: Intelligence,
		},
		{
			name:         "athletics uses strength",
			skill:        Athletics,
			expectedAbility: Strength,
		},
		{
			name:         "deception uses charisma",
			skill:        Deception,
			expectedAbility: Charisma,
		},
		{
			name:         "history uses intelligence",
			skill:        History,
			expectedAbility: Intelligence,
		},
		{
			name:         "insight uses wisdom",
			skill:        Insight,
			expectedAbility: Wisdom,
		},
		{
			name:         "intimidation uses charisma",
			skill:        Intimidation,
			expectedAbility: Charisma,
		},
		{
			name:         "investigation uses intelligence",
			skill:        Investigation,
			expectedAbility: Intelligence,
		},
		{
			name:         "medicine uses wisdom",
			skill:        Medicine,
			expectedAbility: Wisdom,
		},
		{
			name:         "nature uses intelligence",
			skill:        Nature,
			expectedAbility: Intelligence,
		},
		{
			name:         "perception uses wisdom",
			skill:        Perception,
			expectedAbility: Wisdom,
		},
		{
			name:         "performance uses charisma",
			skill:        Performance,
			expectedAbility: Charisma,
		},
		{
			name:         "persuasion uses charisma",
			skill:        Persuasion,
			expectedAbility: Charisma,
		},
		{
			name:         "religion uses intelligence",
			skill:        Religion,
			expectedAbility: Intelligence,
		},
		{
			name:         "sleight of hand uses dexterity",
			skill:        SleightOfHand,
			expectedAbility: Dexterity,
		},
		{
			name:         "stealth uses dexterity",
			skill:        Stealth,
			expectedAbility: Dexterity,
		},
		{
			name:         "survival uses wisdom",
			skill:        Survival,
			expectedAbility: Wisdom,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ability, ok := GetAbilityForSkill(tt.skill)
			if !ok {
				t.Errorf("GetAbilityForSkill(%s) returned false", tt.skill)
			}
			if ability != tt.expectedAbility {
				t.Errorf("GetAbilityForSkill(%s) = %s, want %s", tt.skill, ability, tt.expectedAbility)
			}
		})
	}
}

func TestGetAbilityForSkill(t *testing.T) {
	t.Run("returns false for invalid skill", func(t *testing.T) {
		_, ok := GetAbilityForSkill(Skill("jump"))
		if ok {
			t.Error("GetAbilityForSkill() should return false for invalid skill")
		}
	})

	t.Run("returns false for empty skill", func(t *testing.T) {
		_, ok := GetAbilityForSkill(Skill(""))
		if ok {
			t.Error("GetAbilityForSkill() should return false for empty skill")
		}
	})

	t.Run("all mapped abilities are valid", func(t *testing.T) {
		for skill, ability := range SkillAbility {
			if !ability.Valid() {
				t.Errorf("Skill %s maps to invalid ability: %s", skill, ability)
			}
		}
	})
}

func TestSkillAbility_Coverage(t *testing.T) {
	t.Run("all skills have an ability mapping", func(t *testing.T) {
		allSkills := []Skill{
			Acrobatics, AnimalHandling, Arcana, Athletics, Deception, History,
			Insight, Intimidation, Investigation, Medicine, Nature, Perception,
			Performance, Persuasion, Religion, SleightOfHand, Stealth, Survival,
		}

		for _, skill := range allSkills {
			_, ok := GetAbilityForSkill(skill)
			if !ok {
				t.Errorf("Skill %s has no ability mapping", skill)
			}
		}
	})
}

