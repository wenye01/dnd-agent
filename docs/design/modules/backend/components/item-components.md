# 物品系统组件设计

> **模块名称**: item
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 组件列表和职责

| 组件名称 | 文件 | 职责描述 |
|----------|------|----------|
| **ItemManager** | item.go | 物品数据管理、查询、验证 |
| **InventoryManager** | inventory.go | 背包管理、物品添加/移除、容量管理 |
| **EquipmentManager** | equipment.go | 装备管理、穿戴/卸下、槽位验证 |
| **UsageManager** | usage.go | 物品使用、消耗品使用、魔法物品激活 |
| **EffectProcessor** | effects.go | 物品效果处理、加值计算 |
| **WeightCalculator** | weight.go | 重量计算、负重检查 |
| **ItemLoader** | loader.go | 物品数据加载（从 JSON 文件） |
| **TradeManager** | trade.go | 交易管理、金币处理 |
| **ItemValidator** | validation.go | 物品数据验证、使用条件检查 |

> **注**：物品静态数据从 JSON 文件加载到内存，运行时状态（背包、装备）存储在 GameState 中，持久化由 `persistence` 模块统一处理。

---

## 2. 组件接口定义

### 2.1 ItemManager

```go
// internal/server/item/item.go

package item

import (
    "context"
)

// ItemManager 物品管理器
type ItemManager struct {
    loader        *ItemLoader
    validator     *ItemValidator
    invMgr        *InventoryManager
    equipMgr      *EquipmentManager
    usageMgr      *UsageManager
    effectProc    *EffectProcessor
    weightCalc    *WeightCalculator
    tradeMgr      *TradeManager
    stateManager  *state.Manager       // 状态管理器（访问内存中的角色数据）
    persistence   *persistence.Manager // 持久化管理器（事件记录）
    eventBus      *events.Bus
}

// NewItemManager 创建物品管理器
func NewItemManager(
    stateManager *state.Manager,
    persistence *persistence.Manager,
    eventBus *events.Bus,
    dataPath string,
) *ItemManager

// GetItem 获取物品
func (m *ItemManager) GetItem(ctx context.Context, itemID string) (*Item, error)

// ListItems 列出物品
func (m *ItemManager) ListItems(ctx context.Context, filter *ItemFilter) ([]*Item, error)

// GetItemsByType 按类型获取物品
func (m *ItemManager) GetItemsByType(ctx context.Context, itemType ItemType) ([]*Item, error)

// GetItemsByRarity 按稀有度获取物品
func (m *ItemManager) GetItemsByRarity(ctx context.Context, rarity Rarity) ([]*Item, error)

// SearchItems 搜索物品
func (m *ItemManager) SearchItems(ctx context.Context, query string) ([]*Item, error)

// CreateCustomItem 创建自定义物品
func (m *ItemManager) CreateCustomItem(ctx context.Context, item *Item) error

// ItemFilter 物品筛选器
type ItemFilter struct {
    Type   *ItemType  `json:"type,omitempty"`
    Rarity *Rarity    `json:"rarity,omitempty"`
    Magic  *bool      `json:"magic,omitempty"`
    Name   string     `json:"name,omitempty"`
}
```

### 2.2 InventoryManager

