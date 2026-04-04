// Package character provides character creation and management functionality.
//
// Current Implementation Scope (B212 - v0.3):
// - Character creation with 9 races (human, elf, dwarf, halfling, dragonborn, gnome, half-elf, half-orc, tiefling)
//   and 11 classes (fighter, wizard, rogue, cleric, bard, druid, monk, paladin, ranger, sorcerer, warlock)
// - Racial ability score bonuses and traits
// - Class-based HP, saving throws, and skill selection
// - Background skill proficiencies
// - Starting gold based on class
//
// Future Enhancement Candidates:
// - Subraces (e.g., High Elf, Hill Dwarf)
// - Feat selection at level 1 (variant human)
// - Equipment packs based on background/class
// - Spell selection for spellcasting classes
// - Character advancement (leveling up)
package character

import (
	"fmt"
	"strings"

	"github.com/dnd-game/server/internal/shared/models"
	"github.com/dnd-game/server/internal/shared/types"
	"github.com/google/uuid"
)

// Default values for character creation.
const (
	defaultBaseHP   = 8  // Default base HP when class hit dice lookup fails
	defaultSpeed    = 30 // Default movement speed in feet
	minHP           = 1  // Minimum HP for any character
	defaultAbility  = 10 // Default ability score
)

// ID prefix for character entities.
const characterIDPrefix = "char"

// Ability score limits.
const (
	minAbilityScore = 1
	maxAbilityScore = 20
)

// Supported race names.
const (
	RaceHuman     = "human"
	RaceElf       = "elf"
	RaceDwarf     = "dwarf"
	RaceHalfling  = "halfling"
	RaceDragonborn = "dragonborn"
	RaceGnome     = "gnome"
	RaceHalfElf   = "half-elf"
	RaceHalfOrc   = "half-orc"
	RaceTiefling  = "tiefling"
)

// Supported class names.
const (
	ClassFighter  = "fighter"
	ClassWizard   = "wizard"
	ClassRogue    = "rogue"
	ClassCleric   = "cleric"
	ClassBard     = "bard"
	ClassDruid    = "druid"
	ClassMonk     = "monk"
	ClassPaladin  = "paladin"
	ClassRanger   = "ranger"
	ClassSorcerer = "sorcerer"
	ClassWarlock  = "warlock"
)

// RaceConfig holds configuration for a playable race.
type RaceConfig struct {
	Name         string
	Speed        int
	Traits       []models.RaceTrait
	AbilityBonus map[types.Ability]int // Ability score bonuses (e.g., human: +1 to all)
}

// ClassConfig holds configuration for a playable class.
type ClassConfig struct {
	Name              string
	HitDice           int
	SavingThrows      []types.Ability
	Skills            []types.Skill // Class skill proficiencies (choose from)
	SkillChoices      int           // Number of skills to choose
	StartingGoldDice  string        // D&D 5e starting wealth formula
	StartingGoldAvg   int           // Simplified average for quick creation
}

// BackgroundConfig holds configuration for a character background.
type BackgroundConfig struct {
	Name        string
	Skills      []types.Skill // Background skill proficiencies
	Description string
}

