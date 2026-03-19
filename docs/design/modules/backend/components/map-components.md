# 地图系统组件设计

> **模块名称**: map
> **版本**: v1.0
> **创建日期**: 2026-03-16
> **组件设计师**: component-designer

---

## 1. 组件概述

### 1.1 组件职责划分

地图系统由以下核心组件组成：

| 组件 | 职责 | 文件 |
|------|------|------|
| **MapManager** | 地图加载、缓存、生命周期管理 | map.go |
| **PositionManager** | 角色位置管理、移动验证 | position.go |
| **CollisionDetector** | 碰撞检测、障碍物判断 | collision.go |
| **LineOfSightCalculator** | 视线计算、掩护等级判定 | line_of_sight.go |
| **Pathfinder** | A* 寻路算法、移动成本计算 | pathfinding.go |
| **FVTTParser** | FVTT 格式地图数据解析 | fvtt/parser.go |
| **GridSystem** | 网格系统（方格/六角格） | grid.go |
| **TileManager** | 地砖数据管理和查询 | tile.go |
| **WallManager** | 墙壁/门数据管理 | wall.go |

### 1.2 组件依赖图

```
                        ┌─────────────────────┐
                        │    MapManager       │
                        │  (地图生命周期管理)  │
                        └──────────┬──────────┘
                                   │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        ▼                          ▼                          ▼
┌───────────────┐        ┌────────────────┐        ┌───────────────┐
│ PositionManager│        │  FVTTParser    │        │  GridSystem   │
│ (位置管理)      │        │  (格式解析)     │        │  (网格系统)    │
└───────┬───────┘        └────────────────┘        └───────┬───────┘
        │                                                   │
        │                          ┌────────────────────────┤
        │                          │                        │
        ▼                          ▼                        ▼
┌───────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│ CollisionDetector │    │ LineOfSightCalc  │    │   Pathfinder      │
│  (碰撞检测)        │    │   (视线计算)      │    │   (寻路算法)      │
└───────────────────┘    └──────────────────┘    └──────────────────┘
        │                        │                        │
        └────────────────────────┴────────────────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │  TileManager     │
                        │  WallManager     │
                        └──────────────────┘
```

---

## 2. 组件接口定义

### 2.1 MapManager 组件

```go
// internal/server/map/map.go

package map

import (
    "context"
    "sync"
)

// MapManager 地图管理器
type MapManager struct {
    mu            sync.RWMutex
    maps          map[MapID]*GameMap
    mapsBySession map[string]MapID        // sessionID -> 当前地图ID
    loader        *MapLoader
    fvttParser    *FVTTParser
    gridSystem    *GridSystem
}

// NewMapManager 创建地图管理器
func NewMapManager(dataPath string) (*MapManager, error) {
    loader := NewMapLoader(dataPath)
    fvttParser := NewFVTTParser()
    gridSystem := NewGridSystem()

    return &MapManager{
        maps:          make(map[MapID]*GameMap),
        mapsBySession: make(map[string]MapID),
        loader:        loader,
        fvttParser:    fvttParser,
        gridSystem:    gridSystem,
    }, nil
}

// LoadMap 加载地图
func (m *MapManager) LoadMap(ctx context.Context, mapID MapID) (*GameMap, error) {
    m.mu.RLock()
    if gameMap, exists := m.maps[mapID]; exists {
        m.mu.RUnlock()
        return gameMap, nil
    }
    m.mu.RUnlock()

    // 从文件加载
    data, err := m.loader.Load(mapID)
    if err != nil {
        return nil, fmt.Errorf("load map data: %w", err)
    }

    // 解析地图
    gameMap, err := m.fvttParser.Parse(data)
    if err != nil {
        return nil, fmt.Errorf("parse map: %w", err)
    }

    // 初始化网格
    gameMap.Grid = m.gridSystem.CreateGrid(gameMap.Width, gameMap.Height, gameMap.GridType)

    m.mu.Lock()
    m.maps[mapID] = gameMap
    m.mu.Unlock()

    return gameMap, nil
}

// GetMap 获取地图
func (m *MapManager) GetMap(mapID MapID) (*GameMap, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()

    gameMap, exists := m.maps[mapID]
    if !exists {
        return nil, ErrMapNotFound
    }
    return gameMap, nil
}

// SetSessionMap 设置会话当前地图
func (m *MapManager) SetSessionMap(sessionID string, mapID MapID) error {
    m.mu.Lock()
    defer m.mu.Unlock()

    if _, exists := m.maps[mapID]; !exists {
        return ErrMapNotFound
    }

    m.mapsBySession[sessionID] = mapID
    return nil
}

// GetSessionMap 获取会话当前地图
func (m *MapManager) GetSessionMap(sessionID string) (*GameMap, error) {
    m.mu.RLock()
    mapID, exists := m.mapsBySession[sessionID]
    m.mu.RUnlock()

    if !exists {
        return nil, ErrNoActiveMap
    }

    return m.GetMap(mapID)
}

// UnloadMap 卸载地图
func (m *MapManager) UnloadMap(mapID MapID) {
    m.mu.Lock()
    defer m.mu.Unlock()

    delete(m.maps, mapID)

    // 清理会话引用
    for sessionID, mid := range m.mapsBySession {
        if mid == mapID {
            delete(m.mapsBySession, sessionID)
        }
    }
}

// ListMaps 获取地图列表
func (m *MapManager) ListMaps() []*MapSummary {
    m.mu.RLock()
    defer m.mu.RUnlock()

    summaries := make([]*MapSummary, 0, len(m.maps))
    for _, gameMap := range m.maps {
        summaries = append(summaries, &MapSummary{
            ID:          gameMap.ID,
            Name:        gameMap.Name,
            Description: gameMap.Description,
            Width:       gameMap.Width,
            Height:      gameMap.Height,
            GridType:    gameMap.GridType,
        })
    }
    return summaries
}
```

