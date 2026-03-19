# 地图系统设计

> **模块名称**: map
> **版本**: v1.0
> **创建日期**: 2026-03-16

---

## 1. 模块概述

### 1.1 模块职责

地图系统负责游戏场景地图的管理：
- 地图数据加载和解析（FVTT 兼容格式）
- 地图分层管理（背景、墙壁、物体、光照）
- 角色位置管理和移动
- 碰撞检测
- 视线计算

### 1.2 模块边界

**包含**：
- 地图数据模型和加载
- 网格系统（方格/六角格）
- 墙壁和障碍物数据
- 碰撞检测
- 距离和视线计算

**不包含**：
- 地图渲染（由前端负责）
- 战斗规则（由战斗系统负责）
- 剧本逻辑（由剧本系统负责）

---

## 2. 目录结构

```
internal/server/map/
├── map.go                 # 地图模型定义
├── loader.go              # 地图加载器
├── grid.go                # 网格系统
├── position.go            # 位置管理
├── collision.go           # 碰撞检测
├── line_of_sight.go       # 视线计算
├── pathfinding.go         # 寻路算法
├── wall.go                # 墙壁定义
├── tile.go                # 地砖定义
└── fvtt/                  # FVTT 格式解析
    ├── parser.go
    └── converter.go
```

---

## 3. 数据模型

### 3.1 地图模型

```go
// internal/server/map/map.go

type GameMap struct {
    ID          string        `json:"id"`
    Name        string        `json:"name"`
    Description string        `json:"description"`
    Width       int           `json:"width"`     // 网格宽度
    Height      int           `json:"height"`    // 网格高度
    GridSize    int           `json:"gridSize"`  // 每格像素数
    GridType    GridType      `json:"gridType"`  // 网格类型

    // 地图层级
    Background  *MapLayer     `json:"background"`
    Walls       []Wall        `json:"walls"`
    Tiles       [][]Tile      `json:"tiles"`
    Lights      []Light       `json:"lights"`
    Objects     []MapObject   `json:"objects"`

    // 元数据
    ScenarioID  string        `json:"scenarioId,omitempty"`
    Connections []MapConnection `json:"connections,omitempty"` // 与其他地图的连接

    // 入口/出口
    Entrances   []Entrance    `json:"entrances"`
    Exits       []Exit        `json:"exits"`
}

type MapID string

type GridType string

const (
    GridTypeSquare GridType = "square"  // 方格
    GridTypeHex    GridType = "hex"     // 六角格
)
```

### 3.2 位置和坐标

```go
// internal/server/map/position.go

type Position struct {
    X int `json:"x"`
    Y int `json:"y"`
}

// 像素坐标（用于渲染）
type PixelPosition struct {
    X float64 `json:"x"`
    Y float64 `json:"y"`
}

// 转换为像素坐标
func (p *Position) ToPixel(gridSize int) PixelPosition {
    return PixelPosition{
        X: float64(p.X * gridSize),
        Y: float64(p.Y * gridSize),
    }
}

// 距离计算
func (p *Position) DistanceTo(other *Position) int {
    // 曼哈顿距离或切比雪夫距离
    dx := abs(p.X - other.X)
    dy := abs(p.Y - other.Y)
    if dx > dy {
        return dx
    }
    return dy
}

// 欧几里得距离（英尺，每格 5 英尺）
func (p *Position) EuclideanDistanceFeet(other *Position) float64 {
    dx := float64(p.X - other.X) * 5
    dy := float64(p.Y - other.Y) * 5
    return math.Sqrt(dx*dx + dy*dy)
}
```

### 3.3 地砖和层级

```go
// internal/server/map/tile.go

type Tile struct {
    Position    Position     `json:"position"`
    Type        TileType     `json:"type"`
    Walkable    bool         `json:"walkable"`
    Difficult   bool         `json:"difficult"` // 困难地形
    Image       string       `json:"image,omitempty"`
    Properties  map[string]interface{} `json:"properties,omitempty"`
}

type TileType string

const (
    TileTypeFloor    TileType = "floor"
    TileTypeWall     TileType = "wall"
    TileTypeWater    TileType = "water"
    TileTypeLava     TileType = "lava"
    TileTypePit      TileType = "pit"
    TileTypeStairs   TileType = "stairs"
    TileTypeDoor     TileType = "door"
    TileTypeSpecial  TileType = "special"
)

type MapLayer struct {
    Name    string `json:"name"`
    Visible bool   `json:"visible"`
    Opacity float64 `json:"opacity"`
    Image   string `json:"image,omitempty"`
}
```

