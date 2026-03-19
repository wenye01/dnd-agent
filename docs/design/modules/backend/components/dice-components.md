# 检定系统组件设计

> **模块名称**: dice
> **版本**: v1.0
> **创建日期**: 2026-03-16
> **组件设计师**: component-designer

---

## 1. 组件概述

### 1.1 组件职责划分

检定系统由以下核心组件组成：

| 组件 | 职责 | 文件 |
|------|------|------|
| **Roller** | 掷骰核心、随机数生成 | roller.go |
| **FormulaParser** | 骰子表达式解析 | formula.go |
| **CheckCalculator** | 各类检定计算 | check.go |
| **AbilityCheck** | 属性检定 | ability_check.go |
| **SkillCheck** | 技能检定 | skill_check.go |
| **SavingThrow** | 豁免检定 | saving_throw.go |
| **AttackRoll** | 攻击检定 | attack_roll.go |
| **DamageRoll** | 伤害掷骰 | damage_roll.go |
| **AdvantageProcessor** | 优势/劣势处理 | advantage.go |
| **CriticalProcessor** | 大成功/大失败处理 | critical.go |

### 1.2 组件依赖图

```
                        ┌─────────────────────┐
                        │   CheckCalculator   │
                        │   (检定计算器)       │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  AbilityCheck     │    │   SkillCheck     │    │  SavingThrow     │
│  (属性检定)        │    │   (技能检定)      │    │  (豁免检定)       │
└─────────┬─────────┘    └────────┬─────────┘    └────────┬─────────┘
          │                       │                       │
          └───────────────────────┴───────────────────────┘
                                   │
                                   ▼
                        ┌─────────────────────┐
                        │       Roller         │
                        │    (掷骰器)          │
                        └──────────┬──────────┘
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
                    ▼                             ▼
            ┌───────────────────┐       ┌──────────────────┐
            │  FormulaParser    │       │AdvantageProcessor│
            │  (表达式解析器)     │       │ (优势处理器)      │
            └───────────────────┘       └──────────────────┘
                                                │
                                                ▼
                                      ┌──────────────────┐
                                      │CriticalProcessor │
                                      │(临界值处理器)     │
                                      └──────────────────┘
```

---

## 2. 组件接口定义

### 2.1 Roller 组件

