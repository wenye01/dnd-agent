import { describe, it, expect } from 'vitest'
import {
  isValidCell,
  buildOccupancySet,
  isCellOccupied,
  buildObstacleGrid,
  getNeighbors,
  type OccupiedCell,
} from './GridUtils'
import { GRID_WIDTH, GRID_HEIGHT } from '../constants'

describe('GridUtils', () => {
  describe('isValidCell', () => {
    it('should return true for valid cells within bounds', () => {
      expect(isValidCell({ x: 0, y: 0 })).toBe(true)
      expect(isValidCell({ x: GRID_WIDTH - 1, y: GRID_HEIGHT - 1 })).toBe(true)
      expect(isValidCell({ x: 5, y: 4 })).toBe(true)
    })

    it('should return false for negative x', () => {
      expect(isValidCell({ x: -1, y: 0 })).toBe(false)
    })

    it('should return false for negative y', () => {
      expect(isValidCell({ x: 0, y: -1 })).toBe(false)
    })

    it('should return false for x >= GRID_WIDTH', () => {
      expect(isValidCell({ x: GRID_WIDTH, y: 0 })).toBe(false)
    })

    it('should return false for y >= GRID_HEIGHT', () => {
      expect(isValidCell({ x: 0, y: GRID_HEIGHT })).toBe(false)
    })

    it('should return false for both coordinates out of bounds', () => {
      expect(isValidCell({ x: -5, y: -5 })).toBe(false)
      expect(isValidCell({ x: 100, y: 100 })).toBe(false)
    })
  })

  describe('buildOccupancySet', () => {
    it('should return empty set for empty array', () => {
      const set = buildOccupancySet([])
      expect(set.size).toBe(0)
    })

    it('should build set of position keys', () => {
      const cells: OccupiedCell[] = [
        { unitId: 'unit-1', position: { x: 1, y: 2 } },
        { unitId: 'unit-2', position: { x: 3, y: 4 } },
      ]
      const set = buildOccupancySet(cells)

      expect(set.has('1,2')).toBe(true)
      expect(set.has('3,4')).toBe(true)
      expect(set.size).toBe(2)
    })

    it('should deduplicate same position keys', () => {
      const cells: OccupiedCell[] = [
        { unitId: 'unit-1', position: { x: 1, y: 1 } },
        { unitId: 'unit-2', position: { x: 1, y: 1 } },
      ]
      const set = buildOccupancySet(cells)
      expect(set.size).toBe(1)
    })
  })

  describe('isCellOccupied', () => {
    it('should return true for occupied cell', () => {
      const occupancy = new Set(['1,2', '3,4'])
      expect(isCellOccupied({ x: 1, y: 2 }, occupancy)).toBe(true)
    })

    it('should return false for unoccupied cell', () => {
      const occupancy = new Set(['1,2'])
      expect(isCellOccupied({ x: 5, y: 5 }, occupancy)).toBe(false)
    })

    it('should return false for empty occupancy set', () => {
      expect(isCellOccupied({ x: 0, y: 0 }, new Set())).toBe(false)
    })
  })

  describe('buildObstacleGrid', () => {
    it('should create grid with all false for no obstacles', () => {
      const grid = buildObstacleGrid([])
      expect(grid).toHaveLength(GRID_HEIGHT)
      expect(grid[0]).toHaveLength(GRID_WIDTH)
      expect(grid.every((row) => row.every((cell) => cell === false))).toBe(true)
    })

    it('should mark occupied cells as obstacles', () => {
      const cells: OccupiedCell[] = [
        { unitId: 'unit-1', position: { x: 2, y: 3 } },
        { unitId: 'unit-2', position: { x: 5, y: 1 } },
      ]
      const grid = buildObstacleGrid(cells)

      expect(grid[3][2]).toBe(true)
      expect(grid[1][5]).toBe(true)
      expect(grid[0][0]).toBe(false)
    })

    it('should ignore cells out of bounds', () => {
      const cells: OccupiedCell[] = [
        { unitId: 'unit-1', position: { x: -1, y: 0 } },
        { unitId: 'unit-2', position: { x: 0, y: -1 } },
        { unitId: 'unit-3', position: { x: GRID_WIDTH, y: 0 } },
      ]
      const grid = buildObstacleGrid(cells)

      expect(grid.every((row) => row.every((cell) => cell === false))).toBe(true)
    })

    it('should merge walls and occupied cells', () => {
      const cells: OccupiedCell[] = [
        { unitId: 'unit-1', position: { x: 1, y: 1 } },
      ]
      const walls: boolean[][] = []
      for (let y = 0; y < GRID_HEIGHT; y++) {
        walls[y] = []
        for (let x = 0; x < GRID_WIDTH; x++) {
          walls[y][x] = false
        }
      }
      walls[2][2] = true

      const grid = buildObstacleGrid(cells, walls)

      expect(grid[1][1]).toBe(true) // from occupied cell
      expect(grid[2][2]).toBe(true) // from walls
      expect(grid[0][0]).toBe(false)
    })
  })

  describe('getNeighbors', () => {
    it('should return 4 cardinal neighbors', () => {
      const neighbors = getNeighbors({ x: 5, y: 5 })

      expect(neighbors).toHaveLength(4)
      expect(neighbors).toContainEqual({ x: 4, y: 5 })
      expect(neighbors).toContainEqual({ x: 6, y: 5 })
      expect(neighbors).toContainEqual({ x: 5, y: 4 })
      expect(neighbors).toContainEqual({ x: 5, y: 6 })
    })

    it('should include negative coordinates for corner cells', () => {
      // getNeighbors does not validate bounds, it just returns offsets
      const neighbors = getNeighbors({ x: 0, y: 0 })

      expect(neighbors).toContainEqual({ x: -1, y: 0 })
      expect(neighbors).toContainEqual({ x: 0, y: -1 })
      expect(neighbors).toContainEqual({ x: 1, y: 0 })
      expect(neighbors).toContainEqual({ x: 0, y: 1 })
    })
  })
})