### 3.4 墙壁

```go
// internal/server/map/wall.go

type Wall struct {
    ID       string    `json:"id"`
    Start    Position  `json:"start"`
    End      Position  `json:"end"`
    Type     WallType  `json:"type"`
    Door     *Door     `json:"door,omitempty"`
}

type WallType string

const (
    WallTypeSolid    WallType = "solid"
    WallTypeDoor     WallType = "door"
    WallTypeSecret   WallType = "secret"
    WallTypeWindow   WallType = "window"
    WallTypeEthereal WallType = "ethereal"
)

type Door struct {
    ID         string     `json:"id"`
    State      DoorState  `json:"state"`
    Locked     bool       `json:"locked"`
    KeyID      string     `json:"keyId,omitempty"`
    DC         int        `json:"dc,omitempty"` // 撬锁 DC
}

type DoorState string

const (
    DoorStateOpen   DoorState = "open"
    DoorStateClosed DoorState = "closed"
    DoorStateLocked DoorState = "locked"
)
```

### 3.5 地图对象

```go
// internal/server/map/map.go

type MapObject struct {
    ID          string               `json:"id"`
    Name        string               `json:"name"`
    Position    Position             `json:"position"`
    Size        Size                 `json:"size"`
    Type        ObjectType           `json:"type"`
    Interactive bool                 `json:"interactive"`
    Properties  map[string]interface{} `json:"properties,omitempty"`
}

type Size struct {
    Width  int `json:"width"`
    Height int `json:"height"`
}

type ObjectType string

const (
    ObjectTypeFurniture ObjectType = "furniture"
    ObjectTypeContainer ObjectType = "container"
    ObjectTypeTrap      ObjectType = "trap"
    ObjectTypeTrigger   ObjectType = "trigger"
    ObjectTypeNPC       ObjectType = "npc"
    ObjectTypeTreasure  ObjectType = "treasure"
)
```

### 3.6 地图连接

```go
type MapConnection struct {
    ID           string   `json:"id"`
    TargetMapID  string   `json:"targetMapId"`
    Position     Position `json:"position"`
    TargetPos    Position `json:"targetPos"`
    Bidirectional bool    `json:"bidirectional"`
}

type Entrance struct {
    ID       string   `json:"id"`
    Position Position `json:"position"`
    Label    string   `json:"label,omitempty"`
}

type Exit struct {
    ID          string   `json:"id"`
    Position    Position `json:"position"`
    TargetMapID string   `json:"targetMapId"`
    TargetPos   Position `json:"targetPos"`
}
```

---

## 4. 对外接口

### 4.1 地图管理器

```go
// internal/server/map/map.go

type Manager struct {
    maps        map[string]*GameMap
    loader      *Loader
    pathfinder  *Pathfinder
}

func NewManager(loader *Loader) *Manager

// 加载地图
func (m *Manager) LoadMap(mapID string) (*GameMap, error)

// 获取地图
func (m *Manager) GetMap(mapID string) (*GameMap, error)

// 获取所有地图列表
func (m *Manager) GetMapList() []*MapSummary

type MapSummary struct {
    ID          string `json:"id"`
    Name        string `json:"name"`
    Description string `json:"description"`
    Width       int    `json:"width"`
    Height      int    `json:"height"`
}
```

### 4.2 位置管理器

```go
// internal/server/map/position.go

type PositionManager struct {
    mapMgr *Manager
}

func NewPositionManager(mapMgr *Manager) *PositionManager

// 移动角色
func (pm *PositionManager) MoveCharacter(charID string, newPos Position) error

// 获取角色位置
func (pm *PositionManager) GetCharacterPosition(charID string) *Position

// 检查位置是否有效
func (pm *PositionManager) IsValidPosition(m *GameMap, pos Position) bool

// 检查位置是否可行走
func (pm *PositionManager) IsWalkable(m *GameMap, pos Position) bool

// 获取相邻位置
func (pm *PositionManager) GetAdjacentPositions(pos Position) []Position

// 获取范围内的位置
func (pm *PositionManager) GetPositionsInRange(origin Position, rangeFeet int) []Position
```

### 4.3 碰撞检测器

```go
// internal/server/map/collision.go

type CollisionDetector struct {
    mapMgr *Manager
}

func NewCollisionDetector(mapMgr *Manager) *CollisionDetector

// 检查两点间是否有障碍物
func (cd *CollisionDetector) HasCollision(m *GameMap, from, to Position) bool

// 检查路径是否被墙壁阻挡
func (cd *CollisionDetector) IsBlockedByWall(m *GameMap, from, to Position) bool

// 获取碰撞的墙壁
func (cd *CollisionDetector) GetBlockingWall(m *GameMap, from, to Position) *Wall

// 检查位置是否在地图边界内
func (cd *CollisionDetector) IsInBounds(m *GameMap, pos Position) bool
```