```go
// internal/server/item/inventory.go

// InventoryManager 背包管理器
type InventoryManager struct {
    itemData      map[string]*Item
    weightCalc    *WeightCalculator
    effectProc    *EffectProcessor
    eventBus      *events.Bus
}

// NewInventoryManager 创建背包管理器
func NewInventoryManager(
    itemData map[string]*Item,
    weightCalc *WeightCalculator,
    effectProc *EffectProcessor,
    eventBus *events.Bus,
) *InventoryManager

// Inventory 背包
type Inventory struct {
    OwnerID       string          `json:"ownerId"`
    Items         []InventoryItem `json:"items"`
    Gold          int             `json:"gold"`   // 金币
    Silver        int             `json:"silver"` // 银币
    Copper        int             `json:"copper"` // 铜币
    Capacity      float64         `json:"capacity"`    // 最大重量
    CurrentWeight float64         `json:"currentWeight"`
    MaxSlots      int             `json:"maxSlots"` // 最大格子数
}

// InventoryItem 背包物品
type InventoryItem struct {
    ID          string `json:"id"`          // 唯一ID
    ItemID      string `json:"itemId"`      // 物品模板ID
    Quantity    int    `json:"quantity"`
    Equipped    bool   `json:"equipped"`
    Slot        string `json:"slot,omitempty"`
    CustomName  string `json:"customName,omitempty"`
    Charges     int    `json:"charges,omitempty"`     // 魔法物品充能
    MaxCharges  int    `json:"maxCharges,omitempty"`
    Attuned     bool   `json:"attuned,omitempty"`    // 是否已同调
    Properties  map[string]interface{} `json:"properties,omitempty"` // 自定义属性
}

// AddItemRequest 添加物品请求
type AddItemRequest struct {
    OwnerID  string `json:"ownerId"`
    ItemID   string `json:"itemId"`
    Quantity int    `json:"quantity"`
    Properties map[string]interface{} `json:"properties,omitempty"`
}

// AddItem 添加物品
func (im *InventoryManager) AddItem(ctx context.Context, inv *Inventory, itemID string, quantity int) error

// RemoveItem 移除物品
func (im *InventoryManager) RemoveItem(ctx context.Context, inv *Inventory, itemID string, quantity int) error

// MoveItem 移动物品
func (im *InventoryManager) MoveItem(ctx context.Context, inv *Inventory, fromIndex, toIndex int) error

// SplitItem 分割堆叠物品
func (im *InventoryManager) SplitItem(ctx context.Context, inv *Inventory, itemIndex, quantity int) error

// MergeItems 合并堆叠物品
func (im *InventoryManager) MergeItems(ctx context.Context, inv *Inventory, fromIndex, toIndex int) error

// GetItemCount 获取物品数量
func (im *InventoryManager) GetItemCount(inv *Inventory, itemID string) int

// HasItem 检查是否有物品
func (im *InventoryManager) HasItem(inv *Inventory, itemID string, quantity int) bool

// CalculateWeight 计算重量
func (im *InventoryManager) CalculateWeight(ctx context.Context, inv *Inventory) (float64, error)

// IsOverencumbered 检查是否超重
func (im *InventoryManager) IsOverencumbered(inv *Inventory) bool

// OrganizeInventory 整理背包
func (im *InventoryManager) OrganizeInventory(ctx context.Context, inv *Inventory) error

// GetInventory 获取背包
func (im *InventoryManager) GetInventory(ctx context.Context, ownerID string) (*Inventory, error)

// SaveInventory 保存背包
func (im *InventoryManager) SaveInventory(ctx context.Context, inv *Inventory) error

// FindEmptySlot 查找空槽位
func (im *InventoryManager) FindEmptySlot(inv *Inventory) int

// CanAddItem 检查是否可以添加物品
func (im *InventoryManager) CanAddItem(inv *Inventory, itemID string, quantity int) (bool, string)
```

### 2.3 EquipmentManager

```go
// internal/server/item/equipment.go

// EquipmentManager 装备管理器
type EquipmentManager struct {
    itemData    map[string]*Item
    invMgr      *InventoryManager
    effectProc  *EffectProcessor
    charSvc     CharacterService
    eventBus    *events.Bus
}

// EquipmentSlot 装备槽位
type EquipmentSlot string

const (
    SlotMainHand    EquipmentSlot = "main_hand"
    SlotOffHand     EquipmentSlot = "off_hand"
    SlotHead        EquipmentSlot = "head"
    SlotChest       EquipmentSlot = "chest"
    SlotHands       EquipmentSlot = "hands"
    SlotFeet        EquipmentSlot = "feet"
    SlotCloak       EquipmentSlot = "cloak"
    SlotNeck        EquipmentSlot = "neck"
    SlotRing1       EquipmentSlot = "ring1"
    SlotRing2       EquipmentSlot = "ring2"
    SlotBelt        EquipmentSlot = "belt"
    SlotBody        EquipmentSlot = "body"     // 盔甲
)

// NewEquipmentManager 创建装备管理器
func NewEquipmentManager(
    itemData map[string]*Item,
    invMgr *InventoryManager,
    effectProc *EffectProcessor,
    charSvc CharacterService,
    eventBus *events.Bus,
) *EquipmentManager

// Equipment 装备
type Equipment struct {
    Slots map[EquipmentSlot]*InventoryItem `json:"slots"`
}

// NewEquipment 创建装备
func NewEquipment() *Equipment {
    return &Equipment{
        Slots: make(map[EquipmentSlot]*InventoryItem),
    }
}

// EquipItem 装备物品
func (em *EquipmentManager) EquipItem(ctx context.Context, inv *Inventory, item *InventoryItem, slot EquipmentSlot) error

// UnequipItem 卸下物品
func (em *EquipmentManager) UnequipItem(ctx context.Context, inv *Inventory, slot EquipmentSlot) error

// GetEquipment 获取装备
func (em *EquipmentManager) GetEquipment(inv *Inventory, slot EquipmentSlot) *InventoryItem

// GetAllEquipment 获取所有装备
func (em *EquipmentManager) GetAllEquipment(inv *Inventory) map[EquipmentSlot]*InventoryItem

// GetMainWeapon 获取主手武器
func (em *EquipmentManager) GetMainWeapon(inv *Inventory) *Weapon

// GetOffHandWeapon 获取副手武器
func (em *EquipmentManager) GetOffHandWeapon(inv *Inventory) *Weapon

// GetArmor 获取护甲
func (em *EquipmentManager) GetArmor(inv *Inventory) *Armor

// GetShield 获取盾牌
func (em *EquipmentManager) GetShield(inv *Inventory) *Shield

// CanEquip 检查是否可以装备
func (em *EquipmentManager) CanEquip(ctx context.Context, inv *Inventory, item *Item, slot EquipmentSlot) (bool, string)

// GetValidSlot 获取有效槽位
func (em *EquipmentManager) GetValidSlot(item *Item) (EquipmentSlot, error)

// ApplyEquipmentEffects 应用装备效果
func (em *EquipmentManager) ApplyEquipmentEffects(ctx context.Context, char *Character, item *InventoryItem) error

// RemoveEquipmentEffects 移除装备效果
func (em *EquipmentManager) RemoveEquipmentEffects(ctx context.Context, char *Character, item *InventoryItem) error

// CalculateAC 计算护甲等级（考虑装备）
func (em *EquipmentManager) CalculateAC(ctx context.Context, char *Character) (int, error)
```