### 2.2 PositionManager 组件

```go
// internal/server/map/position.go

package map

import (
    "context"
    "sync"
)

// PositionManager 位置管理器
type PositionManager struct {
    mu                sync.RWMutex
    positions         map[string]Position           // entityID -> position
    entityMaps        map[string]MapID              // entityID -> mapID
    mapMgr            *MapManager
    collisionDetector *CollisionDetector
    pathfinder        *Pathfinder
}

// NewPositionManager 创建位置管理器
func NewPositionManager(mapMgr *MapManager) *PositionManager {
    collisionDetector := NewCollisionDetector(mapMgr)
    pathfinder := NewPathfinder(collisionDetector)

    return &PositionManager{
        positions:         make(map[string]Position),
        entityMaps:        make(map[string]MapID),
        mapMgr:            mapMgr,
        collisionDetector: collisionDetector,
        pathfinder:        pathfinder,
    }
}

// SetPosition 设置实体位置
func (pm *PositionManager) SetPosition(ctx context.Context, entityID string, mapID MapID, pos Position) error {
    gameMap, err := pm.mapMgr.GetMap(mapID)
    if err != nil {
        return err
    }

    // 验证位置有效
    if !pm.collisionDetector.IsInBounds(gameMap, pos) {
        return ErrPositionOutOfBounds
    }

    pm.mu.Lock()
    defer pm.mu.Unlock()

    pm.positions[entityID] = pos
    pm.entityMaps[entityID] = mapID
    return nil
}

// GetPosition 获取实体位置
func (pm *PositionManager) GetPosition(entityID string) (Position, MapID, error) {
    pm.mu.RLock()
    defer pm.mu.RUnlock()

    pos, exists := pm.positions[entityID]
    if !exists {
        return Position{}, "", ErrEntityNotFound
    }

    mapID := pm.entityMaps[entityID]
    return pos, mapID, nil
}

// MoveEntity 移动实体
func (pm *PositionManager) MoveEntity(ctx context.Context, req *MoveEntityRequest) (*MoveEntityResult, error) {
    gameMap, err := pm.mapMgr.GetMap(req.MapID)
    if err != nil {
        return nil, err
    }

    currentPos, _, err := pm.GetPosition(req.EntityID)
    if err != nil {
        return nil, err
    }

    // 计算路径
    path, err := pm.pathfinder.FindPath(gameMap, currentPos, req.TargetPos)
    if err != nil {
        return nil, err
    }

    // 计算移动成本
    cost := pm.pathfinder.CalculateMovementCost(gameMap, path)
    if req.MaxDistance > 0 && cost > req.MaxDistance {
        return nil, ErrMoveDistanceExceeded
    }

    // 执行移动
    if err := pm.SetPosition(ctx, req.EntityID, req.MapID, req.TargetPos); err != nil {
        return nil, err
    }

    return &MoveEntityResult{
        Path:         path,
        MovementCost: cost,
        NewPosition:  req.TargetPos,
    }, nil
}

// GetEntitiesInRange 获取范围内的实体
func (pm *PositionManager) GetEntitiesInRange(ctx context.Context, mapID MapID, origin Position, rangeFeet int) ([]string, error) {
    gameMap, err := pm.mapMgr.GetMap(mapID)
    if err != nil {
        return nil, err
    }

    pm.mu.RLock()
    defer pm.mu.RUnlock()

    var entities []string
    rangeCells := rangeFeet / 5 // 转换为格子

    for entityID, pos := range pm.positions {
        if pm.entityMaps[entityID] != mapID {
            continue
        }

        distance := origin.DistanceTo(pos)
        if distance <= rangeCells {
            entities = append(entities, entityID)
        }
    }

    return entities, nil
}

// RemoveEntity 移除实体
func (pm *PositionManager) RemoveEntity(entityID string) {
    pm.mu.Lock()
    defer pm.mu.Unlock()

    delete(pm.positions, entityID)
    delete(pm.entityMaps, entityID)
}

// MoveEntityRequest 移动请求
type MoveEntityRequest struct {
    EntityID   string
    MapID      MapID
    TargetPos  Position
    MaxDistance int // 0 = 无限制
}

// MoveEntityResult 移动结果
type MoveEntityResult struct {
    Path         []Position
    MovementCost int
    NewPosition  Position
}
```