// Supported races configuration with traits.
var raceConfigs = map[string]RaceConfig{
	"human": {
		Name:  "human",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Ability Score Increase", Description: "+1 to all ability scores"},
			{Name: "Languages", Description: "Common, one extra language"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Strength:     1,
			types.Dexterity:    1,
			types.Constitution: 1,
			types.Intelligence: 1,
			types.Wisdom:       1,
			types.Charisma:     1,
		},
	},
	"elf": {
		Name:  "elf",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Keen Senses", Description: "Proficiency in Perception"},
			{Name: "Fey Ancestry", Description: "Advantage on saves against charm, immunity to sleep"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Dexterity: 2,
		},
	},
	"dwarf": {
		Name:  "dwarf",
		Speed: 25,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Dwarven Resilience", Description: "Advantage on saves against poison, resistance to poison damage"},
			{Name: "Stonecunning", Description: "Double proficiency on History checks related to stonework"},
			{Name: "Dwarven Combat Training", Description: "Proficiency with battleaxe, handaxe, light hammer, and warhammer"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Constitution: 2,
		},
	},
	// TODO(B212-followup): halfling has two subraces with different ability bonuses:
	//   - Lightfoot: +2 DEX, +1 CHA (also can hide behind larger creatures)
	//   - Stout:    +2 DEX, +1 CON (also advantage against poison, resistance to poison damage)
	// Current implementation uses a generic halfling (+2 DEX only). To fully support:
	//   - Add Subrace string field to RaceConfig or CreateParams
	//   - Define separate ability bonus maps per subrace
	//   - Add subrace-specific traits (e.g., Stout Resilience)
	"halfling": {
		Name:  "halfling",
		Speed: 25,
		Traits: []models.RaceTrait{
			{Name: "Lucky", Description: "Reroll 1s on attack rolls, ability checks, and saving throws"},
			{Name: "Brave", Description: "Advantage on saving throws against being frightened"},
			{Name: "Halfling Nimbleness", Description: "Can move through the space of any creature larger than you"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Dexterity: 2,
		},
	},
	// TODO(B212-followup): dragonborn must choose a draconic ancestry (black/blue/green/red/white/brass/bronze/copper/gold/silver),
	// which determines breath weapon damage type and damage resistance. To fully support this:
	//   - Add DraconicAncestry string field to RaceConfig or CreateParams
	//   - Map ancestry -> damage type (e.g., black=acid, blue=lightning, fire=red/gold/brass)
	//   - Store the choice on the Character model for breath weapon / resistance logic
	"dragonborn": {
		Name:  "dragonborn",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Draconic Ancestry", Description: "Choose a dragon ancestor, which determines breath weapon damage type and resistance (not yet selectable; defaults to generic)"},
			{Name: "Breath Weapon", Description: "Exhale destructive energy based on draconic ancestry (DC 8 + CON mod + proficiency)"},
			{Name: "Damage Resistance", Description: "Resistance to the damage type associated with your draconic ancestry"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Strength: 2,
			types.Charisma: 1,
		},
	},
	// TODO(B212-followup): gnome has two subraces with different ability bonuses:
	//   - Forest gnome: +2 INT, +1 DEX (also Speak with Small Beasts, minor illusion cantrip)
	//   - Rock gnome:   +2 INT, +1 CON (also Artificer's Lore: tinker's tools history insight)
	// Current implementation uses a generic gnome (+2 INT only). To fully support:
	//   - Add Subrace string field to RaceConfig or CreateParams
	//   - Define separate ability bonus maps and trait lists per subrace
	"gnome": {
		Name:  "gnome",
		Speed: 25,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Gnome Cunning", Description: "Advantage on Intelligence, Wisdom, and Charisma saving throws against magic"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Intelligence: 2,
		},
	},
	// TODO(B212-followup): half-elf SRD grants +2 CHA and +1 to two other abilities of player's choice.
	// Current implementation only applies CHA +2. To fully support this:
	//   - Add ExtraAbilityBonuses []types.Ability to CreateParams or RaceConfig
	//   - Validate that the two chosen abilities are not CHA (already covered by the +2)
	//   - Apply them in CreateBasic alongside the fixed AbilityBonus map
	"half-elf": {
		Name:  "half-elf",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Fey Ancestry", Description: "Advantage on saves against charm, immunity to sleep"},
			{Name: "Skill Versatility", Description: "Proficiency in two skills of your choice"},
			{Name: "Ability Score Increase", Description: "+2 Charisma, and +1 to two other ability scores of your choice (not yet automated; adjust manually)"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Charisma: 2,
			// TODO(B212-followup): SRD half-elf also gets +1 to two abilities of player's choice
		},
	},
	"half-orc": {
		Name:  "half-orc",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Relentless Endurance", Description: "When reduced to 0 HP, drop to 1 HP instead (once per long rest)"},
			{Name: "Savage Attacks", Description: "Roll one additional weapon damage die on critical hits"},
			{Name: "Menacing", Description: "Proficiency in Intimidation"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Strength: 2,
			types.Constitution: 1,
		},
	},
	"tiefling": {
		Name:  "tiefling",
		Speed: 30,
		Traits: []models.RaceTrait{
			{Name: "Darkvision", Description: "60 feet"},
			{Name: "Hellish Resistance", Description: "Resistance to fire damage"},
			{Name: "Hellish Rebuke", Description: "Cast hellish rebuke as a 2nd-level spell once per long rest (DC 8 + CHA mod + proficiency)"},
			{Name: "Infernal Legacy", Description: "Know thaumaturgy cantrip; at level 3, hellish rebuke; at level 5, darkness"},
		},
		AbilityBonus: map[types.Ability]int{
			types.Charisma: 2,
			types.Intelligence: 1,
		},
	},
}