```go
// internal/server/dice/roller.go

package dice

import (
    "crypto/rand"
    "encoding/binary"
    "math/big"
    "sync"
    "time"
)

// Roller 掷骰器
type Roller struct {
    mu    sync.Mutex
    rng   *rand.Rand
    seed  int64
}

// NewRoller 创建掷骰器
func NewRoller() *Roller {
    // 使用加密安全的随机种子
    seed := time.Now().UnixNano()

    // 添加额外的随机性
    n, _ := rand.Int(rand.Reader, big.NewInt(time.Now().Unix()))
    seed ^= n.Int64()

    return &Roller{
        rng:  rand.New(rand.NewSource(seed)),
        seed: seed,
    }
}

// NewRollerWithSeed 创建带种子的掷骰器（用于测试）
func NewRollerWithSeed(seed int64) *Roller {
    return &Roller{
        rng:  rand.New(rand.NewSource(seed)),
        seed: seed,
    }
}

// Roll 掷骰（解析表达式）
func (r *Roller) Roll(formula string) (*DiceRollResult, error) {
    parser := NewFormulaParser()
    parsed, err := parser.Parse(formula)
    if err != nil {
        return nil, err
    }

    return r.RollFormula(parsed)
}

// RollFormula 掷骰（使用解析后的公式）
func (r *Roller) RollFormula(formula *DiceFormula) (*DiceRollResult, error) {
    r.mu.Lock()
    defer r.mu.Unlock()

    result := &DiceRollResult{
        Formula:  formula.String(),
        Modifier: formula.Modifier,
    }

    // 掷骰
    rolls := make([]int, formula.Count)
    for i := 0; i < formula.Count; i++ {
        rolls[i] = r.rollDie(formula.Size)
    }

    // 处理重掷
    if len(formula.Reroll) > 0 {
        rolls = r.handleReroll(rolls, formula.Size, formula.Reroll)
    }

    // 处理爆骰
    if formula.Explode != nil {
        rolls = r.handleExplode(rolls, formula.Size, formula.Explode)
    }

    // 处理保留规则
    if formula.Keep != nil {
        result.Dice, result.Dropped = r.handleKeep(rolls, formula.Keep)
    } else {
        result.Dice = rolls
    }

    // 计算总和
    total := 0
    for _, roll := range result.Dice {
        total += roll
    }
    total += result.Modifier
    result.Total = total

    // 检查大成功/大失败（仅 d20）
    if formula.Size == 20 && formula.Count == 1 && len(result.Dice) > 0 {
        result.Critical = result.Dice[0] == 20
        result.Fumble = result.Dice[0] == 1
    }

    return result, nil
}

// RollDie 掷单个骰子
func (r *Roller) RollDie(size int) int {
    r.mu.Lock()
    defer r.mu.Unlock()
    return r.rollDie(size)
}

// rollDie 内部掷骰方法
func (r *Roller) rollDie(size int) int {
    if size <= 0 {
        return 0
    }
    // 使用 crypto/rand 产生更好的随机性
    max := big.NewInt(int64(size))
    n, _ := rand.Int(rand.Reader, max)
    return int(n.Int64() + 1)
}

// RollDice 掷多个骰子
func (r *Roller) RollDice(count, size int) []int {
    r.mu.Lock()
    defer r.mu.Unlock()

    results := make([]int, count)
    for i := 0; i < count; i++ {
        results[i] = r.rollDie(size)
    }
    return results
}

// RollWithAdvantage 优势掷骰
func (r *Roller) RollWithAdvantage(formula string) (*DiceRollResult, error) {
    parser := NewFormulaParser()
    parsed, err := parser.Parse(formula)
    if err != nil {
        return nil, err
    }

    roll1, err := r.RollFormula(parsed)
    if err != nil {
        return nil, err
    }

    roll2, err := r.RollFormula(parsed)
    if err != nil {
        return nil, err
    }

    // 取较高值
    result := roll1
    result.Dropped = roll2.Dice
    result.Formula = formula + " (advantage)"

    if roll2.Total > roll1.Total {
        result = roll2
        result.Dropped = roll1.Dice
    }

    return result, nil
}

// RollWithDisadvantage 劣势掷骰
func (r *Roller) RollWithDisadvantage(formula string) (*DiceRollResult, error) {
    parser := NewFormulaParser()
    parsed, err := parser.Parse(formula)
    if err != nil {
        return nil, err
    }

    roll1, err := r.RollFormula(parsed)
    if err != nil {
        return nil, err
    }

    roll2, err := r.RollFormula(parsed)
    if err != nil {
        return nil, err
    }

    // 取较低值
    result := roll1
    result.Dropped = roll2.Dice
    result.Formula = formula + " (disadvantage)"

    if roll2.Total < roll1.Total {
        result = roll2
        result.Dropped = roll1.Dice
    }

    return result, nil
}

// handleReroll 处理重掷
func (r *Roller) handleReroll(rolls []int, size int, rerollValues []int) []int {
    rerollSet := make(map[int]bool)
    for _, v := range rerollValues {
        rerollSet[v] = true
    }

    for i, roll := range rolls {
        if rerollSet[roll] {
            rolls[i] = r.rollDie(size)
        }
    }
    return rolls
}

// handleExplode 处理爆骰
func (r *Roller) handleExplode(rolls []int, size int, config *ExplodeConfig) []int {
    result := rolls
    explosions := 0

    for i := 0; i < len(result) && explosions < config.MaxTimes; i++ {
        if result[i] >= config.Value {
            newRoll := r.rollDie(size)
            result = append(result, newRoll)
            explosions++
            i-- // 检查新掷出的骰子
        }
    }
    return result
}

// handleKeep 处理保留规则
func (r *Roller) handleKeep(rolls []int, config *KeepConfig) (kept, dropped []int) {
    // 复制并排序
    sorted := make([]int, len(rolls))
    copy(sorted, rolls)

    if config.Type == KeepHighest {
        sort.Slice(sorted, func(i, j int) bool {
            return sorted[i] > sorted[j]
        })
    } else {
        sort.Ints(sorted)
    }

    if config.Count > len(sorted) {
        config.Count = len(sorted)
    }

    kept = sorted[:config.Count]
    dropped = sorted[config.Count:]
    return
}
```