### 2.4 UsageManager

```go
// internal/server/item/usage.go

// UsageManager 使用管理器
type UsageManager struct {
    itemData    map[string]*Item
    effectProc  *EffectProcessor
    invMgr      *InventoryManager
    equipMgr    *EquipmentManager
    charSvc     CharacterService
    combatSvc   CombatService
    spellSvc    SpellService
    eventBus    *events.Bus
}

// NewUsageManager 创建使用管理器
func NewUsageManager(
    itemData map[string]*Item,
    effectProc *EffectProcessor,
    invMgr *InventoryManager,
    equipMgr *EquipmentManager,
    charSvc CharacterService,
    combatSvc CombatService,
    spellSvc SpellService,
    eventBus *events.Bus,
) *UsageManager

// UseItemRequest 使用物品请求
type UseItemRequest struct {
    CharacterID string   `json:"characterId"`
    ItemID      string   `json:"itemId"`       // 背包中的物品ID
    TargetIDs   []string `json:"targetIds,omitempty"`
    Position    *Position `json:"position,omitempty"`
    Charges     int      `json:"charges,omitempty"` // 使用充能数
}

// UseItemResult 使用物品结果
type UseItemResult struct {
    ItemID    string          `json:"itemId"`
    Success   bool            `json:"success"`
    Consumed  bool            `json:"consumed"`
    Effects   []AppliedEffect `json:"effects"`
    Message   string          `json:"message"`
    ChargesRemaining int      `json:"chargesRemaining,omitempty"`
}

// UseItem 使用物品
func (um *UsageManager) UseItem(ctx context.Context, req *UseItemRequest) (*UseItemResult, error)

// CanUse 检查是否可以使用
func (um *UsageManager) CanUse(ctx context.Context, char *Character, item *Item) (bool, string)

// GetValidTargets 获取有效目标
func (um *UsageManager) GetValidTargets(item *Item) []TargetType

// UsePotion 使用药水
func (um *UsageManager) UsePotion(ctx context.Context, char *Character, consumable *Consumable) (*UseItemResult, error)

// UseScroll 使用卷轴
func (um *UsageManager) UseScroll(ctx context.Context, char *Character, scroll *Scroll) (*UseItemResult, error)

// UseMagicItem 使用魔法物品
func (um *UsageManager) UseMagicItem(ctx context.Context, char *Character, item *InventoryItem, charges int) (*UseItemResult, error)

// ActivateItem 激活物品（如魔法戒指）
func (um *UsageManager) ActivateItem(ctx context.Context, char *Character, item *InventoryItem) (*UseItemResult, error)

// DeactivateItem 停用物品
func (um *UsageManager) DeactivateItem(ctx context.Context, char *Character, item *InventoryItem) error

// AttuneToItem 同调物品
func (um *UsageManager) AttuneToItem(ctx context.Context, char *Character, item *InventoryItem) error
```

### 2.5 EffectProcessor