### 2.3 CollisionDetector 组件

```go
// internal/server/map/collision.go

package map

// CollisionDetector 碰撞检测器
type CollisionDetector struct {
    mapMgr *MapManager
}

// NewCollisionDetector 创建碰撞检测器
func NewCollisionDetector(mapMgr *MapManager) *CollisionDetector {
    return &CollisionDetector{mapMgr: mapMgr}
}

// IsInBounds 检查位置是否在地图边界内
func (cd *CollisionDetector) IsInBounds(gameMap *GameMap, pos Position) bool {
    return pos.X >= 0 && pos.X < gameMap.Width &&
           pos.Y >= 0 && pos.Y < gameMap.Height
}

// IsWalkable 检查位置是否可行走
func (cd *CollisionDetector) IsWalkable(gameMap *GameMap, pos Position) bool {
    // 检查边界
    if !cd.IsInBounds(gameMap, pos) {
        return false
    }

    // 检查地砖
    if pos.X < len(gameMap.Tiles) && pos.Y < len(gameMap.Tiles[pos.X]) {
        tile := gameMap.Tiles[pos.X][pos.Y]
        if !tile.Walkable {
            return false
        }
    }

    // 检查是否有墙壁穿过此格子
    for _, wall := range gameMap.Walls {
        if cd.wallIntersectsCell(wall, pos) {
            // 检查是否是门且已打开
            if wall.Door != nil && wall.Door.State == DoorStateOpen {
                continue
            }
            return false
        }
    }

    return true
}

// HasCollision 检查两点间是否有障碍物
func (cd *CollisionDetector) HasCollision(gameMap *GameMap, from, to Position) bool {
    // 获取路径上的所有格子
    line := cd.getLine(from, to)

    for _, pos := range line {
        if !cd.IsWalkable(gameMap, pos) {
            return true
        }
    }

    return false
}

// IsBlockedByWall 检查是否被墙壁阻挡
func (cd *CollisionDetector) IsBlockedByWall(gameMap *GameMap, from, to Position) bool {
    for _, wall := range gameMap.Walls {
        if cd.lineIntersectsWall(from, to, wall) {
            if wall.Door != nil && wall.Door.State == DoorStateOpen {
                continue
            }
            return true
        }
    }
    return false
}

// GetBlockingWall 获取阻挡的墙壁
func (cd *CollisionDetector) GetBlockingWall(gameMap *GameMap, from, to Position) *Wall {
    for _, wall := range gameMap.Walls {
        if cd.lineIntersectsWall(from, to, wall) {
            if wall.Door != nil && wall.Door.State == DoorStateOpen {
                continue
            }
            return &wall
        }
    }
    return nil
}

// getLine 使用 Bresenham 算法获取两点间的直线格子
func (cd *CollisionDetector) getLine(from, to Position) []Position {
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

// wallIntersectsCell 检查墙壁是否与格子相交
func (cd *CollisionDetector) wallIntersectsCell(wall Wall, pos Position) bool {
    // 简化：检查墙壁端点是否在格子内
    return cd.pointInCell(wall.Start, pos) || cd.pointInCell(wall.End, pos)
}

// pointInCell 检查点是否在格子内
func (cd *CollisionDetector) pointInCell(point Position, cell Position) bool {
    return point.X == cell.X && point.Y == cell.Y
}

// lineIntersectsWall 检查线段是否与墙壁相交
func (cd *CollisionDetector) lineIntersectsWall(from, to Position, wall Wall) bool {
    // 使用线段相交检测
    return ccw(from, wall.Start, wall.End) != ccw(to, wall.Start, wall.End) &&
           ccw(from, to, wall.Start) != ccw(from, to, wall.End)
}

func ccw(a, b, c Position) bool {
    return (c.Y-a.Y)*(b.X-a.X) > (b.Y-a.Y)*(c.X-a.X)
}
```