### 2.2 FormulaParser 组件

```go
// internal/server/dice/formula.go

package dice

import (
    "fmt"
    "regexp"
    "strconv"
)

// FormulaParser 骰子表达式解析器
type FormulaParser struct {
    re *regexp.Regexp
}

// NewFormulaParser 创建解析器
func NewFormulaParser() *FormulaParser {
    // 正则表达式匹配骰子表达式
    // 格式: [count]d<size>[+/-modifier][k<count>][r<values>][![value]]
    re := regexp.MustCompile(`^(\d*)d(\d+)([+-]\d+)?(k([hl]?\d+))?(r([\d,]+))?(!!?(\d+))?$`)

    return &FormulaParser{re: re}
}

// Parse 解析骰子表达式
func (p *FormulaParser) Parse(formula string) (*DiceFormula, error) {
    matches := p.re.FindStringSubmatch(formula)
    if matches == nil {
        return nil, ErrInvalidFormula
    }

    result := &DiceFormula{
        original: formula,
    }

    // 解析骰子数量
    if matches[1] != "" {
        count, err := strconv.Atoi(matches[1])
        if err != nil || count < 1 {
            return nil, fmt.Errorf("invalid dice count: %s", matches[1])
        }
        result.Count = count
    } else {
        result.Count = 1
    }

    // 解析骰子面数
    size, err := strconv.Atoi(matches[2])
    if err != nil || size < 1 {
        return nil, fmt.Errorf("invalid dice size: %s", matches[2])
    }
    result.Size = size

    // 解析调整值
    if matches[3] != "" {
        modifier, err := strconv.Atoi(matches[3])
        if err != nil {
            return nil, fmt.Errorf("invalid modifier: %s", matches[3])
        }
        result.Modifier = modifier
    }

    // 解析保留规则 (k3, kh3, kl3)
    if matches[4] != "" {
        keepStr := matches[5]
        keepType := KeepHighest
        if len(keepStr) > 0 && (keepStr[0] == 'h' || keepStr[0] == 'l') {
            if keepStr[0] == 'l' {
                keepType = KeepLowest
            }
            keepStr = keepStr[1:]
        }

        keepCount, err := strconv.Atoi(keepStr)
        if err != nil || keepCount < 1 {
            return nil, fmt.Errorf("invalid keep count: %s", matches[5])
        }

        result.Keep = &KeepConfig{
            Type:  keepType,
            Count: keepCount,
        }
    }

    // 解析重掷规则 (r1, r1,2)
    if matches[6] != "" {
        rerollStr := matches[7]
        rerollValues := p.parseCommaSeparated(rerollStr)
        result.Reroll = rerollValues
    }

    // 解析爆骰规则 (!, !!10)
    if matches[8] != "" {
        explodeValue := size // 默认最大值爆骰
        if matches[9] != "" {
            val, err := strconv.Atoi(matches[9])
            if err != nil {
                return nil, fmt.Errorf("invalid explode value: %s", matches[9])
            }
            explodeValue = val
        }

        maxTimes := 10 // 默认最多爆 10 次
        if len(matches[8]) > 2 {
            maxTimes = 100 // !! 表示无限爆骰
        }

        result.Explode = &ExplodeConfig{
            Value:    explodeValue,
            MaxTimes: maxTimes,
        }
    }

    return result, nil
}

// parseCommaSeparated 解析逗号分隔的值
func (p *FormulaParser) parseCommaSeparated(s string) []int {
    parts := splitString(s, ',')
    values := make([]int, 0, len(parts))

    for _, part := range parts {
        if val, err := strconv.Atoi(part); err == nil {
            values = append(values, val)
        }
    }

    return values
}

// DiceFormula 骰子公式
type DiceFormula struct {
    original string
    Count    int
    Size     int
    Modifier int
    Keep     *KeepConfig
    Reroll   []int
    Explode  *ExplodeConfig
}

// String 返回公式字符串表示
func (df *DiceFormula) String() string {
    return df.original
}

// KeepConfig 保留配置
type KeepConfig struct {
    Type  KeepType
    Count int
}

// KeepType 保留类型
type KeepType string

const (
    KeepHighest KeepType = "highest"
    KeepLowest  KeepType = "lowest"
)

// ExplodeConfig 爆骰配置
type ExplodeConfig struct {
    Value    int
    MaxTimes int
}

var (
    ErrInvalidFormula = errors.New("invalid dice formula")
)
```

