# 物品系统设计

> **模块名称**: item
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

物品系统负责 D&D 5e 物品规则的实施：
- 物品数据管理（武器、护甲、装备、消耗品）
- 背包管理（携带、堆叠、重量）
- 装备管理（穿戴、卸下、槽位）
- 物品使用（消耗品、魔法物品）
- 金币和交易

### 1.2 模块边界

**包含**：
- 物品数据模型和效果定义
- 背包容量和重量计算
- 装备槽位管理
- 消耗品使用和效果应用
- 魔法物品激活

**不包含**：
- 武器攻击计算（由战斗系统负责）
- 护甲 AC 计算（由角色系统负责）
- 交易 UI（由前端负责）

---

## 2. 目录结构

```
internal/server/item/
├── item.go                # 物品基础模型
├── weapon.go              # 武器定义
├── armor.go               # 护甲定义
├── equipment.go           # 装备定义
├── consumable.go          # 消耗品定义
├── magic_item.go          # 魔法物品
├── inventory.go           # 背包管理
├── equipment_slots.go     # 装备槽位
├── usage.go               # 物品使用
├── weight.go              # 重量计算
└── loader.go              # 物品数据加载
```

---

## 3. 数据模型

### 3.1 物品基础模型

```go
// internal/server/item/item.go

type Item struct {
    ID          string     `json:"id"`
    Name        string     `json:"name"`
    Description string     `json:"description"`
    Type        ItemType   `json:"type"`
    Rarity      Rarity     `json:"rarity"`
    Weight      float64    `json:"weight"`      // 磅
    Value       int        `json:"value"`       // 铜币
    Stackable   bool       `json:"stackable"`
    MaxStack    int        `json:"maxStack"`
    RequiresAttunement bool `json:"requiresAttunement"`
}

type ItemID string

type ItemType string

const (
    ItemTypeWeapon     ItemType = "weapon"
    ItemTypeArmor      ItemType = "armor"
    ItemTypeShield     ItemType = "shield"
    ItemTypePotion     ItemType = "potion"
    ItemTypeScroll     ItemType = "scroll"
    ItemTypeWondrous   ItemType = "wondrous"
    ItemTypeRing       ItemType = "ring"
    ItemTypeWand       ItemType = "wand"
    ItemTypeRod        ItemType = "rod"
    ItemTypeStaff      ItemType = "staff"
    ItemTypeAmmunition ItemType = "ammunition"
    ItemTypeTool       ItemType = "tool"
    ItemTypeGear       ItemType = "gear"
    ItemTypeTreasure   ItemType = "treasure"
)

type Rarity string

const (
    RarityCommon    Rarity = "common"
    RarityUncommon  Rarity = "uncommon"
    RarityRare      Rarity = "rare"
    RarityVeryRare  Rarity = "very_rare"
    RarityLegendary Rarity = "legendary"
    RarityArtifact  Rarity = "artifact"
)
```

### 3.2 武器模型

```go
// internal/server/item/weapon.go

type Weapon struct {
    Item
    WeaponCategory WeaponCategory `json:"weaponCategory"`
    WeaponType     WeaponType     `json:"weaponType"`
    Damage         DamageDice     `json:"damage"`
    DamageType     DamageType     `json:"damageType"`
    Range          WeaponRange    `json:"range"`
    Properties     []WeaponProperty `json:"properties"`
    Weight         float64        `json:"weight"`
    TwoHanded      bool           `json:"twoHanded"`
    Versatile      *DamageDice    `json:"versatile,omitempty"`
}

type WeaponCategory string

const (
    WeaponCategorySimple  WeaponCategory = "simple"
    WeaponCategoryMartial WeaponCategory = "martial"
)

type WeaponType string

const (
    WeaponTypeMelee   WeaponType = "melee"
    WeaponTypeRanged  WeaponType = "ranged"
)

type DamageDice struct {
    Count int `json:"count"` // 骰子数量
    Size  int `json:"size"`  // 骰子面数
}

type WeaponRange struct {
    Normal int `json:"normal"` // 近战为触及距离，远程为正常射程
    Long   int `json:"long,omitempty"` // 远程长距离
}

type WeaponProperty string

const (
    PropertyAmmunition  WeaponProperty = "ammunition"
    PropertyFinesse     WeaponProperty = "finesse"
    PropertyHeavy       WeaponProperty = "heavy"
    PropertyLight       WeaponProperty = "light"
    PropertyLoading     WeaponProperty = "loading"
    PropertyReach       WeaponProperty = "reach"
    PropertySpecial     WeaponProperty = "special"
    PropertyThrown      WeaponProperty = "thrown"
    PropertyTwoHanded   WeaponProperty = "two_handed"
    PropertyVersatile   WeaponProperty = "versatile"
)
```