### 4.4 视线计算器

```go
// internal/server/map/line_of_sight.go

type LineOfSightCalculator struct {
    collisionDetector *CollisionDetector
}

func NewLineOfSightCalculator(cd *CollisionDetector) *LineOfSightCalculator

// 检查两点间是否有视线
func (los *LineOfSightCalculator) HasLineOfSight(m *GameMap, from, to Position) bool

// 获取视线上的所有格子
func (los *LineOfSightCalculator) GetLine(from, to Position) []Position

// 获取可见范围
func (los *LineOfSightCalculator) GetVisiblePositions(m *GameMap, origin Position, rangeFeet int) []Position

// 获取掩护等级
func (los *LineOfSightCalculator) GetCoverLevel(m *GameMap, from, to Position) CoverLevel

type CoverLevel int

const (
    CoverNone CoverLevel = iota
    CoverHalf        // +2 AC
    CoverThreeQuarters // +5 AC
    CoverFull        // 不能被选中
)
```

### 4.5 寻路器

```go
// internal/server/map/pathfinding.go

type Pathfinder struct {
    collisionDetector *CollisionDetector
}

func NewPathfinder(cd *CollisionDetector) *Pathfinder

// 寻找路径
func (p *Pathfinder) FindPath(m *GameMap, start, end Position) ([]Position, error)

// 计算移动距离
func (p *Pathfinder) CalculateMovementCost(m *GameMap, path []Position) int

// 获取可移动范围
func (p *Pathfinder) GetMovablePositions(m *GameMap, start Position, maxDistance int) []Position
```

---

## 5. 组件划分

### 5.1 FVTT 格式解析器

```go
// internal/server/map/fvtt/parser.go

type FVTTParser struct{}

func NewFVTTParser() *FVTTParser

// 解析 FVTT 格式的地图数据
func (p *FVTTParser) Parse(data []byte) (*GameMap, error)

// 解析墙壁数据
func (p *FVTTParser) parseWalls(data json.RawMessage) ([]Wall, error)

// 解析地砖数据
func (p *FVTTParser) parseTiles(data json.RawMessage) ([][]Tile, error)

// 转换 FVTT 坐标到网格坐标
func (p *FVTTParser) convertToGridCoords(x, y float64, gridSize int) Position
```

### 5.2 Bresenham 直线算法

```go
// internal/server/map/line_of_sight.go

// GetLine 使用 Bresenham 算法获取两点间的直线格子
func (los *LineOfSightCalculator) GetLine(from, to Position) []Position {
    var points []Position

    x0, y0 := from.X, from.Y
    x1, y1 := to.X, to.Y

    dx := abs(x1 - x0)
    dy := abs(y1 - y0)
    sx := 1
    if x0 > x1 {
        sx = -1
    }
    sy := 1
    if y0 > y1 {
        sy = -1
    }
    err := dx - dy

    for {
        points = append(points, Position{X: x0, Y: y0})
        if x0 == x1 && y0 == y1 {
            break
        }
        e2 := 2 * err
        if e2 > -dy {
            err -= dy
            x0 += sx
        }
        if e2 < dx {
            err += dx
            y0 += sy
        }
    }

    return points
}
```

### 5.3 A* 寻路算法

```go
// internal/server/map/pathfinding.go

type pathNode struct {
    position Position
    g        int // 从起点到当前点的成本
    h        int // 从当前点到终点的估计成本
    f        int // g + h
    parent   *pathNode
}

func (p *Pathfinder) FindPath(m *GameMap, start, end Position) ([]Position, error) {
    if !p.collisionDetector.IsWalkable(m, start) || !p.collisionDetector.IsWalkable(m, end) {
        return nil, ErrPathNotFound
    }

    openList := []*pathNode{
        {position: start, g: 0, h: p.heuristic(start, end)},
    }
    openList[0].f = openList[0].h

    closedList := make(map[Position]bool)

    for len(openList) > 0 {
        // 获取 f 值最小的节点
        current := p.getLowestF(openList)
        if current.position == end {
            return p.reconstructPath(current), nil
        }

        // 从 openList 移除，加入 closedList
        openList = p.removeFromList(openList, current)
        closedList[current.position] = true

        // 检查相邻节点
        for _, neighbor := range p.getNeighbors(m, current.position) {
            if closedList[neighbor] {
                continue
            }

            tentativeG := current.g + p.getMovementCost(m, neighbor)

            existingNode := p.findInList(openList, neighbor)
            if existingNode == nil {
                newNode := &pathNode{
                    position: neighbor,
                    g:        tentativeG,
                    h:        p.heuristic(neighbor, end),
                    parent:   current,
                }
                newNode.f = newNode.g + newNode.h
                openList = append(openList, newNode)
            } else if tentativeG < existingNode.g {
                existingNode.g = tentativeG
                existingNode.f = existingNode.g + existingNode.h
                existingNode.parent = current
            }
        }
    }

    return nil, ErrPathNotFound
}

func (p *Pathfinder) heuristic(a, b Position) int {
    // 曼哈顿距离
    return abs(a.X-b.X) + abs(a.Y-b.Y)
}
```