### 2.3 CheckCalculator 组件

```go
// internal/server/dice/check.go

package dice

import (
    "context"
    "fmt"
)

// CheckCalculator 检定计算器
type CheckCalculator struct {
    roller      *Roller
    advantage   *AdvantageProcessor
    critical    *CriticalProcessor
}

// NewCheckCalculator 创建检定计算器
func NewCheckCalculator(roller *Roller) *CheckCalculator {
    return &CheckCalculator{
        roller:    roller,
        advantage: NewAdvantageProcessor(),
        critical:  NewCriticalProcessor(),
    }
}

// AbilityCheck 属性检定
func (cc *CheckCalculator) AbilityCheck(ctx context.Context, req *AbilityCheckRequest) (*CheckResult, error) {
    // 计算调整值
    modifier := (req.AbilityScore - 10) / 2
    if req.Proficient {
        modifier += req.ProficiencyBonus
    }

    // 构建公式
    formula := fmt.Sprintf("1d20%+d", modifier)

    // 处理优势/劣势
    var roll *DiceRollResult
    var err error

    switch req.Advantage {
    case AdvantageAdvantage:
        roll, err = cc.roller.RollWithAdvantage(formula)
    case AdvantageDisadvantage:
        roll, err = cc.roller.RollWithDisadvantage(formula)
    default:
        roll, err = cc.roller.Roll(formula)
    }

    if err != nil {
        return nil, err
    }

    // 处理大成功/大失败
    cc.critical.ApplyToCheck(roll, req)

    result := &CheckResult{
        Type:      CheckTypeAbility,
        Ability:   req.Ability,
        Roll:      roll,
        Modifier:  modifier,
        DC:        req.DC,
        Advantage: req.Advantage,
    }

    // 判定成功/失败
    if req.DC > 0 {
        success := roll.Total >= req.DC
        if roll.Critical {
            success = true
        }
        if roll.Fumble {
            success = false
        }
        result.Success = &success
    }

    return result, nil
}

// SkillCheck 技能检定
func (cc *CheckCalculator) SkillCheck(ctx context.Context, req *SkillCheckRequest) (*CheckResult, error) {
    // 计算调整值
    modifier := (req.AbilityScore - 10) / 2

    if req.Proficient {
        bonus := req.ProficiencyBonus
        if req.Expertise {
            bonus *= 2 // 专精双倍熟练
        }
        modifier += bonus
    }

    // 构建公式
    formula := fmt.Sprintf("1d20%+d", modifier)

    // 处理优势/劣势
    var roll *DiceRollResult
    var err error

    switch req.Advantage {
    case AdvantageAdvantage:
        roll, err = cc.roller.RollWithAdvantage(formula)
    case AdvantageDisadvantage:
        roll, err = cc.roller.RollWithDisadvantage(formula)
    default:
        roll, err = cc.roller.Roll(formula)
    }

    if err != nil {
        return nil, err
    }

    // 处理大成功/大失败
    cc.critical.ApplyToCheck(roll, req)

    result := &CheckResult{
        Type:      CheckTypeSkill,
        Skill:     req.Skill,
        Roll:      roll,
        Modifier:  modifier,
        DC:        req.DC,
        Advantage: req.Advantage,
    }

    // 判定成功/失败
    if req.DC > 0 {
        success := roll.Total >= req.DC
        if roll.Critical {
            success = true
        }
        if roll.Fumble {
            success = false
        }
        result.Success = &success
    }

    return result, nil
}

// SavingThrow 豁免检定
func (cc *CheckCalculator) SavingThrow(ctx context.Context, req *SavingThrowRequest) (*CheckResult, error) {
    // 计算调整值
    modifier := (req.AbilityScore - 10) / 2
    if req.Proficient {
        modifier += req.ProficiencyBonus
    }

    // 构建公式
    formula := fmt.Sprintf("1d20%+d", modifier)

    // 处理优势/劣势
    var roll *DiceRollResult
    var err error

    switch req.Advantage {
    case AdvantageAdvantage:
        roll, err = cc.roller.RollWithAdvantage(formula)
    case AdvantageDisadvantage:
        roll, err = cc.roller.RollWithDisadvantage(formula)
    default:
        roll, err = cc.roller.Roll(formula)
    }

    if err != nil {
        return nil, err
    }

    // 处理大成功/大失败
    cc.critical.ApplyToCheck(roll, req)

    result := &CheckResult{
        Type:      CheckTypeSavingThrow,
        Ability:   req.Ability,
        Roll:      roll,
        Modifier:  modifier,
        DC:        req.DC,
        Advantage: req.Advantage,
    }

    // 判定成功/失败
    if req.DC > 0 {
        success := roll.Total >= req.DC
        if roll.Critical {
            success = true
        }
        if roll.Fumble {
            success = false
        }
        result.Success = &success
    }

    return result, nil
}

// AttackRoll 攻击检定
func (cc *CheckCalculator) AttackRoll(ctx context.Context, req *AttackRollRequest) (*CheckResult, error) {
    // 构建公式
    formula := fmt.Sprintf("1d20%+d", req.AttackBonus)

    // 处理优势/劣势
    var roll *DiceRollResult
    var err error

    switch req.Advantage {
    case AdvantageAdvantage:
        roll, err = cc.roller.RollWithAdvantage(formula)
    case AdvantageDisadvantage:
        roll, err = cc.roller.RollWithDisadvantage(formula)
    default:
        roll, err = cc.roller.Roll(formula)
    }

    if err != nil {
        return nil, err
    }

    // 攻击检定大成功/大失败规则
    cc.critical.ApplyToAttack(roll)

    result := &CheckResult{
        Type:      CheckTypeAttack,
        Roll:      roll,
        Modifier:  req.AttackBonus,
        DC:        req.TargetAC,
        Advantage: req.Advantage,
    }

    // 判定命中/失误
    success := roll.Total >= req.TargetAC
    if roll.Critical {
        success = true
    }
    if roll.Fumble {
        success = false
    }
    result.Success = &success

    return result, nil
}

// DamageRoll 伤害掷骰
func (cc *CheckCalculator) DamageRoll(ctx context.Context, req *DamageRollRequest) (*DamageRollResult, error) {
    roll, err := cc.roller.Roll(req.Formula)
    if err != nil {
        return nil, err
    }

    result := &DamageRollResult{
        Roll:      roll,
        BaseTotal: roll.Total,
    }

    // 处理暴击伤害
    if req.Critical {
        critRolls := make([]int, len(roll.Dice))
        for i, die := range roll.Dice {
            critRolls = append(critRolls, die) // 双倍骰子
        }
        result.CritDice = critRolls

        critTotal := roll.Total
        for _, die := range roll.Dice {
            critTotal += die
        }
        result.CritTotal = critTotal
        result.FinalTotal = critTotal
    } else {
        result.FinalTotal = roll.Total
    }

    return result, nil
}

// AbilityCheckRequest 属性检定请求
type AbilityCheckRequest struct {
    Ability          Ability
    AbilityScore     int
    Proficient       bool
    ProficiencyBonus int
    Advantage        AdvantageType
    DC               int
}

// SkillCheckRequest 技能检定请求
type SkillCheckRequest struct {
    Skill            Skill
    AbilityScore     int
    Proficient       bool
    Expertise        bool
    ProficiencyBonus int
    Advantage        AdvantageType
    DC               int
}

// SavingThrowRequest 豁免检定请求
type SavingThrowRequest struct {
    Ability          Ability
    AbilityScore     int
    Proficient       bool
    ProficiencyBonus int
    Advantage        AdvantageType
    DC               int
}

// AttackRollRequest 攻击检定请求
type AttackRollRequest struct {
    AttackBonus int
    TargetAC    int
    Advantage   AdvantageType
}

// DamageRollRequest 伤害掷骰请求
type DamageRollRequest struct {
    Formula   string
    Critical  bool
}
```