### 2.4 LineOfSightCalculator 组件

```go
// internal/server/map/line_of_sight.go

package map

// LineOfSightCalculator 视线计算器
type LineOfSightCalculator struct {
    collisionDetector *CollisionDetector
}

// NewLineOfSightCalculator 创建视线计算器
func NewLineOfSightCalculator(collisionDetector *CollisionDetector) *LineOfSightCalculator {
    return &LineOfSightCalculator{
        collisionDetector: collisionDetector,
    }
}

// HasLineOfSight 检查两点间是否有视线
func (los *LineOfSightCalculator) HasLineOfSight(gameMap *GameMap, from, to Position) bool {
    // 获取视线上的格子
    line := los.collisionDetector.getLine(from, to)

    // 检查是否有墙壁阻挡
    for i := 0; i < len(line)-1; i++ {
        pos := line[i]

        // 检查格子内的墙壁
        for _, wall := range gameMap.Walls {
            if los.collisionDetector.wallIntersectsCell(wall, pos) {
                // 检查是否是可穿透的（窗户、打开的门）
                if wall.Type == WallTypeWindow {
                    continue
                }
                if wall.Door != nil && wall.Door.State == DoorStateOpen {
                    continue
                }
                return false
            }
        }
    }

    return true
}

// GetVisiblePositions 获取可见范围内的所有位置
func (los *LineOfSightCalculator) GetVisiblePositions(gameMap *GameMap, origin Position, rangeFeet int) []Position {
    var visible []Position
    rangeCells := rangeFeet / 5

    // 遍历范围内的所有格子
    for dx := -rangeCells; dx <= rangeCells; dx++ {
        for dy := -rangeCells; dy <= rangeCells; dy++ {
            pos := Position{X: origin.X + dx, Y: origin.Y + dy}

            if !los.collisionDetector.IsInBounds(gameMap, pos) {
                continue
            }

            // 检查距离
            if origin.DistanceTo(pos) > rangeCells {
                continue
            }

            // 检查视线
            if los.HasLineOfSight(gameMap, origin, pos) {
                visible = append(visible, pos)
            }
        }
    }

    return visible
}

// GetCoverLevel 获取掩护等级
func (los *LineOfSightCalculator) GetCoverLevel(gameMap *GameMap, from, to Position) CoverLevel {
    // 检查到目标的四个角
    corners := []Position{
        {X: to.X, Y: to.Y},       // 中心
        {X: to.X + 1, Y: to.Y},   // 右
        {X: to.X - 1, Y: to.Y},   // 左
        {X: to.X, Y: to.Y + 1},   // 下
        {X: to.X, Y: to.Y - 1},   // 上
    }

    blocked := 0
    total := len(corners)

    for _, corner := range corners {
        if !los.HasLineOfSight(gameMap, from, corner) {
            blocked++
        }
    }

    ratio := float64(blocked) / float64(total)

    switch {
    case ratio == 0:
        return CoverNone
    case ratio < 0.5:
        return CoverHalf
    case ratio < 1.0:
        return CoverThreeQuarters
    default:
        return CoverFull
    }
}

// CoverLevel 掩护等级
type CoverLevel int

const (
    CoverNone          CoverLevel = iota
    CoverHalf          // +2 AC
    CoverThreeQuarters // +5 AC
    CoverFull          // 不能被选中
)
```

### 2.5 Pathfinder 组件

