# 检定系统设计

> **模块名称**: dice
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

检定系统负责 D&D 5e 所有骰子检定的实施：
- 骰子表达式解析和掷骰
- 属性检定
- 技能检定
- 豁免检定
- 攻击检定
- 伤害掷骰

### 1.2 模块边界

**包含**：
- 骰子表达式解析器
- 随机数生成和掷骰
- 检定规则（优势/劣势、自动成功/失败）
- 检定结果计算

**不包含**：
- 检定结果的业务应用（由其他模块负责）
- 检定触发条件判断（由剧本/Client 模块负责）

---

## 2. 目录结构

```
internal/server/dice/
├── roller.go              # 掷骰器
├── formula.go             # 骰子表达式解析
├── check.go               # 检定计算
├── ability_check.go       # 属性检定
├── skill_check.go         # 技能检定
├── saving_throw.go        # 豁免检定
├── attack_roll.go         # 攻击检定
├── damage_roll.go         # 伤害掷骰
├── result.go              # 检定结果
└── random.go              # 随机数生成
```

---

## 3. 数据模型

### 3.1 骰子表达式

```go
// internal/server/dice/formula.go

type DiceFormula struct {
    Count      int          `json:"count"`      // 骰子数量
    Size       int          `json:"size"`       // 骰子面数
    Modifier   int          `json:"modifier"`   // 固定加值
    Keep       *KeepConfig  `json:"keep,omitempty"` // 保留规则
    Reroll     []int        `json:"reroll,omitempty"` // 重掷值
    Explode    *ExplodeConfig `json:"explode,omitempty"` // 爆骰
}

type KeepConfig struct {
    Type   KeepType `json:"type"`
    Count  int      `json:"count"`
}

type KeepType string

const (
    KeepHighest KeepType = "highest"
    KeepLowest  KeepType = "lowest"
)

type ExplodeConfig struct {
    Value    int `json:"value"`    // 触发爆骰的值
    MaxTimes int `json:"maxTimes"` // 最大爆骰次数
}
```

### 3.2 检定结果

```go
// internal/server/dice/result.go

type DiceRollResult struct {
    Formula    string `json:"formula"`
    Dice       []int  `json:"dice"`       // 每个骰子的结果
    Dropped    []int  `json:"dropped"`    // 被丢弃的骰子（优势/劣势）
    Modifier   int    `json:"modifier"`
    Total      int    `json:"total"`
    Critical   bool   `json:"critical"`   // 大成功（d20 掷出 20）
    Fumble     bool   `json:"fumble"`     // 大失败（d20 掷出 1）
}

type CheckResult struct {
    Type        CheckType `json:"type"`
    RollerID    string    `json:"rollerId"`
    Roll        *DiceRollResult `json:"roll"`
    DC          int       `json:"dc,omitempty"`
    Success     *bool     `json:"success,omitempty"` // 对比 DC 的结果
    Advantage   AdvantageType `json:"advantage"`
    Description string    `json:"description,omitempty"`
}

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

type AdvantageType string

const (
    AdvantageNormal      AdvantageType = "normal"
    AdvantageAdvantage   AdvantageType = "advantage"
    AdvantageDisadvantage AdvantageType = "disadvantage"
)
```

---

## 4. 对外接口

### 4.1 掷骰器

```go
// internal/server/dice/roller.go

type Roller struct {
    rng rand.Rand
}

func NewRoller() *Roller
func NewRollerWithSeed(seed int64) *Roller // 用于测试

// 掷骰（解析表达式）
func (r *Roller) Roll(formula string) (*DiceRollResult, error)

// 掷骰（使用解析后的公式）
func (r *Roller) RollFormula(formula *DiceFormula) (*DiceRollResult, error)

// 掷单个骰子
func (r *Roller) RollDie(size int) int

// 掷多个骰子
func (r *Roller) RollDice(count, size int) []int

// 优势掷骰（取高）
func (r *Roller) RollWithAdvantage(formula string) (*DiceRollResult, error)

// 劣势掷骰（取低）
func (r *Roller) RollWithDisadvantage(formula string) (*DiceRollResult, error)

// 掷骰并对比 DC
func (r *Roller) RollAgainstDC(formula string, dc int, advantage AdvantageType) (*CheckResult, error)
```