### 2.4 AdvantageProcessor 组件

```go
// internal/server/dice/advantage.go

package dice

// AdvantageProcessor 优势/劣势处理器
type AdvantageProcessor struct{}

// NewAdvantageProcessor 创建优势处理器
func NewAdvantageProcessor() *AdvantageProcessor {
    return &AdvantageProcessor{}
}

// ResolveAdvantage 解决优势/劣势冲突
// 优势和劣势抵消，结果为普通
func (ap *AdvantageProcessor) ResolveAdvantage(hasAdvantage, hasDisadvantage bool) AdvantageType {
    if hasAdvantage && !hasDisadvantage {
        return AdvantageAdvantage
    }
    if hasDisadvantage && !hasAdvantage {
        return AdvantageDisadvantage
    }
    return AdvantageNormal
}

// CombineAdvantage 合并多个优势/劣势状态
func (ap *AdvantageProcessor) CombineAdvantage(states []AdvantageType) AdvantageType {
    hasAdvantage := false
    hasDisadvantage := false

    for _, state := range states {
        switch state {
        case AdvantageAdvantage:
            hasAdvantage = true
        case AdvantageDisadvantage:
            hasDisadvantage = true
        }
    }

    return ap.ResolveAdvantage(hasAdvantage, hasDisadvantage)
}

// AdvantageType 优势类型
type AdvantageType string

const (
    AdvantageNormal      AdvantageType = "normal"
    AdvantageAdvantage   AdvantageType = "advantage"
    AdvantageDisadvantage AdvantageType = "disadvantage"
)
```