```go
// internal/server/map/pathfinding.go

package map

import (
    "container/heap"
    "math"
)

// Pathfinder 寻路器
type Pathfinder struct {
    collisionDetector *CollisionDetector
}

// NewPathfinder 创建寻路器
func NewPathfinder(collisionDetector *CollisionDetector) *Pathfinder {
    return &Pathfinder{
        collisionDetector: collisionDetector,
    }
}

// FindPath 使用 A* 算法寻找路径
func (p *Pathfinder) FindPath(gameMap *GameMap, start, end Position) ([]Position, error) {
    // 检查起点终点是否可行走
    if !p.collisionDetector.IsWalkable(gameMap, start) {
        return nil, ErrStartNotWalkable
    }
    if !p.collisionDetector.IsWalkable(gameMap, end) {
        return nil, ErrEndNotWalkable
    }

    // A* 算法
    openSet := &priorityQueue{}
    heap.Init(openSet)

    startNode := &pathNode{
        position: start,
        g:        0,
        h:        p.heuristic(start, end),
        f:        0,
    }
    startNode.f = startNode.g + startNode.h
    heap.Push(openSet, startNode)

    cameFrom := make(map[Position]Position)
    gScore := make(map[Position]int)
    gScore[start] = 0

    for openSet.Len() > 0 {
        current := heap.Pop(openSet).(*pathNode)

        if current.position == end {
            return p.reconstructPath(cameFrom, current.position), nil
        }

        for _, neighbor := range p.getNeighbors(gameMap, current.position) {
            tentativeG := gScore[current.position] + 1

            if existingG, exists := gScore[neighbor]; !exists || tentativeG < existingG {
                cameFrom[neighbor] = current.position
                gScore[neighbor] = tentativeG
                f := tentativeG + p.heuristic(neighbor, end)

                // 更新或添加节点
                heap.Push(openSet, &pathNode{
                    position: neighbor,
                    g:        tentativeG,
                    h:        p.heuristic(neighbor, end),
                    f:        f,
                })
            }
        }
    }

    return nil, ErrPathNotFound
}

// CalculateMovementCost 计算移动成本
func (p *Pathfinder) CalculateMovementCost(gameMap *GameMap, path []Position) int {
    if len(path) == 0 {
        return 0
    }

    cost := 0
    for i := 0; i < len(path)-1; i++ {
        // 检查是否是困难地形
        if p.isDifficultTerrain(gameMap, path[i+1]) {
            cost += 2 // 困难地形双倍消耗
        } else {
            cost += 1
        }

        // 对角线移动额外消耗
        if path[i].X != path[i+1].X && path[i].Y != path[i+1].Y {
            cost += 1
        }
    }

    return cost
}

// GetMovablePositions 获取可移动范围内的位置
func (p *Pathfinder) GetMovablePositions(gameMap *GameMap, start Position, maxDistance int) []Position {
    var positions []Position
    visited := make(map[Position]bool)

    queue := []struct {
        pos  Position
        dist int
    }{{start, 0}}

    for len(queue) > 0 {
        current := queue[0]
        queue = queue[1:]

        if visited[current.pos] {
            continue
        }
        visited[current.pos] = true

        if current.dist > 0 {
            positions = append(positions, current.pos)
        }

        if current.dist >= maxDistance {
            continue
        }

        for _, neighbor := range p.getNeighbors(gameMap, current.pos) {
            if !visited[neighbor] {
                cost := 1
                if p.isDifficultTerrain(gameMap, neighbor) {
                    cost = 2
                }
                queue = append(queue, struct {
                    pos  Position
                    dist int
                }{neighbor, current.dist + cost})
            }
        }
    }

    return positions
}

// heuristic 曼哈顿距离启发式
func (p *Pathfinder) heuristic(a, b Position) int {
    return abs(a.X-b.X) + abs(a.Y-b.Y)
}

// getNeighbors 获取相邻格子
func (p *Pathfinder) getNeighbors(gameMap *GameMap, pos Position) []Position {
    neighbors := []Position{
        {X: pos.X + 1, Y: pos.Y},
        {X: pos.X - 1, Y: pos.Y},
        {X: pos.X, Y: pos.Y + 1},
        {X: pos.X, Y: pos.Y - 1},
        // 对角线
        {X: pos.X + 1, Y: pos.Y + 1},
        {X: pos.X + 1, Y: pos.Y - 1},
        {X: pos.X - 1, Y: pos.Y + 1},
        {X: pos.X - 1, Y: pos.Y - 1},
    }

    var valid []Position
    for _, n := range neighbors {
        if p.collisionDetector.IsWalkable(gameMap, n) {
            valid = append(valid, n)
        }
    }

    return valid
}

// reconstructPath 重建路径
func (p *Pathfinder) reconstructPath(cameFrom map[Position]Position, current Position) []Position {
    path := []Position{current}
    for {
        prev, exists := cameFrom[current]
        if !exists {
            break
        }
        path = append([]Position{prev}, path...)
        current = prev
    }
    return path
}

// isDifficultTerrain 检查是否是困难地形
func (p *Pathfinder) isDifficultTerrain(gameMap *GameMap, pos Position) bool {
    if pos.X < len(gameMap.Tiles) && pos.Y < len(gameMap.Tiles[pos.X]) {
        return gameMap.Tiles[pos.X][pos.Y].Difficult
    }
    return false
}

// pathNode A* 算法节点
type pathNode struct {
    position Position
    g        int
    h        int
    f        int
}

// priorityQueue 优先队列
type priorityQueue []*pathNode

func (pq priorityQueue) Len() int           { return len(pq) }
func (pq priorityQueue) Less(i, j int) bool { return pq[i].f < pq[j].f }
func (pq priorityQueue) Swap(i, j int)      { pq[i], pq[j] = pq[j], pq[i] }

func (pq *priorityQueue) Push(x interface{}) {
    *pq = append(*pq, x.(*pathNode))
}

func (pq *priorityQueue) Pop() interface{} {
    old := *pq
    n := len(old)
    item := old[n-1]
    *pq = old[0 : n-1]
    return item
}
```