```go
// internal/server/item/effects.go

// EffectProcessor 效果处理器
type EffectProcessor struct {
    roller     *dice.Roller
    charSvc    CharacterService
    combatSvc  CombatService
    spellSvc   SpellService
    eventBus   *events.Bus
}

// NewEffectProcessor 创建效果处理器
func NewEffectProcessor(
    roller *dice.Roller,
    charSvc CharacterService,
    combatSvc CombatService,
    spellSvc SpellService,
    eventBus *events.Bus,
) *EffectProcessor

// ApplyConsumableEffect 应用消耗品效果
func (ep *EffectProcessor) ApplyConsumableEffect(
    ctx context.Context,
    char *Character,
    effect ConsumableEffect,
) (*AppliedEffect, error)

// ApplyMagicItemEffect 应用魔法物品效果
func (ep *EffectProcessor) ApplyMagicItemEffect(
    ctx context.Context,
    char *Character,
    item *InventoryItem,
    effect MagicItemEffect,
) (*AppliedEffect, error)

// ApplyPassiveEffect 应用被动效果（装备时）
func (ep *EffectProcessor) ApplyPassiveEffect(
    ctx context.Context,
    char *Character,
    item *InventoryItem,
) error

// RemovePassiveEffect 移除被动效果（卸下时）
func (ep *EffectProcessor) RemovePassiveEffect(
    ctx context.Context,
    char *Character,
    item *InventoryItem,
) error

// CalculateHeal 计算治疗量
func (ep *EffectProcessor) CalculateHeal(effect ConsumableEffect) int

// CalculateDamage 计算伤害量
func (ep *EffectProcessor) CalculateDamage(effect ConsumableEffect) int

// ApplyACBonus 应用AC加值
func (ep *EffectProcessor) ApplyACBonus(char *Character, bonus int) error

// ApplyAbilityBonus 应用属性加值
func (ep *EffectProcessor) ApplyAbilityBonus(char *Character, ability Ability, bonus int) error

// ApplyResistance 应用抗性
func (ep *EffectProcessor) ApplyResistance(char *Character, damageType DamageType) error

// ApplyImmunity 应用免疫
func (ep *EffectProcessor) ApplyImmunity(char *Character, damageType DamageType) error
```

### 2.6 WeightCalculator

```go
// internal/server/item/weight.go

// WeightCalculator 重量计算器
type WeightCalculator struct {
    itemData map[string]*Item
}

// NewWeightCalculator 创建重量计算器
func NewWeightCalculator(itemData map[string]*Item) *WeightCalculator

// CalculateTotalWeight 计算总重量
func (wc *WeightCalculator) CalculateTotalWeight(inv *Inventory) float64 {
    var total float64
    for _, invItem := range inv.Items {
        item := wc.itemData[invItem.ItemID]
        if item != nil {
            total += item.Weight * float64(invItem.Quantity)
        }
    }

    // 货币重量（50枚 = 1磅）
    coinWeight := float64(inv.Gold + inv.Silver + inv.Copper) / 50.0
    total += coinWeight

    return total
}

// CalculateCapacity 计算负重能力
func (wc *WeightCalculator) CalculateCapacity(str int) float64 {
    return float64(str * 15)
}

// GetEncumbranceStatus 获取负重状态
func (wc *WeightCalculator) GetEncumbranceStatus(str int, weight float64) EncumbranceStatus {
    capacity := float64(str * 15)
    if weight > capacity {
        return EncumbranceHeavy
    }
    if weight > capacity*0.666 {
        return EncumbranceMedium
    }
    return EncumbranceNone
}

// CalculateItemWeight 计算单个物品重量
func (wc *WeightCalculator) CalculateItemWeight(itemID string, quantity int) float64 {
    item := wc.itemData[itemID]
    if item == nil {
        return 0
    }
    return item.Weight * float64(quantity)
}

// CanCarry 检查是否可以携带
func (wc *WeightCalculator) CanCarry(inv *Inventory, itemID string, quantity int) bool {
    itemWeight := wc.CalculateItemWeight(itemID, quantity)
    newWeight := wc.CalculateTotalWeight(inv) + itemWeight

    // 获取力量值（需要从角色服务获取）
    str := 10 // 默认值

    return newWeight <= wc.CalculateCapacity(str)
}

// EncumbranceStatus 负重状态
type EncumbranceStatus string

const (
    EncumbranceNone   EncumbranceStatus = "none"
    EncumbranceMedium EncumbranceStatus = "medium" // 速度 -10
    EncumbranceHeavy  EncumbranceStatus = "heavy"  // 速度 20，劣势
)
```

### 2.7 ItemLoader