// Supported classes configuration.
var classConfigs = map[string]ClassConfig{
	"fighter": {
		Name:              "fighter",
		HitDice:           10,
		SavingThrows:      []types.Ability{types.Strength, types.Constitution},
		Skills:            []types.Skill{types.Acrobatics, types.AnimalHandling, types.Athletics, types.History, types.Insight, types.Intimidation, types.Perception, types.Survival},
		SkillChoices:      2,
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"wizard": {
		Name:              "wizard",
		HitDice:           6,
		SavingThrows:      []types.Ability{types.Intelligence, types.Wisdom},
		Skills:            []types.Skill{types.Arcana, types.History, types.Insight, types.Investigation, types.Medicine, types.Religion},
		SkillChoices:      2,
		StartingGoldDice:  "3d6 x 10 gp",
		StartingGoldAvg:   105, // Average of 3d6 is 10.5, x 10 = 105
	},
	"rogue": {
		Name:              "rogue",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Dexterity, types.Intelligence},
		Skills:            []types.Skill{types.Acrobatics, types.Athletics, types.Deception, types.Insight, types.Intimidation, types.Investigation, types.Perception, types.Performance, types.Persuasion, types.SleightOfHand, types.Stealth},
		SkillChoices:      4,
		StartingGoldDice:  "4d4 x 10 gp",
		StartingGoldAvg:   100, // Average of 4d4 is 10, x 10 = 100
	},
	"cleric": {
		Name:              "cleric",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Wisdom, types.Charisma},
		Skills:            []types.Skill{types.History, types.Insight, types.Medicine, types.Persuasion, types.Religion},
		SkillChoices:      2,
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"bard": {
		Name:              "bard",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Dexterity, types.Charisma},
		Skills:            []types.Skill{types.Acrobatics, types.AnimalHandling, types.Arcana, types.Athletics, types.Deception, types.History, types.Insight, types.Intimidation, types.Investigation, types.Medicine, types.Nature, types.Perception, types.Performance, types.Persuasion, types.Religion, types.SleightOfHand, types.Stealth, types.Survival},
		SkillChoices:      3,
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"druid": {
		Name:              "druid",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Intelligence, types.Wisdom},
		Skills:            []types.Skill{types.Arcana, types.AnimalHandling, types.Insight, types.Medicine, types.Nature, types.Perception, types.Religion, types.Survival},
		SkillChoices:      2,
		StartingGoldDice:  "2d6 x 10 gp",
		StartingGoldAvg:   70, // Average of 2d6 is 7, x 10 = 70
	},
	"monk": {
		Name:              "monk",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Strength, types.Dexterity},
		Skills:            []types.Skill{types.Acrobatics, types.Athletics, types.History, types.Insight, types.Religion, types.Stealth},
		SkillChoices:      2,
		StartingGoldDice:  "5d4 gp",
		StartingGoldAvg:   12, // Average of 5d4 is 12.5
	},
	"paladin": {
		Name:              "paladin",
		HitDice:           10,
		SavingThrows:      []types.Ability{types.Wisdom, types.Charisma},
		Skills:            []types.Skill{types.Athletics, types.Insight, types.Intimidation, types.Medicine, types.Persuasion, types.Religion},
		SkillChoices:      2,
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"ranger": {
		Name:              "ranger",
		HitDice:           10,
		SavingThrows:      []types.Ability{types.Strength, types.Dexterity},
		Skills:            []types.Skill{types.AnimalHandling, types.Athletics, types.Insight, types.Investigation, types.Nature, types.Perception, types.Stealth, types.Survival},
		SkillChoices:      3,
		StartingGoldDice:  "5d4 x 10 gp",
		StartingGoldAvg:   125, // Average of 5d4 is 12.5, x 10 = 125
	},
	"sorcerer": {
		Name:              "sorcerer",
		HitDice:           6,
		SavingThrows:      []types.Ability{types.Constitution, types.Charisma},
		Skills:            []types.Skill{types.Arcana, types.Deception, types.Insight, types.Intimidation, types.Persuasion, types.Religion},
		SkillChoices:      2,
		StartingGoldDice:  "3d6 x 10 gp",
		StartingGoldAvg:   105, // Average of 3d6 is 10.5, x 10 = 105
	},
	"warlock": {
		Name:              "warlock",
		HitDice:           8,
		SavingThrows:      []types.Ability{types.Wisdom, types.Charisma},
		Skills:            []types.Skill{types.Arcana, types.Deception, types.History, types.Investigation, types.Nature, types.Religion},
		SkillChoices:      2,
		StartingGoldDice:  "4d4 x 10 gp",
		StartingGoldAvg:   100, // Average of 4d4 is 10, x 10 = 100
	},
}