### 2.5 CriticalProcessor 组件

```go
// internal/server/dice/critical.go

package dice

// CriticalProcessor 临界值处理器
type CriticalProcessor struct {
    criticalHitValue int
    criticalMissValue int
}

// NewCriticalProcessor 创建临界值处理器
func NewCriticalProcessor() *CriticalProcessor {
    return &CriticalProcessor{
        criticalHitValue:  20,
        criticalMissValue: 1,
    }
}

// ApplyToCheck 应用临界值到检定
func (cp *CriticalProcessor) ApplyToCheck(roll *DiceRollResult, req interface{}) {
    // 检定中，大成功自动成功，大失败自动失败
    // 已经在 Roller 中设置 Critical 和 Fumble 标志
}

// ApplyToAttack 应用临界值到攻击检定
func (cp *CriticalProcessor) ApplyToAttack(roll *DiceRollResult) {
    // 攻击检定中，大成功自动命中，大失败自动失误
    // 已经在 Roller 中设置 Critical 和 Fumble 标志

    // 大失败可能引发额外效果（如掉落武器）
    if roll.Fumble {
        roll.Fumble = true
    }
}

// IsCriticalHit 检查是否大成功
func (cp *CriticalProcessor) IsCriticalHit(roll *DiceRollResult) bool {
    return roll.Critical
}

// IsCriticalMiss 检查是否大失败
func (cp *CriticalProcessor) IsCriticalMiss(roll *DiceRollResult) bool {
    return roll.Fumble
}
```