### 2.6 FVTTParser 组件

```go
// internal/server/map/fvtt/parser.go

package fvtt

import (
    "encoding/json"
    "fmt"
)

// FVTTParser FVTT 格式解析器
type FVTTParser struct {
    gridSize int
}

// NewFVTTParser 创建 FVTT 解析器
func NewFVTTParser() *FVTTParser {
    return &FVTTParser{
        gridSize: 70, // 默认网格大小
    }
}

// Parse 解析 FVTT 格式地图数据
func (p *FVTTParser) Parse(data []byte) (*map.GameMap, error) {
    var fvttData FVTTMapData
    if err := json.Unmarshal(data, &fvttData); err != nil {
        return nil, fmt.Errorf("unmarshal FVTT data: %w", err)
    }

    gameMap := &map.GameMap{
        ID:          MapID(fvttData.ID),
        Name:        fvttData.Name,
        Description: fvttData.Description,
        Width:       int(fvttData.Width / float64(p.gridSize)),
        Height:      int(fvttData.Height / float64(p.gridSize)),
        GridSize:    p.gridSize,
        GridType:    p.convertGridType(fvttData.GridType),
    }

    // 解析墙壁
    gameMap.Walls = p.parseWalls(fvttData.Walls)

    // 解析地砖
    gameMap.Tiles = p.parseTiles(fvttData.Tiles)

    // 解析光照
    gameMap.Lights = p.parseLights(fvttData.Lights)

    // 解析背景
    gameMap.Background = p.parseBackground(fvttData.Background)

    return gameMap, nil
}

// FVTTMapData FVTT 地图数据结构
type FVTTMapData struct {
    ID          string                `json:"_id"`
    Name        string                `json:"name"`
    Description string                `json:"description"`
    Width       float64               `json:"width"`
    Height      float64               `json:"height"`
    GridType    uint                  `json:"gridType"` // 0=方格, 1=六角格
    Grid        float64               `json:"grid"`
    Walls       []FVTTWall            `json:"walls"`
    Tiles       []FVTTTile            `json:"tiles"`
    Lights      []FVTTLight           `json:"lights"`
    Background  []FVTTBackgroundEntry `json:"background"`
}

// FVTTWall FVTT 墙壁
type FVTTWall struct {
    ID    string    `json:"_id"`
    C     [4]float64 `json:"c"` // [x1, y1, x2, y2]
    Type  string    `json:"type"`
    Move  int       `json:"move"` // 移动限制
    Sense int       `json:"sense"` // 感知限制
    Door  *FVTTDoor `json:"door"`
}

// FVTTDoor FVTT 门
type FVTTDoor struct {
    Type     string `json:"type"` // "door", "secret"
    Lock     string `json:"lock"`
    Closed   bool   `json:"closed"`
    Locked   bool   `json:"locked"`
}

// FVTTTile FVTT 地砖
type FVTTTile struct {
    ID    string  `json:"_id"`
    X     float64 `json:"x"`
    Y     float64 `json:"y"`
    Width float64 `json:"width"`
    Height float64 `json:"height"`
    Img   string  `json:"img"`
    Type  string  `json:"type"`
}

// FVTTLight FVTT 光照
type FVTTLight struct {
    ID       string  `json:"_id"`
    X        float64 `json:"x"`
    Y        float64 `json:"y"`
    Angle    float64 `json:"angle"`
    Rotation float64 `json:"rotation"`
    Dim      float64 `json:"dim"`
    Bright   float64 `json:"bright"`
}

// FVTTBackgroundEntry FVTT 背景条目
type FVTTBackgroundEntry struct {
    ID    string  `json:"_id"`
    Img   string  `json:"img"`
    X     float64 `json:"x"`
    Y     float64 `json:"y"`
    Width float64 `json:"width"`
    Height float64 `json:"height"`
}

// parseWalls 解析墙壁
func (p *FVTTParser) parseWalls(walls []FVTTWall) []map.Wall {
    result := make([]map.Wall, 0, len(walls))

    for _, wall := range walls {
        start := Position{
            X: int(wall.C[0] / float64(p.gridSize)),
            Y: int(wall.C[1] / float64(p.gridSize)),
        }
        end := Position{
            X: int(wall.C[2] / float64(p.gridSize)),
            Y: int(wall.C[3] / float64(p.gridSize)),
        }

        parsedWall := map.Wall{
            ID:    wall.ID,
            Start: start,
            End:   end,
            Type:  p.convertWallType(wall.Move),
        }

        // 解析门
        if wall.Door != nil {
            state := map.DoorStateClosed
            if !wall.Door.Closed {
                state = map.DoorStateOpen
            }
            if wall.Door.Locked {
                state = map.DoorStateLocked
            }

            parsedWall.Door = &map.Door{
                ID:     wall.ID + "_door",
                State:  state,
                Locked: wall.Door.Locked,
            }
        }

        result = append(result, parsedWall)
    }

    return result
}

// parseTiles 解析地砖
func (p *FVTTParser) parseTiles(tiles []FVTTTile) [][]map.Tile {
    // 简化实现：创建默认网格
    // 实际实现需要根据 tile 数据填充网格
    return [][]map.Tile{}
}

// parseLights 解析光照
func (p *FVTTParser) parseLights(lights []FVTTLight) []map.Light {
    result := make([]map.Light, 0, len(lights))

    for _, light := range lights {
        result = append(result, map.Light{
            ID:     light.ID,
            X:      int(light.X),
            Y:      int(light.Y),
            Bright: int(light.Bright),
            Dim:    int(light.Dim),
        })
    }

    return result
}

// parseBackground 解析背景
func (p *FVTTParser) parseBackground(background []FVTTBackgroundEntry) *map.MapLayer {
    if len(background) == 0 {
        return nil
    }

    return &map.MapLayer{
        Name:    "background",
        Visible: true,
        Opacity: 1.0,
        Image:   background[0].Img,
    }
}

// convertGridType 转换网格类型
func (p *FVTTParser) convertGridType(gt uint) map.GridType {
    if gt == 1 {
        return map.GridTypeHex
    }
    return map.GridTypeSquare
}

// convertWallType 转换墙壁类型
func (p *FVTTParser) convertWallType(move int) map.WallType {
    if move == 0 {
        return map.WallTypeSolid
    }
    return map.WallTypeEthereal
}
```