---

## 6. 模块间通信

### 6.1 与战斗系统通信

```go
// 战斗系统请求距离计算
func (m *Manager) GetDistance(from, to Position) (int, error) {
    // 返回以英尺为单位的距离
    return from.EuclideanDistanceFeet(to), nil
}

// 战斗系统请求移动路径
func (pm *PositionManager) MoveCharacter(charID string, targetPos Position, maxDistance int) ([]Position, error) {
    m := pm.GetCurrentMap()
    currentPos := pm.GetCharacterPosition(charID)

    path, err := pm.pathfinder.FindPath(m, *currentPos, targetPos)
    if err != nil {
        return nil, err
    }

    // 检查移动距离限制
    cost := pm.pathfinder.CalculateMovementCost(m, path)
    if cost > maxDistance {
        return nil, ErrMoveDistanceExceeded
    }

    // 执行移动
    pm.setCharacterPosition(charID, targetPos)

    return path, nil
}
```

### 6.2 与剧本系统通信

```go
// 剧本系统请求进入地图
func (m *Manager) EnterMap(sessionID string, mapID string, entranceID string) error {
    gameMap, err := m.LoadMap(mapID)
    if err != nil {
        return err
    }

    // 找到入口位置
    var entrance *Entrance
    for _, e := range gameMap.Entrances {
        if e.ID == entranceID {
            entrance = &e
            break
        }
    }

    if entrance == nil {
        return ErrEntranceNotFound
    }

    // 设置当前地图
    m.SetCurrentMap(sessionID, gameMap)

    // 放置角色在入口位置
    return nil
}

// 触发地图出口
func (m *Manager) CheckExit(sessionID string, pos Position) (*Exit, bool) {
    gameMap := m.GetCurrentMap(sessionID)
    for _, exit := range gameMap.Exits {
        if exit.Position == pos {
            return &exit, true
        }
    }
    return nil, false
}
```

---

## 7. 配置项

```yaml
map:
  # 地图数据路径
  data_path: "./data/maps"

  # 网格设置
  grid:
    default_size: 70  # 像素
    feet_per_cell: 5  # 每格英尺数

  # 寻路设置
  pathfinding:
    algorithm: "a_star"
    diagonal_movement: true
    diagonal_cost: 1.414  # sqrt(2)

  # 视线设置
  line_of_sight:
    algorithm: "bresenham"
    corner_cutting: false
```

---

## 8. FVTT 格式兼容

### 8.1 支持的 FVTT 元素

| 元素 | 支持程度 | 说明 |
|------|----------|------|
| Walls | 完全支持 | 转换为 Wall 结构 |
| Tiles | 完全支持 | 转换为 Tile 数组 |
| Lights | 部分支持 | v1 仅视觉，不影响规则 |
| Drawings | 不支持 | 纯装饰元素 |
| Notes | 部分支持 | 提取为描述信息 |
| Tokens | 不支持 | 由角色系统管理 |

### 8.2 转换规则

```go
// FVTT 墙壁格式转换
func (p *FVTTParser) parseWall(wallData map[string]interface{}) Wall {
    return Wall{
        ID:    uuid.New().String(),
        Start: Position{
            X: int(wallData["c"].([]interface{})[0].(float64) / float64(gridSize)),
            Y: int(wallData["c"].([]interface{})[1].(float64) / float64(gridSize)),
        },
        End: Position{
            X: int(wallData["c"].([]interface{})[2].(float64) / float64(gridSize)),
            Y: int(wallData["c"].([]interface{})[3].(float64) / float64(gridSize)),
        },
        Type: p.convertWallType(wallData["move"].(float64)),
    }
}
```

---

**文档版本**：v1.0
**创建日期**：2026-03-16
