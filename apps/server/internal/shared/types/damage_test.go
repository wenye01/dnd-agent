package types

import "testing"

func TestDamageType_Valid(t *testing.T) {
	tests := []struct {
		name        string
		damageType  DamageType
		expected    bool
	}{
		{
			name:       "acid is valid",
			damageType: DamageAcid,
			expected:   true,
		},
		{
			name:       "bludgeoning is valid",
			damageType: DamageBludgeoning,
			expected:   true,
		},
		{
			name:       "cold is valid",
			damageType: DamageCold,
			expected:   true,
		},
		{
			name:       "fire is valid",
			damageType: DamageFire,
			expected:   true,
		},
		{
			name:       "force is valid",
			damageType: DamageForce,
			expected:   true,
		},
		{
			name:       "lightning is valid",
			damageType: DamageLightning,
			expected:   true,
		},
		{
			name:       "necrotic is valid",
			damageType: DamageNecrotic,
			expected:   true,
		},
		{
			name:       "piercing is valid",
			damageType: DamagePiercing,
			expected:   true,
		},
		{
			name:       "poison is valid",
			damageType: DamagePoison,
			expected:   true,
		},
		{
			name:       "psychic is valid",
			damageType: DamagePsychic,
			expected:   true,
		},
		{
			name:       "radiant is valid",
			damageType: DamageRadiant,
			expected:   true,
		},
		{
			name:       "slashing is valid",
			damageType: DamageSlashing,
			expected:   true,
		},
		{
			name:       "thunder is valid",
			damageType: DamageThunder,
			expected:   true,
		},
		{
			name:       "invalid damage type",
			damageType: DamageType("magic"),
			expected:   false,
		},
		{
			name:       "empty string is invalid",
			damageType: DamageType(""),
			expected:   false,
		},
		{
			name:       "mixed case invalid",
			damageType: DamageType("Fire"), // Constants are lowercase
			expected:   false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.damageType.Valid()
			if result != tt.expected {
				t.Errorf("Valid() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestDamageType_AllConstantsDefined(t *testing.T) {
	t.Run("13 damage types are defined", func(t *testing.T) {
		damageTypes := []DamageType{
			DamageAcid, DamageBludgeoning, DamageCold, DamageFire,
			DamageForce, DamageLightning, DamageNecrotic, DamagePiercing,
			DamagePoison, DamagePsychic, DamageRadiant, DamageSlashing,
			DamageThunder,
		}

		if len(damageTypes) != 13 {
			t.Errorf("Expected 13 damage types, got %d", len(damageTypes))
		}

		// Check for duplicates
		uniqueTypes := make(map[DamageType]bool)
		for _, dt := range damageTypes {
			if uniqueTypes[dt] {
				t.Errorf("Duplicate damage type constant: %s", dt)
			}
			uniqueTypes[dt] = true
		}

		// All should be valid
		for _, dt := range damageTypes {
			if !dt.Valid() {
				t.Errorf("Damage type constant %s is not valid", dt)
			}
		}
	})
}

func TestCondition_Valid(t *testing.T) {
	tests := []struct {
		name       string
		condition  Condition
		expected   bool
	}{
		{
			name:      "blinded is valid",
			condition: ConditionBlinded,
			expected:  true,
		},
		{
			name:      "charmed is valid",
			condition: ConditionCharmed,
			expected:  true,
		},
		{
			name:      "deafened is valid",
			condition: ConditionDeafened,
			expected:  true,
		},
		{
			name:      "frightened is valid",
			condition: ConditionFrightened,
			expected:  true,
		},
		{
			name:      "grappled is valid",
			condition: ConditionGrappled,
			expected:  true,
		},
		{
			name:      "incapacitated is valid",
			condition: ConditionIncapacitated,
			expected:  true,
		},
		{
			name:      "invisible is valid",
			condition: ConditionInvisible,
			expected:  true,
		},
		{
			name:      "paralyzed is valid",
			condition: ConditionParalyzed,
			expected:  true,
		},
		{
			name:      "petrified is valid",
			condition: ConditionPetrified,
			expected:  true,
		},
		{
			name:      "poisoned is valid",
			condition: ConditionPoisoned,
			expected:  true,
		},
		{
			name:      "prone is valid",
			condition: ConditionProne,
			expected:  true,
		},
		{
			name:      "restrained is valid",
			condition: ConditionRestrained,
			expected:  true,
		},
		{
			name:      "stunned is valid",
			condition: ConditionStunned,
			expected:  true,
		},
		{
			name:      "unconscious is valid",
			condition: ConditionUnconscious,
			expected:  true,
		},
		{
			name:      "exhaustion is valid",
			condition: ConditionExhaustion,
			expected:  true,
		},
		{
			name:      "invalid condition",
			condition: Condition("confused"),
			expected:  false,
		},
		{
			name:      "empty string is invalid",
			condition: Condition(""),
			expected:  false,
		},
		{
			name:      "mixed case invalid",
			condition: Condition("Blinded"), // Constants are lowercase
			expected:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.condition.Valid()
			if result != tt.expected {
				t.Errorf("Valid() = %v, want %v", result, tt.expected)
			}
		})
	}
}

func TestCondition_AllConstantsDefined(t *testing.T) {
	t.Run("15 conditions are defined", func(t *testing.T) {
		conditions := []Condition{
			ConditionBlinded, ConditionCharmed, ConditionDeafened, ConditionFrightened,
			ConditionGrappled, ConditionIncapacitated, ConditionInvisible, ConditionParalyzed,
			ConditionPetrified, ConditionPoisoned, ConditionProne, ConditionRestrained,
			ConditionStunned, ConditionUnconscious, ConditionExhaustion,
		}

		if len(conditions) != 15 {
			t.Errorf("Expected 15 conditions, got %d", len(conditions))
		}

		// Check for duplicates
		uniqueConditions := make(map[Condition]bool)
		for _, c := range conditions {
			if uniqueConditions[c] {
				t.Errorf("Duplicate condition constant: %s", c)
			}
			uniqueConditions[c] = true
		}

		// All should be valid
		for _, c := range conditions {
			if !c.Valid() {
				t.Errorf("Condition constant %s is not valid", c)
			}
		}
	})
}