```go
// internal/server/item/loader.go

// ItemLoader 物品加载器
type ItemLoader struct {
    cache     map[string]*Item
    dataPath  string
    watchers  []ItemWatcher
    mu        sync.RWMutex
}

// ItemWatcher 物品变化监听器
type ItemWatcher interface {
    OnItemLoaded(item *Item)
    OnItemUpdated(item *Item)
    OnItemDeleted(itemID string)
}

// NewItemLoader 创建物品加载器
func NewItemLoader(dataPath string) *ItemLoader

// LoadItem 加载单个物品
func (il *ItemLoader) LoadItem(itemID string) (*Item, error)

// LoadAll 加载所有物品
func (il *ItemLoader) LoadAll() (map[string]*Item, error)

// LoadByType 按类型加载
func (il *ItemLoader) LoadByType(itemType ItemType) ([]*Item, error)

// Reload 重新加载物品
func (il *ItemLoader) Reload(itemID string) error

// Watch 监听物品文件变化
func (il *ItemLoader) Watch(ctx context.Context) error

// AddWatcher 添加监听器
func (il *ItemLoader) AddWatcher(watcher ItemWatcher)

// GetFromCache 从缓存获取物品
func (il *ItemLoader) GetFromCache(itemID string) (*Item, bool)

// PopulateCache 填充缓存
func (il *ItemLoader) PopulateCache() error
```

### 2.8 物品数据存储（内存管理）

物品数据分为两类：
- **静态物品数据**：从 JSON 文件加载，只读（武器、护甲、道具定义等）
- **运行时状态**：背包内容、装备状态等，存储在内存中

```go
// 物品静态数据由 ItemLoader 从文件加载到内存
type ItemLoader struct {
    itemData map[string]*Item // 物品定义数据（只读）
    mu       sync.RWMutex
}

// GetItem 获取物品定义
func (il *ItemLoader) GetItem(itemID string) *Item {
    il.mu.RLock()
    defer il.mu.RUnlock()
    return il.itemData[itemID]
}

// GetItemsByType 获取指定类型的物品
func (il *ItemLoader) GetItemsByType(itemType ItemType) []*Item {
    il.mu.RLock()
    defer il.mu.RUnlock()

    var result []*Item
    for _, item := range il.itemData {
        if item.Type == itemType {
            result = append(result, item)
        }
    }
    return result
}

// 角色的背包和装备存储在 Character 结构体中
type Character struct {
    // ...
    Inventory     *Inventory    `json:"inventory"`     // 背包
    Equipment     *Equipment    `json:"equipment"`     // 装备槽
    Attunement    []string      `json:"attunement"`    // 已同调物品 ID
}

// Inventory 背包
type Inventory struct {
    OwnerID   string           `json:"ownerId"`
    Items     []*InventoryItem `json:"items"`
    Gold      int              `json:"gold"`
    Capacity  int              `json:"capacity"`
    UsedSlots int              `json:"usedSlots"`
}

// 背包操作由 InventoryManager 负责（见 2.3 节）
// 物品状态通过 StateManager 更新
// 持久化由 PersistenceManager 统一处理
```

### 2.9 TradeManager

```go
// internal/server/item/trade.go

// TradeManager 交易管理器
type TradeManager struct {
    invMgr   *InventoryManager
    validator *ItemValidator
    eventBus *events.Bus
}

// TradeRequest 交易请求
type TradeRequest struct {
    FromCharacterID string            `json:"fromCharacterId"`
    ToCharacterID   string            `json:"toCharacterId"`
    Items           []TradeItem       `json:"items"`
    Gold            int               `json:"gold"`
}

// TradeItem 交易物品
type TradeItem struct {
    InventoryItemID string `json:"inventoryItemId"`
    Quantity        int    `json:"quantity"`
}

// TradeResult 交易结果
type TradeResult struct {
    Success   bool   `json:"success"`
    Message   string `json:"message"`
    FromInventory *Inventory `json:"fromInventory,omitempty"`
    ToInventory   *Inventory `json:"toInventory,omitempty"`
}

// NewTradeManager 创建交易管理器
func NewTradeManager(
    invMgr *InventoryManager,
    validator *ItemValidator,
    eventBus *events.Bus,
) *TradeManager

// Trade 交易
func (tm *TradeManager) Trade(ctx context.Context, req *TradeRequest) (*TradeResult, error)

// CanTrade 检查是否可以交易
func (tm *TradeManager) CanTrade(ctx context.Context, req *TradeRequest) (bool, string)

// TransferGold 转移金币
func (tm *TradeManager) TransferGold(ctx context.Context, fromID, toID string, amount int) error

// TransferItem 转移物品
func (tm *TradeManager) TransferItem(ctx context.Context, fromID, toID string, itemID string, quantity int) error

// BuyItem 向商店购买物品
func (tm *TradeManager) BuyItem(ctx context.Context, characterID string, shopID string, itemID string, quantity int) error

// SellItem 向商店出售物品
func (tm *TradeManager) SellItem(ctx context.Context, characterID string, shopID string, itemID string, quantity int) error

// CalculateValue 计算物品价值
func (tm *TradeManager) CalculateValue(item *Item, quantity int, condition float64) int

// ConvertCurrency 货币转换
func (tm *TradeManager) ConvertCurrency(gold, silver, copper int) int {
    return gold*100 + silver*10 + copper
}
```