### 4.2 骰子表达式解析器

```go
// internal/server/dice/formula.go

type FormulaParser struct{}

func NewFormulaParser() *FormulaParser

// 解析骰子表达式
// 支持格式：d20, 1d20, 2d6, 1d20+5, 2d6+3, 4d6k3 (keep highest 3)
func (p *FormulaParser) Parse(formula string) (*DiceFormula, error)

// 解析并验证
func (p *FormulaParser) ParseAndValidate(formula string) (*DiceFormula, error)
```

### 4.3 检定计算器

```go
// internal/server/dice/check.go

type CheckCalculator struct {
    roller *Roller
}

func NewCheckCalculator(roller *Roller) *CheckCalculator

// 属性检定
func (cc *CheckCalculator) AbilityCheck(
    abilityScore int,
    proficient bool,
    proficiencyBonus int,
    advantage AdvantageType,
    dc int,
) (*CheckResult, error)

// 技能检定
func (cc *CheckCalculator) SkillCheck(
    abilityScore int,
    proficient bool,
    expertise bool, // 专精（双倍熟练）
    proficiencyBonus int,
    advantage AdvantageType,
    dc int,
) (*CheckResult, error)

// 豁免检定
func (cc *CheckCalculator) SavingThrow(
    abilityScore int,
    proficient bool,
    proficiencyBonus int,
    advantage AdvantageType,
    dc int,
) (*CheckResult, error)

// 攻击检定
func (cc *CheckCalculator) AttackRoll(
    attackBonus int,
    advantage AdvantageType,
    targetAC int,
) (*CheckResult, error)

// 伤害掷骰
func (cc *CheckCalculator) DamageRoll(
    formula string,
    critical bool,
) (*DiceRollResult, error)
```

---

## 5. 组件划分

### 5.1 骰子表达式解析

```go
// internal/server/dice/formula.go

func (p *FormulaParser) Parse(formula string) (*DiceFormula, error) {
    // 正则表达式匹配
    // 格式: [count]d<size>[+/-modifier][k<count>][!value]
    re := regexp.MustCompile(`^(\d*)d(\d+)([+-]\d+)?(k(\d+))?(r(\d+))?(!!?(\d+))?$`)

    matches := re.FindStringSubmatch(formula)
    if matches == nil {
        return nil, ErrInvalidFormula
    }

    result := &DiceFormula{}

    // 解析骰子数量
    if matches[1] != "" {
        count, _ := strconv.Atoi(matches[1])
        result.Count = count
    } else {
        result.Count = 1
    }

    // 解析骰子面数
    size, _ := strconv.Atoi(matches[2])
    result.Size = size

    // 解析调整值
    if matches[3] != "" {
        modifier, _ := strconv.Atoi(matches[3])
        result.Modifier = modifier
    }

    // 解析保留规则 (k3 = keep highest 3)
    if matches[5] != "" {
        keepCount, _ := strconv.Atoi(matches[5])
        result.Keep = &KeepConfig{
            Type:  KeepHighest,
            Count: keepCount,
        }
    }

    return result, nil
}
```

### 5.2 掷骰执行

