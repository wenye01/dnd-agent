// Package models provides the core data models for the D&D game.
package models

// EquipmentSlot represents an equipment slot on a character.
type EquipmentSlot string

const (
	SlotMainHand EquipmentSlot = "main_hand"
	SlotOffHand  EquipmentSlot = "off_hand"
	SlotHead     EquipmentSlot = "head"
	SlotChest    EquipmentSlot = "chest"
	SlotHands    EquipmentSlot = "hands"
	SlotFeet     EquipmentSlot = "feet"
	SlotCloak    EquipmentSlot = "cloak"
	SlotNeck     EquipmentSlot = "neck"
	SlotRing1    EquipmentSlot = "ring1"
	SlotRing2    EquipmentSlot = "ring2"
	SlotBelt     EquipmentSlot = "belt"
)

// InventoryItem extends Item with additional fields for inventory management.
type InventoryItem struct {
	ID                 string  `json:"id"`
	Name               string  `json:"name"`
	Description        string  `json:"description"`
	Type               string  `json:"type"`
	Weight             float64 `json:"weight"`
	Value              int     `json:"value"`
	Rarity             string  `json:"rarity"`
	Stackable          bool    `json:"stackable"`
	MaxStack           int     `json:"maxStack"`
	Quantity           int     `json:"quantity"`
	RequiresAttunement bool    `json:"requiresAttunement"`
	Equipped           bool    `json:"equipped"`
	EquipmentSlot      EquipmentSlot `json:"equipmentSlot,omitempty"`
}

// Weapon represents a weapon item in the game.
type Weapon struct {
	Item
	WeaponCategory string      `json:"weaponCategory"` // simple, martial
	WeaponType     string      `json:"weaponType"`     // melee, ranged
	DamageType     string      `json:"damageType"`
	Damage         DiceFormula `json:"damage"`
	Range          WeaponRange `json:"range"`
	Properties     []string    `json:"properties"`
}

// Armor represents an armor item in the game.
type Armor struct {
	Item
	ArmorCategory      string `json:"armorCategory"` // light, medium, heavy, shield
	ArmorType          string `json:"armorType"`     // padded, leather, chain_shirt, etc.
	BaseAC             int    `json:"baseAc"`
	DexBonus           string `json:"dexBonus"`      // none, full, limited
	MaxDexBonus        int    `json:"maxDexBonus"`
	StrengthReq        int    `json:"strengthReq"`
	StealthDisadvantage bool  `json:"stealthDisadvantage"`
}

// Consumable represents a consumable item in the game.
type Consumable struct {
	Item
	ConsumableType string           `json:"consumableType"` // potion, scroll, food, ammunition
	Uses           int              `json:"uses"`
	MaxUses        int              `json:"maxUses"`
	Effect         ConsumableEffect `json:"effect"`
}

// DiceFormula represents a dice roll formula (e.g., 2d6).
type DiceFormula struct {
	Count int `json:"count"`
	Size  int `json:"size"`
}

// WeaponRange represents the range of a weapon.
type WeaponRange struct {
	Normal int `json:"normal"`
	Long   int `json:"long"`
}

// ConsumableEffect describes the effect of using a consumable item.
type ConsumableEffect struct {
	Type       string `json:"type"`       // heal, damage, buff, utility
	DiceCount  int    `json:"diceCount"`
	DiceSize   int    `json:"diceSize"`
	BonusValue int    `json:"bonusValue"`
	Duration   int    `json:"duration"` // rounds, 0 = instantaneous
}

// Equipment represents a character's equipped items.
type Equipment struct {
	Slots map[EquipmentSlot]*InventoryItem `json:"slots"`
}

// InventoryData represents a character's full inventory.
type InventoryData struct {
	Items   []InventoryItem `json:"items"`
	Gold    int             `json:"gold"`
	Silver  int             `json:"silver"`
	Copper  int             `json:"copper"`
	Capacity int            `json:"capacity"`
}

// Rarity constants for items.
const (
	RarityCommon    = "common"
	RarityUncommon  = "uncommon"
	RarityRare      = "rare"
	RarityVeryRare  = "very_rare"
	RarityLegendary = "legendary"
	RarityArtifact  = "artifact"
)

// Weapon property constants.
const (
	WeaponPropertyAmmunition = "ammunition"
	WeaponPropertyFinesse    = "finesse"
	WeaponPropertyHeavy      = "heavy"
	WeaponPropertyLight      = "light"
	WeaponPropertyLoading    = "loading"
	WeaponPropertyRange      = "range"
	WeaponPropertyReach      = "reach"
	WeaponPropertySpecial    = "special"
	WeaponPropertyThrown     = "thrown"
	WeaponPropertyTwoHanded  = "two_handed"
	WeaponPropertyVersatile  = "versatile"
)