---

## 3. 数据模型

### 3.1 结果模型

```go
// DiceRollResult 骰子掷骰结果
type DiceRollResult struct {
    Formula  string `json:"formula"`
    Dice     []int  `json:"dice"`
    Dropped  []int  `json:"dropped,omitempty"`
    Modifier int    `json:"modifier"`
    Total    int    `json:"total"`
    Critical bool   `json:"critical"`
    Fumble   bool   `json:"fumble"`
}

// CheckResult 检定结果
type CheckResult struct {
    Type      CheckType      `json:"type"`
    Ability   Ability        `json:"ability,omitempty"`
    Skill     Skill          `json:"skill,omitempty"`
    Roll      *DiceRollResult `json:"roll"`
    Modifier  int            `json:"modifier"`
    DC        int            `json:"dc,omitempty"`
    Success   *bool          `json:"success,omitempty"`
    Advantage AdvantageType  `json:"advantage"`
    Description string       `json:"description,omitempty"`
}

// DamageRollResult 伤害掷骰结果
type DamageRollResult struct {
    Roll       *DiceRollResult `json:"roll"`
    BaseTotal  int             `json:"baseTotal"`
    CritDice   []int           `json:"critDice,omitempty"`
    CritTotal  int             `json:"critTotal,omitempty"`
    FinalTotal int             `json:"finalTotal"`
}
```

### 3.2 枚举类型

```go
// CheckType 检定类型
type CheckType string

const (
    CheckTypeAbility      CheckType = "ability_check"
    CheckTypeSkill        CheckType = "skill_check"
    CheckTypeSavingThrow  CheckType = "saving_throw"
    CheckTypeAttack       CheckType = "attack"
    CheckTypeDamage       CheckType = "damage"
    CheckTypeInitiative   CheckType = "initiative"
    CheckTypeDeathSave    CheckType = "death_save"
)

// Ability 属性
type Ability string

const (
    AbilityStrength     Ability = "strength"
    AbilityDexterity    Ability = "dexterity"
    AbilityConstitution Ability = "constitution"
    AbilityIntelligence Ability = "intelligence"
    AbilityWisdom       Ability = "wisdom"
    AbilityCharisma     Ability = "charisma"
)

// Skill 技能
type Skill string

const (
    SkillAcrobatics      Skill = "acrobatics"
    SkillAnimalHandling  Skill = "animal_handling"
    SkillArcana          Skill = "arcana"
    SkillAthletics       Skill = "athletics"
    SkillDeception       Skill = "deception"
    SkillHistory         Skill = "history"
    SkillInsight         Skill = "insight"
    SkillIntimidation    Skill = "intimidation"
    SkillInvestigation   Skill = "investigation"
    SkillMedicine        Skill = "medicine"
    SkillNature          Skill = "nature"
    SkillPerception      Skill = "perception"
    SkillPerformance     Skill = "performance"
    SkillPersuasion      Skill = "persuasion"
    SkillReligion        Skill = "religion"
    SkillSleightOfHand   Skill = "sleight_of_hand"
    SkillStealth         Skill = "stealth"
    SkillSurvival        Skill = "survival"
)
```