```go
// internal/server/dice/roller.go

func (r *Roller) RollFormula(formula *DiceFormula) (*DiceRollResult, error) {
    result := &DiceRollResult{
        Modifier: formula.Modifier,
    }

    // 掷骰
    rolls := r.RollDice(formula.Count, formula.Size)

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

    // 检查大成功/大失败
    if formula.Size == 20 && formula.Count == 1 {
        if result.Dice[0] == 20 {
            result.Critical = true
        } else if result.Dice[0] == 1 {
            result.Fumble = true
        }
    }

    return result, nil
}

func (r *Roller) handleReroll(rolls []int, size int, rerollValues []int) []int {
    rerollSet := make(map[int]bool)
    for _, v := range rerollValues {
        rerollSet[v] = true
    }

    for i, roll := range rolls {
        if rerollSet[roll] {
            rolls[i] = r.RollDie(size)
        }
    }
    return rolls
}

func (r *Roller) handleExplode(rolls []int, size int, config *ExplodeConfig) []int {
    result := rolls
    explosions := 0

    for i := 0; i < len(result) && explosions < config.MaxTimes; i++ {
        if result[i] >= config.Value {
            result = append(result, r.RollDie(size))
            explosions++
        }
    }
    return result
}

func (r *Roller) handleKeep(rolls []int, config *KeepConfig) (kept, dropped []int) {
    // 复制并排序
    sorted := make([]int, len(rolls))
    copy(sorted, rolls)

    if config.Type == KeepHighest {
        sort.Sort(sort.Reverse(sort.IntSlice(sorted)))
    } else {
        sort.Ints(sorted)
    }

    kept = sorted[:config.Count]
    dropped = sorted[config.Count:]
    return
}

func (r *Roller) RollWithAdvantage(formula string) (*DiceRollResult, error) {
    parsed, err := NewFormulaParser().Parse(formula)
    if err != nil {
        return nil, err
    }

    // 掷两次
    roll1 := r.RollFormula(parsed)
    roll2 := r.RollFormula(parsed)

    // 取较高值
    result := roll1
    result.Dropped = []int{roll2.Dice[0]}
    if roll2.Total > roll1.Total {
        result = roll2
        result.Dropped = []int{roll1.Dice[0]}
    }

    return result, nil
}

func (r *Roller) RollWithDisadvantage(formula string) (*DiceRollResult, error) {
    parsed, err := NewFormulaParser().Parse(formula)
    if err != nil {
        return nil, err
    }

    // 掷两次
    roll1 := r.RollFormula(parsed)
    roll2 := r.RollFormula(parsed)

    // 取较低值
    result := roll1
    result.Dropped = []int{roll2.Dice[0]}
    if roll2.Total < roll1.Total {
        result = roll2
        result.Dropped = []int{roll1.Dice[0]}
    }

    return result, nil
}
```

### 5.3 检定计算

```go
// internal/server/dice/check.go

func (cc *CheckCalculator) AbilityCheck(
    abilityScore int,
    proficient bool,
    proficiencyBonus int,
    advantage AdvantageType,
    dc int,
) (*CheckResult, error) {
    // 计算调整值
    modifier := (abilityScore - 10) / 2
    if proficient {
        modifier += proficiencyBonus
    }

    // 掷骰
    formula := fmt.Sprintf("1d20+%d", modifier)

    var roll *DiceRollResult
    var err error

    switch advantage {
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

    result := &CheckResult{
        Type:      CheckTypeAbility,
        Roll:      roll,
        DC:        dc,
        Advantage: advantage,
    }

    // 判定成功/失败
    if dc > 0 {
        success := roll.Total >= dc
        result.Success = &success
    }

    return result, nil
}

func (cc *CheckCalculator) SkillCheck(
    abilityScore int,
    proficient bool,
    expertise bool,
    proficiencyBonus int,
    advantage AdvantageType,
    dc int,
) (*CheckResult, error) {
    modifier := (abilityScore - 10) / 2

    if proficient {
        if expertise {
            modifier += proficiencyBonus * 2 // 专精双倍熟练
        } else {
            modifier += proficiencyBonus
        }
    }

    formula := fmt.Sprintf("1d20+%d", modifier)

    var roll *DiceRollResult
    var err error

    switch advantage {
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

    result := &CheckResult{
        Type:      CheckTypeSkill,
        Roll:      roll,
        DC:        dc,
        Advantage: advantage,
    }

    if dc > 0 {
        success := roll.Total >= dc
        result.Success = &success
    }

    return result, nil
}
```

---

## 6. 支持的骰子表达式