// Supported backgrounds configuration.
var backgroundConfigs = map[string]BackgroundConfig{
	"sage": {
		Name:        "sage",
		Skills:      []types.Skill{types.Arcana, types.History},
		Description: "You spent years learning the lore of the multiverse.",
	},
	"soldier": {
		Name:        "soldier",
		Skills:      []types.Skill{types.Athletics, types.Intimidation},
		Description: "You have served in a military organization.",
	},
	"criminal": {
		Name:        "criminal",
		Skills:      []types.Skill{types.Deception, types.Stealth},
		Description: "You have a criminal past.",
	},
	"commoner": {
		Name:        "commoner",
		Skills:      []types.Skill{types.Insight, types.Perception},
		Description: "You live a simple life among the common folk.",
	},
	"urchin": {
		Name:        "urchin",
		Skills:      []types.Skill{types.SleightOfHand, types.Stealth},
		Description: "You grew up on the streets alone, impoverished, and making your own way.",
	},
	"folk_hero": {
		Name:        "folk_hero",
		Skills:      []types.Skill{types.AnimalHandling, types.Survival},
		Description: "You come from a humble social rank, but you are destined for so much more.",
	},
	"noble": {
		Name:        "noble",
		Skills:      []types.Skill{types.History, types.Persuasion},
		Description: "You understand wealth, power, and privilege. You carry a noble title.",
	},
	"outlander": {
		Name:        "outlander",
		Skills:      []types.Skill{types.Athletics, types.Survival},
		Description: "You grew up in the wilds, far from civilization and the comforts of town and technology.",
	},
	"entertainer": {
		Name:        "entertainer",
		Skills:      []types.Skill{types.Acrobatics, types.Performance},
		Description: "You thrive in front of an audience and know how to entrance, entertain, and mesmerize.",
	},
	"acolyte": {
		Name:        "acolyte",
		Skills:      []types.Skill{types.Insight, types.Religion},
		Description: "You have spent your life in the service of a temple to a specific god or pantheon of gods.",
	},
}

// CreateParams defines the parameters for creating a basic character.
type CreateParams struct {
	Name          string          `json:"name"`
	Race          string          `json:"race"`
	Class         string          `json:"class"`
	Background    string          `json:"background"`
	AbilityScores map[string]int  `json:"abilityScores"`
	SkillChoices  []types.Skill   `json:"skillChoices,omitempty"` // Optional: chosen class skills
}