---

## 4. 组件间通信方式

### 4.1 直接调用

```go
// CheckCalculator 直接调用 Roller
func (cc *CheckCalculator) AbilityCheck(...) {
    roll, err := cc.roller.Roll(formula)
    // ...
}
```

### 4.2 回调接口

```go
// RollCallback 掷骰回调
type RollCallback interface {
    OnRoll(result *DiceRollResult)
    OnCritical(result *DiceRollResult)
    OnFumble(result *DiceRollResult)
}

// Roller 支持回调
func (r *Roller) RollWithCallback(formula string, callback RollCallback) (*DiceRollResult, error) {
    result, err := r.Roll(formula)
    if err != nil {
        return nil, err
    }

    callback.OnRoll(result)
    if result.Critical {
        callback.OnCritical(result)
    }
    if result.Fumble {
        callback.OnFumble(result)
    }

    return result, nil
}
```

---

## 5. 状态管理设计

### 5.1 无状态设计

检定系统本身是无状态的，所有状态都在请求中传递。

### 5.2 统计跟踪

```go
// RollStatistics 掷骰统计
type RollStatistics struct {
    mu              sync.Mutex
    TotalRolls      int
    CriticalHits    int
    CriticalMisses  int
    FormulaCounts   map[string]int
    AverageRolls    map[string]float64
}

// Record 记录掷骰
func (rs *RollStatistics) Record(result *DiceRollResult) {
    rs.mu.Lock()
    defer rs.mu.Unlock()

    rs.TotalRolls++
    if result.Critical {
        rs.CriticalHits++
    }
    if result.Fumble {
        rs.CriticalMisses++
    }

    if rs.FormulaCounts == nil {
        rs.FormulaCounts = make(map[string]int)
    }
    rs.FormulaCounts[result.Formula]++
}
```

---

## 6. 错误处理设计

### 6.1 错误类型

```go
var (
    ErrInvalidFormula     = errors.New("invalid dice formula")
    ErrInvalidDiceCount   = errors.New("invalid dice count")
    ErrInvalidDiceSize    = errors.New("invalid dice size")
    ErrInvalidModifier    = errors.New("invalid modifier")
    ErrInvalidKeepCount   = errors.New("invalid keep count")
    ErrInvalidRerollValue = errors.New("invalid reroll value")
)
```

### 6.2 验证

```go
// Validate 验证公式
func (p *FormulaParser) Validate(formula string) error {
    parsed, err := p.Parse(formula)
    if err != nil {
        return err
    }

    if parsed.Count < 1 || parsed.Count > 100 {
        return fmt.Errorf("dice count out of range: %d", parsed.Count)
    }

    if parsed.Size < 2 || parsed.Size > 1000 {
        return fmt.Errorf("dice size out of range: %d", parsed.Size)
    }

    if parsed.Keep != nil && parsed.Keep.Count > parsed.Count {
        return fmt.Errorf("keep count exceeds dice count")
    }

    return nil
}
```

---

## 7. 测试支持

### 7.1 确定性测试

```go
// 测试用种子
const TestSeed = 12345

func TestRoller_Deterministic(t *testing.T) {
    roller := NewRollerWithSeed(TestSeed)

    result1, _ := roller.Roll("1d20")
    result2, _ := roller.Roll("1d20")

    assert.Equal(t, result1.Total, result2.Total)
}
```

### 7.2 统计测试

```go
func TestRoller_Distribution(t *testing.T) {
    roller := NewRoller()
    counts := make(map[int]int)

    for i := 0; i < 10000; i++ {
        result, _ := roller.Roll("1d20")
        counts[result.Dice[0]]++
    }

    // 检查均匀分布
    expected := 10000 / 20
    for i := 1; i <= 20; i++ {
        assert.InDelta(t, expected, counts[i], 200)
    }
}
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
**组件设计师**: component-designer