### 3.3 护甲模型

```go
// internal/server/item/armor.go

type Armor struct {
    Item
    ArmorCategory ArmorCategory `json:"armorCategory"`
    ArmorType     ArmorType     `json:"armorType"`
    BaseAC        int           `json:"baseAc"`
    DexBonus      DexBonusType  `json:"dexBonus"`
    MaxDexBonus   int           `json:"maxDexBonus,omitempty"`
    StrengthReq   int           `json:"strengthReq,omitempty"`
    StealthDisadvantage bool    `json:"stealthDisadvantage"`
    Weight        float64       `json:"weight"`
}

type ArmorCategory string

const (
    ArmorCategoryLight   ArmorCategory = "light"
    ArmorCategoryMedium  ArmorCategory = "medium"
    ArmorCategoryHeavy   ArmorCategory = "heavy"
)

type ArmorType string

const (
    ArmorTypePadded     ArmorType = "padded"
    ArmorTypeLeather    ArmorType = "leather"
    ArmorTypeStudded    ArmorType = "studded_leather"
    ArmorTypeHide       ArmorType = "hide"
    ArmorTypeChainShirt ArmorType = "chain_shirt"
    ArmorTypeScale      ArmorType = "scale_mail"
    ArmorTypeBreastplate ArmorType = "breastplate"
    ArmorTypeHalfPlate  ArmorType = "half_plate"
    ArmorTypeRing       ArmorType = "ring_mail"
    ArmorTypeChain      ArmorType = "chain_mail"
    ArmorTypeSplint     ArmorType = "splint"
    ArmorTypePlate      ArmorType = "plate"
)

type DexBonusType string

const (
    DexBonusFull    DexBonusType = "full"
    DexBonusLimited DexBonusType = "limited"
    DexBonusNone    DexBonusType = "none"
)
```

### 3.4 消耗品模型

```go
// internal/server/item/consumable.go

type Consumable struct {
    Item
    ConsumableType ConsumableType `json:"consumableType"`
    Uses           int            `json:"uses"`          // 使用次数
    MaxUses        int            `json:"maxUses"`
    Recharge       *Recharge      `json:"recharge,omitempty"`
    Effect         ConsumableEffect `json:"effect"`
}

type ConsumableType string

const (
    ConsumableTypePotion   ConsumableType = "potion"
    ConsumableTypeScroll   ConsumableType = "scroll"
    ConsumableTypeOil      ConsumableType = "oil"
    ConsumableTypeFood     ConsumableType = "food"
    ConsumableTypeAmmunition ConsumableType = "ammunition"
)

type Recharge struct {
    Type      RechargeType `json:"type"`
    Value     string       `json:"value,omitempty"` // 如 "1d6" 或 "dawn"
}

type RechargeType string

const (
    RechargeTypeNone     RechargeType = "none"
    RechargeTypeDice     RechargeType = "dice"     // 如 "1d6 恢复"
    RechargeTypeDaily    RechargeType = "daily"    // 每日
    RechargeTypeShortRest RechargeType = "short_rest"
    RechargeTypeLongRest RechargeType = "long_rest"
)

type ConsumableEffect struct {
    Type        EffectType   `json:"type"`
    Value       int          `json:"value,omitempty"`
    Dice        string       `json:"dice,omitempty"`
    Duration    int          `json:"duration,omitempty"` // 回合数
    Conditions  []Condition  `json:"conditions,omitempty"`
    SpellID     string       `json:"spellId,omitempty"`
}
```