---

## 3. 组件间通信方式

### 3.1 同步调用

组件间主要通过方法调用进行同步通信：

```go
// PositionManager 依赖 CollisionDetector
func (pm *PositionManager) MoveEntity(...) {
    // 同步调用
    if !pm.collisionDetector.IsWalkable(gameMap, pos) {
        return error
    }
}

// LineOfSightCalculator 依赖 CollisionDetector
func (los *LineOfSightCalculator) HasLineOfSight(...) {
    // 同步调用
    line := los.collisionDetector.getLine(from, to)
}
```

### 3.2 事件通知

使用观察者模式处理状态变化：

```go
// 位置变更事件
type PositionChangeEvent struct {
    EntityID   string
    OldPos     Position
    NewPos     Position
    MapID      MapID
    Timestamp  time.Time
}

// 事件监听器接口
type PositionChangeListener interface {
    OnPositionChange(event PositionChangeEvent)
}

// MapManager 实现监听器
func (m *MapManager) OnPositionChange(event PositionChangeEvent) {
    // 触发地图出口检查
    exit, hasExit := m.CheckExit(event.MapID, event.NewPos)
    if hasExit {
        m.NotifyExitTriggered(event.EntityID, exit)
    }
}
```

### 3.3 错误传播

使用 Go 标准错误处理：