| 表达式 | 说明 | 示例 |
|--------|------|------|
| `d20` | 掷一个 d20 | d20 |
| `1d20` | 掷一个 d20 | 1d20 |
| `2d6` | 掷两个 d6 | 2d6 |
| `1d20+5` | 掷 d20 加 5 | 1d20+5 |
| `2d6+3` | 掷 2d6 加 3 | 2d6+3 |
| `4d6k3` | 掷 4d6 保留最高的 3 个 | 4d6k3 |
| `2d6r1` | 掷 2d6，1 重掷 | 2d6r1 |
| `1d6!` | 爆骰（掷出 6 再掷一次） | 1d6! |

---

## 7. 测试策略

### 7.1 确定性测试

```go
func TestRoller_Deterministic(t *testing.T) {
    roller := NewRollerWithSeed(12345)

    result1 := roller.Roll("1d20")
    result2 := roller.Roll("1d20")

    // 相同种子应该产生相同序列
    assert.NotEqual(t, result1.Total, result2.Total)
}

func TestRoller_FormulaParsing(t *testing.T) {
    tests := []struct {
        formula string
        count   int
        size    int
        modifier int
    }{
        {"d20", 1, 20, 0},
        {"1d20", 1, 20, 0},
        {"2d6", 2, 6, 0},
        {"1d20+5", 1, 20, 5},
        {"2d6-2", 2, 6, -2},
    }

    parser := NewFormulaParser()
    for _, tt := range tests {
        result, err := parser.Parse(tt.formula)
        assert.NoError(t, err)
        assert.Equal(t, tt.count, result.Count)
        assert.Equal(t, tt.size, result.Size)
        assert.Equal(t, tt.modifier, result.Modifier)
    }
}
```

### 7.2 统计测试

```go
func TestRoller_Distribution(t *testing.T) {
    roller := NewRoller()
    counts := make(map[int]int)

    // 掷 10000 次 d20
    for i := 0; i < 10000; i++ {
        result := roller.Roll("1d20")
        counts[result.Dice[0]]++
    }

    // 检查分布是否均匀（卡方检验）
    // 每个值应该出现约 500 次
    for i := 1; i <= 20; i++ {
        ratio := float64(counts[i]) / 500.0
        assert.InDelta(t, 1.0, ratio, 0.3) // 30% 容差
    }
}
```

---

## 8. MCP 工具定义

### 8.1 掷骰工具

```go
var RollDiceDefinition = ToolDefinition{
    Name: "roll_dice",
    Description: "掷骰子。支持标准 D&D 骰子表达式，如 '1d20+5' 或 '2d6+3'。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "formula": map[string]interface{}{
                "type":        "string",
                "description": "骰子表达式",
            },
            "advantage": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"normal", "advantage", "disadvantage"},
                "description": "优势/劣势状态",
            },
            "dc": map[string]interface{}{
                "type":        "integer",
                "description": "难度等级（可选）",
            },
            "description": map[string]interface{}{
                "type":        "string",
                "description": "检定描述",
            },
        },
        "required": []string{"formula"},
    },
}
```

### 8.2 属性检定工具

```go
var AbilityCheckDefinition = ToolDefinition{
    Name: "ability_check",
    Description: "进行属性检定。",
    InputSchema: map[string]interface{}{
        "type": "object",
        "properties": map[string]interface{}{
            "characterId": map[string]interface{}{
                "type":        "string",
                "description": "角色 ID",
            },
            "ability": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"},
                "description": "检定属性",
            },
            "dc": map[string]interface{}{
                "type":        "integer",
                "description": "难度等级",
            },
            "advantage": map[string]interface{}{
                "type":        "string",
                "enum":        []string{"normal", "advantage", "disadvantage"},
            },
        },
        "required": []string{"characterId", "ability", "dc"},
    },
}
```

---

## 9. 配置项

```yaml
dice:
  # 随机数生成
  random:
    seed: -1  # -1 表示使用系统时间

  # 临界值
  critical:
    hit: 20   # 大成功
    fumble: 1 # 大失败

  # 死亡豁免
  death_save:
    success_threshold: 3
    failure_threshold: 3
    revive_on_20: true  # 掷出 20 恢复 1 HP
    double_fail_on_1: true  # 掷出 1 算两次失败
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