### 3.5 背包模型

```go
// internal/server/item/inventory.go

type Inventory struct {
    OwnerID       string         `json:"ownerId"`
    Items         []InventoryItem `json:"items"`
    Gold          int            `json:"gold"`        // 金币
    Silver        int            `json:"silver"`      // 银币
    Copper        int            `json:"copper"`      // 铜币
    Capacity      float64        `json:"capacity"`    // 最大重量
    CurrentWeight float64        `json:"currentWeight"`
}

type InventoryItem struct {
    ItemID    string `json:"itemId"`
    Quantity  int    `json:"quantity"`
    Equipped  bool   `json:"equipped"`
    Slot      string `json:"slot,omitempty"`
    CustomName string `json:"customName,omitempty"`
    Charges   int    `json:"charges,omitempty"` // 魔法物品充能
}
```

### 3.6 装备槽位

```go
// internal/server/item/equipment_slots.go

type EquipmentSlot string

const (
    SlotMainHand   EquipmentSlot = "main_hand"
    SlotOffHand    EquipmentSlot = "off_hand"
    SlotHead       EquipmentSlot = "head"
    SlotChest      EquipmentSlot = "chest"
    SlotHands      EquipmentSlot = "hands"
    SlotFeet       EquipmentSlot = "feet"
    SlotCloak      EquipmentSlot = "cloak"
    SlotNeck       EquipmentSlot = "neck"
    SlotRing1      EquipmentSlot = "ring1"
    SlotRing2      EquipmentSlot = "ring2"
    SlotBelt       EquipmentSlot = "belt"
)

type Equipment struct {
    Slots map[EquipmentSlot]*InventoryItem `json:"slots"`
}
```

---

## 4. 对外接口

### 4.1 背包管理器

```go
// internal/server/item/inventory.go

type InventoryManager struct {
    itemData    map[string]*Item
    effectMgr   *EffectManager
}

func NewInventoryManager(itemData map[string]*Item, effectMgr *EffectManager) *InventoryManager

// 添加物品
func (im *InventoryManager) AddItem(inv *Inventory, itemID string, quantity int) error

// 移除物品
func (im *InventoryManager) RemoveItem(inv *Inventory, itemID string, quantity int) error

// 获取物品数量
func (im *InventoryManager) GetItemCount(inv *Inventory, itemID string) int

// 检查是否有物品
func (im *InventoryManager) HasItem(inv *Inventory, itemID string, quantity int) bool

// 计算重量
func (im *InventoryManager) CalculateWeight(inv *Inventory) float64

// 检查是否超重
func (im *InventoryManager) IsOverencumbered(inv *Inventory) bool

// 整理背包
func (im *InventoryManager) OrganizeInventory(inv *Inventory)
```

### 4.2 装备管理器

```go
// internal/server/item/equipment_slots.go

type EquipmentManager struct {
    invMgr      *InventoryManager
}

func NewEquipmentManager(invMgr *InventoryManager) *EquipmentManager

// 装备物品
func (em *EquipmentManager) EquipItem(inv *Inventory, itemID string, slot EquipmentSlot) error

// 卸下物品
func (em *EquipmentManager) UnequipItem(inv *Inventory, slot EquipmentSlot) error

// 获取装备
func (em *EquipmentManager) GetEquipment(inv *Inventory, slot EquipmentSlot) *InventoryItem

// 获取所有装备
func (em *EquipmentManager) GetAllEquipment(inv *Inventory) map[EquipmentSlot]*InventoryItem

// 获取武器
func (em *EquipmentManager) GetWeapons(inv *Inventory) []*Weapon

// 获取护甲
func (em *EquipmentManager) GetArmor(inv *Inventory) *Armor

// 检查是否可以装备
func (em *EquipmentManager) CanEquip(inv *Inventory, itemID string, slot EquipmentSlot) (bool, string)
```