// CreateBasic creates a new character with the given parameters.
// It calculates derived stats including HP, AC, proficiency bonus, and speed.
func CreateBasic(params CreateParams) (*models.Character, error) {
	// Validate name
	if strings.TrimSpace(params.Name) == "" {
		return nil, fmt.Errorf("character name cannot be empty")
	}

	// Normalize and validate race (case-insensitive)
	race := strings.ToLower(strings.TrimSpace(params.Race))
	raceConfig, ok := raceConfigs[race]
	if !ok {
		return nil, fmt.Errorf("unsupported race: %s (supported: %s)", params.Race, strings.Join(GetSupportedRaces(), ", "))
	}

	// Normalize and validate class (case-insensitive)
	class := strings.ToLower(strings.TrimSpace(params.Class))
	classConfig, ok := classConfigs[class]
	if !ok {
		return nil, fmt.Errorf("unsupported class: %s (supported: %s)", params.Class, strings.Join(GetSupportedClasses(), ", "))
	}

	// Normalize and validate background (case-insensitive)
	background := strings.ToLower(strings.TrimSpace(params.Background))
	backgroundConfig, ok := backgroundConfigs[background]
	if !ok {
		return nil, fmt.Errorf("unsupported background: %s (supported: %s)", params.Background, strings.Join(GetSupportedBackgrounds(), ", "))
	}

	// Validate ability scores (before racial bonuses)
	//
	// TODO(future): Add post-bonus cap validation (D&D 5e max is 20 for most races).
	// Current implementation allows scores up to 20 before bonuses, which may result
	// in scores exceeding 20 after racial bonuses are applied (e.g., elf with 20 DEX).
	// Consider: Add maxAfterBonus constant and clamp/validate after applying bonuses.
	for ability, score := range params.AbilityScores {
		if score < minAbilityScore || score > maxAbilityScore {
			return nil, fmt.Errorf("ability score %s out of range [%d, %d]: %d", ability, minAbilityScore, maxAbilityScore, score)
		}
	}

	// Start with level 1
	level := 1

	// Build ability scores with validation
	stats := models.AbilityScores{
		Strength:     getAbilityScore(params.AbilityScores, "str"),
		Dexterity:    getAbilityScore(params.AbilityScores, "dex"),
		Constitution: getAbilityScore(params.AbilityScores, "con"),
		Intelligence: getAbilityScore(params.AbilityScores, "int"),
		Wisdom:       getAbilityScore(params.AbilityScores, "wis"),
		Charisma:     getAbilityScore(params.AbilityScores, "cha"),
	}

	// Apply racial ability bonuses
	stats.Strength += raceConfig.AbilityBonus[types.Strength]
	stats.Dexterity += raceConfig.AbilityBonus[types.Dexterity]
	stats.Constitution += raceConfig.AbilityBonus[types.Constitution]
	stats.Intelligence += raceConfig.AbilityBonus[types.Intelligence]
	stats.Wisdom += raceConfig.AbilityBonus[types.Wisdom]
	stats.Charisma += raceConfig.AbilityBonus[types.Charisma]

	// Calculate HP: class hit dice + CON modifier
	maxHP := classConfig.HitDice + stats.GetModifier(types.Constitution)
	if maxHP < minHP {
		maxHP = minHP
	}

	// Calculate AC: 10 + DEX modifier (no armor)
	//
	// TODO(future): Support armor-based AC calculations:
	// - Light armor: AC from armor + DEX modifier (no limit)
	// - Medium armor: AC from armor + DEX modifier (max +2)
	// - Heavy armor: AC from armor only (no DEX bonus)
	// - Shields: +2 AC when equipped
	// - Natural armor: Use creature's natural AC formula
	ac := 10 + stats.GetModifier(types.Dexterity)

	// Calculate proficiency bonus for level
	profBonus := ProficiencyBonusForLevel(level)

	// Initialize saving throws based on class
	savingThrows := make(map[types.Ability]bool)
	for _, ability := range classConfig.SavingThrows {
		savingThrows[ability] = true
	}

	// Initialize skill proficiencies
	skills := make(map[types.Skill]bool)

	// Add background skills
	for _, skill := range backgroundConfig.Skills {
		skills[skill] = true
	}

	// Validate and add chosen class skills
	if len(params.SkillChoices) > 0 {
		validClassSkills := make(map[types.Skill]bool)
		for _, skill := range classConfig.Skills {
			validClassSkills[skill] = true
		}

		for _, skill := range params.SkillChoices {
			if !validClassSkills[skill] {
				return nil, fmt.Errorf("skill %s is not available for class %s", skill, class)
			}
			if skills[skill] {
				return nil, fmt.Errorf("skill %s is already granted by background", skill)
			}
			skills[skill] = true
		}
	}

	char := &models.Character{
		ID:               generateID(),
		Name:             params.Name,
		Race:             race,       // Use normalized value
		Class:            class,      // Use normalized value
		Level:            level,
		HP:               maxHP,
		MaxHP:            maxHP,
		AC:               ac,
		Stats:            stats,
		Skills:           skills,
		Inventory:        []models.Item{},
		Conditions:       []types.Condition{},
		Background:       background, // Use normalized value
		ProficiencyBonus: profBonus,
		SavingThrows:     savingThrows,
		Speed:            raceConfig.Speed,
		Gold:             classConfig.StartingGoldAvg,
		RacialTraits:     raceConfig.Traits,
	}

	return char, nil
}