### 2.10 ItemValidator

```go
// internal/server/item/validation.go

// ItemValidator 物品验证器
type ItemValidator struct {
    itemData map[string]*Item
}

// NewItemValidator 创建物品验证器
func NewItemValidator(itemData map[string]*Item) *ItemValidator

// ValidateItem 验证物品数据
func (iv *ItemValidator) ValidateItem(item *Item) error

// ValidateWeapon 验证武器数据
func (iv *ItemValidator) ValidateWeapon(weapon *Weapon) error

// ValidateArmor 验证护甲数据
func (iv *ItemValidator) ValidateArmor(armor *Armor) error

// ValidateConsumable 验证消耗品数据
func (iv *ItemValidator) ValidateConsumable(consumable *Consumable) error

// ValidateUsage 验证使用条件
func (iv *ItemValidator) ValidateUsage(char *Character, item *Item) error

// ValidateEquip 验证装备条件
func (iv *ItemValidator) ValidateEquip(char *Character, item *Item) (bool, string)

// ValidateAttunement 验证同调条件
func (iv *ItemValidator) ValidateAttunement(char *Character, item *Item) (bool, string)

// CheckRequirements 检查使用要求
func (iv *ItemValidator) CheckRequirements(char *Character, item *Item) bool
```

---

## 3. 组件内部结构设计

### 3.1 ItemManager 内部结构

```
┌─────────────────────────────────────────────────────────────────┐
│                        ItemManager                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐     │
│   │     Item      │  │   Inventory   │  │  Equipment    │     │
│   │    Loader     │  │   Manager     │  │   Manager     │     │
│   └───────┬───────┘  └───────┬───────┘  └───────┬───────┘     │
│           │                  │                  │               │
│           └──────────────────┼──────────────────┘               │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │     Usage     │  │     Effect      │  │    Weight     │   │
│   │   Manager     │  │   Processor     │  │  Calculator   │   │
│   └───────┬───────┘  └─────────────────┘  └───────┬───────┘   │
│           │                                          │           │
│           └──────────────────┬───────────────────────┘           │
│                              │                                  │
│   ┌───────────────┐  ┌────────┴────────┐  ┌───────────────┐   │
│   │     Trade     │  │     Item        │  │   Repository  │   │
│   │   Manager     │  │   Validator     │  │               │   │
│   └───────────────┘  └─────────────────┘  └───────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 物品使用流程

```
┌─────────────────────────────────────────────────────────────────┐
│                       物品使用流程                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────────┐                                             │
│   │ 使用物品请求 │                                             │
│   └──────┬───────┘                                             │
│          │                                                      │
│          ▼                                                      │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 验证使用条件 │────▶│ 检查物品数量   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 处理消耗品   │────▶│ 处理魔法物品   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 应用治疗效果 │────▶│ 应用物品效果   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          ▼                    ▼                                 │
│   ┌──────────────┐     ┌──────────────┐                        │
│   │ 消耗物品     │────▶│ 更新背包状态   │                        │
│   └──────┬───────┘     └──────┬───────┘                        │
│          │                    │                                 │
│          └─────────┬──────────┘                                 │
│                    ▼                                            │
│          ┌───────────────────┐                                  │
│          │  返回使用结果      │                                  │
│          └───────────────────┘                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. 组件间通信方式

### 4.1 依赖注入