### 4.3 物品使用管理器

```go
// internal/server/item/usage.go

type UsageManager struct {
    itemData    map[string]*Item
    effectMgr   *EffectManager
    combatMgr   *combat.Manager
}

func NewUsageManager(itemData map[string]*Item, effectMgr *EffectManager) *UsageManager

// 使用物品
func (um *UsageManager) UseItem(req *UseItemRequest) (*UseItemResult, error)

// 检查是否可以使用
func (um *UsageManager) CanUse(char *character.Character, itemID string) (bool, string)

// 获取可用目标
func (um *UsageManager) GetValidTargets(itemID string) []TargetType

type UseItemRequest struct {
    CharacterID string    `json:"characterId"`
    ItemID      string    `json:"itemId"`
    TargetID    string    `json:"targetId,omitempty"`
    Position    *Position `json:"position,omitempty"`
}

type UseItemResult struct {
    ItemID      string          `json:"itemId"`
    Success     bool            `json:"success"`
    Consumed    bool            `json:"consumed"`
    Effects     []AppliedEffect `json:"effects"`
    Message     string          `json:"message"`
}
```

---

## 5. 组件划分

### 5.1 重量计算器

```go
// internal/server/item/weight.go

type WeightCalculator struct{}

func NewWeightCalculator() *WeightCalculator

// 计算背包总重量
func (wc *WeightCalculator) CalculateTotalWeight(inv *Inventory, itemData map[string]*Item) float64 {
    var total float64
    for _, invItem := range inv.Items {
        item := itemData[invItem.ItemID]
        if item != nil {
            total += item.Weight * float64(invItem.Quantity)
        }
    }

    // 计算货币重量（50 枚 = 1 磅）
    coinWeight := float64(inv.Gold+inv.Silver+inv.Copper) / 50.0
    total += coinWeight

    return total
}

// 计算负重能力
func (wc *WeightCalculator) CalculateCapacity(str int) float64 {
    // PHB 规则：力量值 * 15 磅
    return float64(str * 15)
}

// 检查负重状态
func (wc *WeightCalculator) GetEncumbranceStatus(str int, weight float64) EncumbranceStatus {
    capacity := float64(str * 15)
    if weight > capacity {
        return EncumbranceHeavy
    }
    if weight > capacity*0.666 { // 超过 2/3
        return EncumbranceMedium
    }
    return EncumbranceNone
}

type EncumbranceStatus string

const (
    EncumbranceNone   EncumbranceStatus = "none"
    EncumbranceMedium EncumbranceStatus = "medium" // 速度 -10
    EncumbranceHeavy  EncumbranceStatus = "heavy"  // 速度 20，劣势
)
```

### 5.2 效果应用器

```go
// internal/server/item/usage.go

type EffectManager struct {
    roller      *dice.Roller
    combatMgr   *combat.Manager
    charMgr     *character.Manager
}

func (em *EffectManager) ApplyEffect(char *character.Character, effect ConsumableEffect) (*AppliedEffect, error) {
    result := &AppliedEffect{Type: effect.Type}

    switch effect.Type {
    case EffectTypeHeal:
        healAmount := em.calculateHeal(effect)
        em.charMgr.ApplyHealing(char, healAmount)
        result.Value = healAmount
        result.Description = fmt.Sprintf("Healed for %d HP", healAmount)

    case EffectTypeDamage:
        damage := em.calculateDamage(effect)
        em.combatMgr.ApplyDamage(char, damage)
        result.Value = damage
        result.Description = fmt.Sprintf("Dealt %d damage", damage)

    case EffectTypeCondition:
        for _, cond := range effect.Conditions {
            char.AddCondition(cond)
        }
        result.Description = "Applied conditions"

    case EffectTypeSpell:
        // 施放关联法术
        spellResult, err := em.castSpell(char, effect.SpellID)
        if err != nil {
            return nil, err
        }
        result.SpellResult = spellResult
    }

    return result, nil
}

func (em *EffectManager) calculateHeal(effect ConsumableEffect) int {
    if effect.Dice != "" {
        roll := em.roller.Roll(effect.Dice)
        return roll.Total + effect.Value
    }
    return effect.Value
}
```