```go
var (
    ErrMapNotFound         = errors.New("map not found")
    ErrPositionOutOfBounds = errors.New("position out of bounds")
    ErrEntityNotFound      = errors.New("entity not found")
    ErrMoveDistanceExceeded = errors.New("move distance exceeded")
    ErrPathNotFound        = errors.New("path not found")
    ErrStartNotWalkable    = errors.New("start position not walkable")
    ErrEndNotWalkable      = errors.New("end position not walkable")
)
```

---

## 4. 状态管理设计

### 4.1 状态数据结构

```go
// MapState 地图状态
type MapState struct {
    MapID          MapID
    LoadedAt       time.Time
    LastAccess     time.Time
    EntityCount    int
    Modified       bool
}

// EntityPosition 实体位置状态
type EntityPosition struct {
    EntityID    string
    MapID       MapID
    Position    Position
    UpdatedAt   time.Time
}

// DoorState 门状态
type DoorState struct {
    DoorID      string
    State       DoorState
    Locked      bool
    HP          int // 破坏所需的 HP
}
```

### 4.2 并发控制

```go
// MapManager 使用读写锁
type MapManager struct {
    mu sync.RWMutex
    // ...
}

// 读操作使用读锁
func (m *MapManager) GetMap(mapID MapID) (*GameMap, error) {
    m.mu.RLock()
    defer m.mu.RUnlock()
    // ...
}

// 写操作使用写锁
func (m *MapManager) SetSessionMap(sessionID string, mapID MapID) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    // ...
}
```

---

## 5. 错误处理设计

### 5.1 错误分类

```go
// MapError 地图错误
type MapError struct {
    Code    string
    Message string
    Cause   error
}

func (e *MapError) Error() string {
    if e.Cause != nil {
        return fmt.Sprintf("[%s] %s: %v", e.Code, e.Message, e.Cause)
    }
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *MapError) Unwrap() error {
    return e.Cause
}

// 错误代码
const (
    ErrCodeLoadFailed    = "MAP_LOAD_FAILED"
    ErrCodeNotFound      = "MAP_NOT_FOUND"
    ErrCodeInvalidPos    = "MAP_INVALID_POSITION"
    ErrCodePathNotFound  = "MAP_PATH_NOT_FOUND"
    ErrCodeCollision     = "MAP_COLLISION"
)
```

### 5.2 错误恢复

```go
// SafeMove 安全移动（带回滚）
func (pm *PositionManager) SafeMove(ctx context.Context, req *MoveEntityRequest) error {
    // 保存当前位置
    oldPos, oldMapID, err := pm.GetPosition(req.EntityID)
    if err != nil {
        return err
    }

    // 尝试移动
    err = pm.MoveEntity(ctx, req)
    if err != nil {
        // 回滚到原位置
        _ = pm.SetPosition(ctx, req.EntityID, oldMapID, oldPos)
        return err
    }

    return nil
}
```

---

## 6. 性能优化

### 6.1 缓存策略

```go
// PathCache 路径缓存
type PathCache struct {
    cache map[string][]Position
    ttl   time.Duration
    mu    sync.RWMutex
}

func (pc *PathCache) Get(from, to Position) ([]Position, bool) {
    key := fmt.Sprintf("%d,%d-%d,%d", from.X, from.Y, to.X, to.Y)

    pc.mu.RLock()
    defer pc.mu.RUnlock()

    path, exists := pc.cache[key]
    return path, exists
}
```

### 6.2 批量操作

```go
// BatchMovePositions 批量移动位置
func (pm *PositionManager) BatchMovePositions(ctx context.Context, moves []MoveEntityRequest) error {
    pm.mu.Lock()
    defer pm.mu.Unlock()

    // 预检查所有位置
    for _, move := range moves {
        gameMap, err := pm.mapMgr.GetMap(move.MapID)
        if err != nil {
            return err
        }
        if !pm.collisionDetector.IsWalkable(gameMap, move.TargetPos) {
            return fmt.Errorf("invalid position: %v", move.TargetPos)
        }
    }

    // 批量执行
    for _, move := range moves {
        pm.positions[move.EntityID] = move.TargetPos
        pm.entityMaps[move.EntityID] = move.MapID
    }

    return nil
}
```

---

## 7. 测试接口

```go
// MapTester 测试接口
type MapTester interface {
    // 测试辅助方法
    SetTestMap(mapID MapID, gameMap *GameMap)
    ClearPositions()
    GetInternalState() map[string]interface{}
}

// 实现
func (m *MapManager) SetTestMap(mapID MapID, gameMap *GameMap) {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.maps[mapID] = gameMap
}
```

---

**文档版本**: v1.0
**创建日期**: 2026-03-16
**组件设计师**: component-designer