```go
// UsageManager 依赖其他组件
type UsageManager struct {
    itemData    map[string]*Item
    effectProc  *EffectProcessor
    invMgr      *InventoryManager
    equipMgr    *EquipmentManager
    charSvc     CharacterService
    combatSvc   CombatService
    spellSvc    SpellService
    eventBus    *events.Bus
}

// 使用物品时调用其他组件
func (um *UsageManager) UseItem(ctx context.Context, req *UseItemRequest) (*UseItemResult, error) {
    // 获取角色
    char, err := um.charSvc.GetCharacter(req.CharacterID)
    if err != nil {
        return nil, err
    }

    // 获取背包
    inv, err := um.invMgr.GetInventory(ctx, req.CharacterID)
    if err != nil {
        return nil, err
    }

    // 查找物品
    var invItem *InventoryItem
    for _, item := range inv.Items {
        if item.ID == req.ItemID {
            invItem = item
            break
        }
    }

    if invItem == nil {
        return nil, ErrItemNotFound
    }

    // 获取物品数据
    item := um.itemData[invItem.ItemID]

    // 应用效果
    applied, err := um.effectProc.ApplyConsumableEffect(ctx, char, item.Effect)
    if err != nil {
        return nil, err
    }

    // 消耗物品
    if item.Consumable {
        invItem.Quantity--
        if invItem.Quantity <= 0 {
            um.invMgr.RemoveItem(ctx, inv, invItem.ItemID, 1)
        }
    }

    // 保存背包
    um.invMgr.SaveInventory(ctx, inv)

    return &UseItemResult{
        ItemID:   req.ItemID,
        Success:  true,
        Consumed: invItem.Quantity == 0,
        Effects:  []AppliedEffect{*applied},
    }, nil
}
```

### 4.2 事件发布

```go
// 物品事件类型
type ItemEventType string

const (
    ItemEventAdded    ItemEventType = "added"
    ItemEventRemoved  ItemEventType = "removed"
    ItemEventEquipped ItemEventType = "equipped"
    ItemEventUnequipped ItemEventType = "unequipped"
    ItemEventUsed     ItemEventType = "used"
    ItemEventAttuned  ItemEventType = "attuned"
    ItemEventTraded   ItemEventType = "traded"
)

// ItemEvent 物品事件
type ItemEvent struct {
    Type       ItemEventType `json:"type"`
    ItemID     string        `json:"itemId"`
    CharacterID string       `json:"characterId,omitempty"`
    Quantity   int           `json:"quantity,omitempty"`
    Timestamp  int64         `json:"timestamp"`
    Data       interface{}   `json:"data,omitempty"`
}

// 发布物品事件
func (im *InventoryManager) publishItemEvent(eventType ItemEventType, itemID, characterID string, quantity int) {
    im.eventBus.Publish(ItemEvent{
        Type:       eventType,
        ItemID:     itemID,
        CharacterID: characterID,
        Quantity:   quantity,
        Timestamp:  time.Now().Unix(),
    })
}
```

### 4.3 回调处理

```go
// EffectProcessor 处理效果时的回调
func (ep *EffectProcessor) ApplyConsumableEffect(
    ctx context.Context,
    char *Character,
    effect ConsumableEffect,
) (*AppliedEffect, error) {
    result := &AppliedEffect{
        Type: effect.Type,
    }

    switch effect.Type {
    case EffectTypeHeal:
        healAmount := ep.CalculateHeal(effect)
        err := ep.charSvc.ApplyHealing(char, healAmount)
        if err != nil {
            return nil, err
        }
        result.Value = healAmount
        result.Description = fmt.Sprintf("Healed for %d HP", healAmount)

    case EffectTypeDamage:
        damage := ep.CalculateDamage(effect)
        err := ep.combatSvc.ApplyDamage(char.ID, damage, effect.DamageType)
        if err != nil {
            return nil, err
        }
        result.Value = damage
        result.Description = fmt.Sprintf("Dealt %d damage", damage)

    case EffectTypeCondition:
        for _, cond := range effect.Conditions {
            err := ep.charSvc.AddCondition(char, cond, effect.Duration)
            if err != nil {
                return nil, err
            }
        }
        result.Description = "Applied conditions"
    }

    return result, nil
}
```

---

## 5. 状态管理设计

### 5.1 背包状态存储

```go
// InventoryState 背包状态
type InventoryState struct {
    mu     sync.RWMutex
    inventories map[string]*Inventory
}

// Get 获取背包状态
func (is *InventoryState) Get(ownerID string) (*Inventory, bool) {
    is.mu.RLock()
    defer is.mu.RUnlock()
    inv, ok := is.inventories[ownerID]
    return inv, ok
}

// Set 设置背包状态
func (is *InventoryState) Set(inv *Inventory) {
    is.mu.Lock()
    defer is.mu.Unlock()
    is.inventories[inv.OwnerID] = inv
}

// Delete 删除背包状态
func (is *InventoryState) Delete(ownerID string) {
    is.mu.Lock()
    defer is.mu.Unlock()
    delete(is.inventories, ownerID)
}
```

### 5.2 装备状态管理