### 5.3 装备验证器

```go
// internal/server/item/equipment_slots.go

func (em *EquipmentManager) CanEquip(inv *Inventory, itemID string, slot EquipmentSlot) (bool, string) {
    item := em.itemData[itemID]
    if item == nil {
        return false, "Item not found"
    }

    // 检查槽位是否匹配
    validSlot := em.getValidSlot(item)
    if slot != validSlot {
        return false, "Invalid slot for this item type"
    }

    // 检查是否已装备
    if em.GetEquipment(inv, slot) != nil {
        return false, "Slot is occupied"
    }

    // 检查职业/种族限制（魔法物品）
    if magicItem, ok := item.(*MagicItem); ok {
        if !em.meetsRequirements(inv, magicItem) {
            return false, "Does not meet requirements"
        }
    }

    return true, ""
}
```

---

## 6. 物品数据示例

### 6.1 武器示例

```json
{
  "id": "longsword",
  "name": "Longsword",
  "description": "A versatile melee weapon.",
  "type": "weapon",
  "rarity": "common",
  "weight": 3.0,
  "value": 1500,
  "weaponCategory": "martial",
  "weaponType": "melee",
  "damage": {"count": 1, "size": 8},
  "damageType": "slashing",
  "range": {"normal": 5},
  "properties": ["versatile"],
  "versatile": {"count": 1, "size": 10}
}
```

### 6.2 护甲示例

```json
{
  "id": "chain_mail",
  "name": "Chain Mail",
  "description": "Made of interlocking metal rings...",
  "type": "armor",
  "rarity": "common",
  "weight": 55.0,
  "value": 7500,
  "armorCategory": "heavy",
  "armorType": "chain",
  "baseAc": 16,
  "dexBonus": "none",
  "strengthReq": 13,
  "stealthDisadvantage": true
}
```

### 6.3 消耗品示例

```json
{
  "id": "potion_of_healing",
  "name": "Potion of Healing",
  "description": "A magical red fluid...",
  "type": "potion",
  "rarity": "common",
  "weight": 0.5,
  "value": 5000,
  "stackable": true,
  "maxStack": 10,
  "consumableType": "potion",
  "uses": 1,
  "maxUses": 1,
  "effect": {
    "type": "heal",
    "dice": "2d4",
    "value": 2
  }
}
```

---

## 7. 模块间通信

### 7.1 与角色系统通信

```go
// 装备护甲时更新角色 AC
func (em *EquipmentManager) EquipItem(inv *Inventory, itemID string, slot EquipmentSlot) error {
    // ... 装备逻辑 ...

    // 如果是护甲，通知角色系统
    if item.Type == ItemTypeArmor {
        armor := item.(*Armor)
        char := em.charMgr.GetCharacter(inv.OwnerID)
        em.charMgr.UpdateAC(char, armor)
    }

    return nil
}
```

### 7.2 与战斗系统通信

```go
// 获取武器用于攻击
func (em *EquipmentManager) GetMainWeapon(inv *Inventory) *Weapon {
    mainHand := em.GetEquipment(inv, SlotMainHand)
    if mainHand == nil {
        return nil // 徒手
    }

    item := em.itemData[mainHand.ItemID]
    if weapon, ok := item.(*Weapon); ok {
        return weapon
    }
    return nil
}
```

---

## 8. 配置项

```yaml
item:
  # 物品数据路径
  data_path: "./data/items"

  # 负重规则
  encumbrance:
    enabled: true
    variant: "standard"  # standard, variant

  # 背包设置
  inventory:
    max_slots: 100
    auto_stack: true
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