// abilityKeyAliases maps short ability keys to their full-name equivalents.
// This allows the API to accept both "str" and "strength" as valid keys.
var abilityKeyAliases = map[string]string{
	"str": "strength",
	"dex": "dexterity",
	"con": "constitution",
	"int": "intelligence",
	"wis": "wisdom",
	"cha": "charisma",
}

// getAbilityScore retrieves an ability score from the map with a default value.
//
// Behavior:
// - Accepts both short keys ("str", "dex", etc.) and full keys ("strength", "dexterity", etc.)
// - Returns the score if either key form exists
// - Returns defaultAbility (10) if neither form is found
func getAbilityScore(scores map[string]int, key string) int {
	if val, ok := scores[key]; ok {
		return val
	}
	if alias, ok := abilityKeyAliases[key]; ok {
		if val, ok := scores[alias]; ok {
			return val
		}
	}
	return defaultAbility
}

// generateID generates a unique ID for the character using UUID.
func generateID() string {
	return fmt.Sprintf("%s-%s", characterIDPrefix, uuid.New().String())
}

// ProficiencyBonusForLevel calculates the proficiency bonus for a given level.
// Bonus starts at +2 and increases at levels 5, 9, 13, and 17.
func ProficiencyBonusForLevel(level int) int {
	switch {
	case level >= 17:
		return 6
	case level >= 13:
		return 5
	case level >= 9:
		return 4
	case level >= 5:
		return 3
	default:
		return 2
	}
}

// GetSupportedRaces returns a list of all supported race names.
func GetSupportedRaces() []string {
	races := make([]string, 0, len(raceConfigs))
	for race := range raceConfigs {
		races = append(races, race)
	}
	return races
}

// GetSupportedClasses returns a list of all supported class names.
func GetSupportedClasses() []string {
	classes := make([]string, 0, len(classConfigs))
	for class := range classConfigs {
		classes = append(classes, class)
	}
	return classes
}

// GetSupportedBackgrounds returns a list of all supported background names.
func GetSupportedBackgrounds() []string {
	backgrounds := make([]string, 0, len(backgroundConfigs))
	for bg := range backgroundConfigs {
		backgrounds = append(backgrounds, bg)
	}
	return backgrounds
}

// GetRaceConfig returns the configuration for a specific race.
func GetRaceConfig(race string) (RaceConfig, bool) {
	config, ok := raceConfigs[strings.ToLower(race)]
	return config, ok
}

// GetClassConfig returns the configuration for a specific class.
func GetClassConfig(class string) (ClassConfig, bool) {
	config, ok := classConfigs[strings.ToLower(class)]
	return config, ok
}

// GetBackgroundConfig returns the configuration for a specific background.
func GetBackgroundConfig(background string) (BackgroundConfig, bool) {
	config, ok := backgroundConfigs[strings.ToLower(background)]
	return config, ok
}