```go
// EquipmentState 装备状态
type EquipmentState struct {
    mu        sync.RWMutex
    equipment map[string]*Equipment // characterID -> equipment
}

// Get 获取装备状态
func (es *EquipmentState) Get(characterID string) *Equipment {
    es.mu.RLock()
    defer es.mu.RUnlock()
    return es.equipment[characterID]
}

// Set 设置装备状态
func (es *EquipmentState) Set(characterID string, equipment *Equipment) {
    es.mu.Lock()
    defer es.mu.Unlock()
    es.equipment[characterID] = equipment
}
```

### 5.3 交易状态管理

```go
// TradeState 交易状态
type TradeState struct {
    mu      sync.RWMutex
    pending map[string]*Trade // tradeID -> trade
}

// Trade 交易
type Trade struct {
    ID               string            `json:"id"`
    FromCharacterID  string            `json:"fromCharacterId"`
    ToCharacterID    string            `json:"toCharacterId"`
    Items            []TradeItem       `json:"items"`
    Gold             int               `json:"gold"`
    Status           TradeStatus       `json:"status"`
    CreatedAt        time.Time         `json:"createdAt"`
    ExpiresAt        time.Time         `json:"expiresAt"`
}

// TradeStatus 交易状态
type TradeStatus string

const (
    TradeStatusPending  TradeStatus = "pending"
    TradeStatusAccepted TradeStatus = "accepted"
    TradeStatusCompleted TradeStatus = "completed"
    TradeStatusCancelled TradeStatus = "cancelled"
    TradeStatusExpired  TradeStatus = "expired"
)

// Create 创建交易
func (ts *TradeState) Create(trade *Trade) string {
    ts.mu.Lock()
    defer ts.mu.Unlock()
    trade.ID = generateID()
    trade.CreatedAt = time.Now()
    trade.ExpiresAt = time.Now().Add(5 * time.Minute)
    trade.Status = TradeStatusPending
    ts.pending[trade.ID] = trade
    return trade.ID
}

// Accept 接受交易
func (ts *TradeState) Accept(tradeID string) error {
    ts.mu.Lock()
    defer ts.mu.Unlock()
    trade, ok := ts.pending[tradeID]
    if !ok {
        return ErrTradeNotFound
    }
    if trade.Status != TradeStatusPending {
        return ErrTradeNotPending
    }
    trade.Status = TradeStatusAccepted
    return nil
}
```

---

## 6. 错误处理设计

### 6.1 错误类型

```go
// ItemError 物品错误
type ItemError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    ItemID  string `json:"itemId,omitempty"`
}

func (e *ItemError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

// 错误代码
const (
    ErrItemNotFound      = "ITEM_NOT_FOUND"
    ErrItemNotOwned      = "ITEM_NOT_OWNED"
    ErrItemNotUsable     = "ITEM_NOT_USABLE"
    ErrInsufficientQuantity = "INSUFFICIENT_QUANTITY"
    ErrInventoryFull     = "INVENTORY_FULL"
    ErrOverencumbered    = "OVERENCUMBERED"
    ErrInvalidSlot       = "INVALID_SLOT"
    ErrSlotOccupied      = "SLOT_OCCUPIED"
    ErrCannotEquip       = "CANNOT_EQUIP"
    ErrRequiresAttunement = "REQUIRES_ATTUNEMENT"
    ErrAlreadyAttuned    = "ALREADY_ATTUNED"
    ErrInsufficientFunds = "INSUFFICIENT_FUNDS"
    ErrTradeNotFound     = "TRADE_NOT_FOUND"
    ErrTradeExpired      = "TRADE_EXPIRED"
)
```

### 6.2 验证链

```go
// ItemValidationChain 物品验证链
type ItemValidationChain struct {
    validators []func() error
}

// Add 添加验证器
func (ivc *ItemValidationChain) Add(validator func() error) *ItemValidationChain {
    ivc.validators = append(ivc.validators, validator)
    return ivc
}

// Validate 执行验证
func (ivc *ItemValidationChain) Validate() error {
    for _, v := range ivc.validators {
        if err := v(); err != nil {
            return err
        }
    }
    return nil
}

// 使用示例
func (um *UsageManager) validateUseRequest(req *UseItemRequest) error {
    return NewItemValidationChain().
        Add(func() error { return um.validateCharacterExists(req.CharacterID) }).
        Add(func() error { return um.validateItemExists(req.ItemID) }).
        Add(func() error { return um.validateCharacterOwnsItem(req.CharacterID, req.ItemID) }).
        Add(func() error { return um.validateItemUsable(req.CharacterID, req.ItemID) }).
        Validate()
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
