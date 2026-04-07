import { describe, it, expect } from 'vitest'
import { findPath, getMoveRange } from './PathFinding'
import { GRID_WIDTH, GRID_HEIGHT } from '../constants'

function createEmptyObstacles(): boolean[][] {
  const grid: boolean[][] = []
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = new Array(GRID_WIDTH).fill(false)
  }
  return grid
}

describe('PathFinding', () => {
  describe('findPath', () => {
    it('should find a direct path on empty grid', () => {
      const obstacles = createEmptyObstacles()
      const path = findPath({ x: 0, y: 0 }, { x: 3, y: 0 }, obstacles)

      expect(path.length).toBeGreaterThan(0)
      expect(path[0]).toEqual({ x: 0, y: 0 })
      expect(path[path.length - 1]).toEqual({ x: 3, y: 0 })
    })

    it('should find a path that goes around obstacles', () => {
      const obstacles = createEmptyObstacles()
      // Create a vertical wall blocking direct path
      obstacles[0][2] = true
      obstacles[1][2] = true
      obstacles[2][2] = true

      const path = findPath({ x: 0, y: 1 }, { x: 4, y: 1 }, obstacles)

      expect(path.length).toBeGreaterThan(0)
      expect(path[0]).toEqual({ x: 0, y: 1 })
      expect(path[path.length - 1]).toEqual({ x: 4, y: 1 })
      // Path should not pass through the wall
      for (const step of path) {
        expect(obstacles[step.y]?.[step.x]).toBeFalsy()
      }
    })

    it('should return empty path if start is out of bounds', () => {
      const obstacles = createEmptyObstacles()
      expect(findPath({ x: -1, y: 0 }, { x: 3, y: 0 }, obstacles)).toEqual([])
    })

    it('should return empty path if end is out of bounds', () => {
      const obstacles = createEmptyObstacles()
      expect(findPath({ x: 0, y: 0 }, { x: 100, y: 100 }, obstacles)).toEqual([])
    })

    it('should return empty path if end is an obstacle', () => {
      const obstacles = createEmptyObstacles()
      obstacles[3][3] = true

      expect(findPath({ x: 0, y: 0 }, { x: 3, y: 3 }, obstacles)).toEqual([])
    })

    it('should return start-only path for same start and end', () => {
      const obstacles = createEmptyObstacles()
      const path = findPath({ x: 2, y: 2 }, { x: 2, y: 2 }, obstacles)

      expect(path).toEqual([{ x: 2, y: 2 }])
    })

    it('should return empty path when completely blocked', () => {
      const obstacles = createEmptyObstacles()
      // Surround start with walls
      obstacles[0][1] = true
      obstacles[1][0] = true
      obstacles[1][1] = true
      // note: (0,0) is start, surrounded at (1,0), (0,1), (1,1)

      const path = findPath({ x: 0, y: 0 }, { x: 5, y: 5 }, obstacles)
      // Actually (0,0) can't move anywhere
      expect(path).toEqual([])
    })

    it('should find diagonal-like path with Manhattan moves', () => {
      const obstacles = createEmptyObstacles()
      const path = findPath({ x: 0, y: 0 }, { x: 3, y: 3 }, obstacles)

      expect(path.length).toBe(7) // optimal Manhattan path length
      expect(path[0]).toEqual({ x: 0, y: 0 })
      expect(path[path.length - 1]).toEqual({ x: 3, y: 3 })
    })

    it('should find path that allows end cell even if it is an obstacle', () => {
      const obstacles = createEmptyObstacles()
      // End cell is obstacle (but should be allowed for targeting)
      obstacles[3][0] = true

      const path = findPath({ x: 0, y: 0 }, { x: 3, y: 0 }, obstacles)
      expect(path.length).toBeGreaterThan(0)
      expect(path[path.length - 1]).toEqual({ x: 3, y: 0 })
    })
  })

  describe('getMoveRange', () => {
    it('should return cells within range on empty grid', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 5, y: 4 }, 2, obstacles)

      // Range 2 means up to 2 steps away (Manhattan distance)
      expect(range.length).toBeGreaterThan(0)
      // All cells should be within Manhattan distance 2
      for (const cell of range) {
        const dist = Math.abs(cell.x - 5) + Math.abs(cell.y - 4)
        expect(dist).toBeLessThanOrEqual(2)
      }
    })

    it('should not include the start cell in range', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 5, y: 4 }, 3, obstacles)

      expect(range.find((c) => c.x === 5 && c.y === 4)).toBeUndefined()
    })

    it('should respect obstacles', () => {
      const obstacles = createEmptyObstacles()
      // Block all 4 cardinal neighbors of start (5,4)
      obstacles[3][5] = true // above: (x=5, y=3)
      obstacles[5][5] = true // below: (x=5, y=5)
      obstacles[4][4] = true // left:  (x=4, y=4)
      obstacles[4][6] = true // right: (x=6, y=4)

      const range = getMoveRange({ x: 5, y: 4 }, 3, obstacles)
      expect(range).toEqual([])
    })

    it('should respect occupied cells from occupancy set', () => {
      const obstacles = createEmptyObstacles()
      const occupiedKeys = new Set(['6,4', '4,4']) // right and left cells occupied

      const range = getMoveRange({ x: 5, y: 4 }, 1, obstacles, undefined, occupiedKeys)

      // Only up and down should be reachable
      expect(range).toContainEqual({ x: 5, y: 3 })
      expect(range).toContainEqual({ x: 5, y: 5 })
      expect(range).not.toContainEqual({ x: 6, y: 4 })
      expect(range).not.toContainEqual({ x: 4, y: 4 })
    })

    it('should ignore the specified unit cell', () => {
      const obstacles = createEmptyObstacles()
      const occupiedKeys = new Set(['6,4']) // right cell occupied by another unit

      const range = getMoveRange({ x: 5, y: 4 }, 1, obstacles, '5,4', occupiedKeys)

      // 5,4 is the start cell key; it should be ignored as occupied
      expect(range).toContainEqual({ x: 5, y: 3 })
      expect(range).toContainEqual({ x: 5, y: 5 })
      expect(range).toContainEqual({ x: 4, y: 4 })
    })

    it('should return empty range for range 0', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 5, y: 4 }, 0, obstacles)
      expect(range).toEqual([])
    })

    it('should compute correct count for range 1 on empty grid', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 5, y: 4 }, 1, obstacles)
      // 4 cardinal neighbors
      expect(range).toHaveLength(4)
    })

    it('should compute correct count for range 2 on empty grid', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 5, y: 4 }, 2, obstacles)
      // Range 2 on 4-dir: 4 + 4 + 4 = 12 cells (diamond shape minus center)
      // Actually: dist=1: 4 cells, dist=2: 4 cells = 8 total
      // Wait, let me recalculate. From (5,4), Manhattan distance <= 2:
      // dist=1: (4,4), (6,4), (5,3), (5,5) = 4 cells
      // dist=2: (3,4), (7,4), (5,2), (5,6), (4,3), (6,3), (4,5), (6,5) = 8 cells
      // total = 12
      expect(range).toHaveLength(12)
    })

    it('should handle start at grid edge', () => {
      const obstacles = createEmptyObstacles()
      const range = getMoveRange({ x: 0, y: 0 }, 1, obstacles)
      // Only right and down
      expect(range).toHaveLength(2)
      expect(range).toContainEqual({ x: 1, y: 0 })
      expect(range).toContainEqual({ x: 0, y: 1 })
    })
  })
})
