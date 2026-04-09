import { describe, it, expect } from 'vitest'
import { worldToGrid, gridToWorld, snapToGrid, gridDistance, type GridPosition } from './CoordinateUtils'

describe('CoordinateUtils', () => {
  describe('worldToGrid', () => {
    it('should convert top-left corner (0,0) to grid (0,0)', () => {
      expect(worldToGrid(0, 0)).toEqual({ x: 0, y: 0 })
    })

    it('should convert center of first tile to grid (0,0)', () => {
      // tile center = 32, 32 -> floor(32/64) = 0
      expect(worldToGrid(32, 32)).toEqual({ x: 0, y: 0 })
    })

    it('should convert near edge of second tile to grid (1,0)', () => {
      expect(worldToGrid(64, 0)).toEqual({ x: 1, y: 0 })
    })

    it('should convert arbitrary pixel to correct grid cell', () => {
      expect(worldToGrid(100, 200)).toEqual({ x: 1, y: 3 })
    })

    it('should floor fractional world coordinates', () => {
      expect(worldToGrid(63.9, 63.9)).toEqual({ x: 0, y: 0 })
    })

    it('should handle large coordinates', () => {
      expect(worldToGrid(640, 448)).toEqual({ x: 10, y: 7 })
    })
  })

  describe('gridToWorld', () => {
    it('should convert grid (0,0) to center of first tile (32,32)', () => {
      expect(gridToWorld(0, 0)).toEqual({ x: 32, y: 32 })
    })

    it('should convert grid (1,1) to center of second tile (96,96)', () => {
      expect(gridToWorld(1, 1)).toEqual({ x: 96, y: 96 })
    })

    it('should convert grid (5,3) correctly', () => {
      // 5 * 64 + 32 = 352, 3 * 64 + 32 = 224
      expect(gridToWorld(5, 3)).toEqual({ x: 352, y: 224 })
    })

    it('should be consistent with worldToGrid (round-trip for tile center)', () => {
      const gridX = 5
      const gridY = 3
      const world = gridToWorld(gridX, gridY)
      const result = worldToGrid(world.x, world.y)
      expect(result).toEqual({ x: gridX, y: gridY })
    })
  })

  describe('snapToGrid', () => {
    it('should snap arbitrary position to tile center', () => {
      // Position (50, 50) is in tile (0,0), center is (32, 32)
      expect(snapToGrid(50, 50)).toEqual({ x: 32, y: 32 })
    })

    it('should snap position already at center to itself', () => {
      const center = gridToWorld(3, 4)
      expect(snapToGrid(center.x, center.y)).toEqual(center)
    })

    it('should snap corner position to tile center', () => {
      // (128, 128) -> tile (2,2) -> center (160, 160)
      expect(snapToGrid(128, 128)).toEqual({ x: 160, y: 160 })
    })
  })

  describe('gridDistance', () => {
    it('should return 0 for same position', () => {
      expect(gridDistance({ x: 3, y: 3 }, { x: 3, y: 3 })).toBe(0)
    })

    it('should compute horizontal distance', () => {
      expect(gridDistance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
    })

    it('should compute vertical distance', () => {
      expect(gridDistance({ x: 0, y: 0 }, { x: 0, y: 4 })).toBe(4)
    })

    it('should compute Manhattan distance for diagonal', () => {
      expect(gridDistance({ x: 1, y: 2 }, { x: 4, y: 6 })).toBe(7)
    })

    it('should handle negative distances (absolute values)', () => {
      expect(gridDistance({ x: 5, y: 5 }, { x: 2, y: 1 })).toBe(7)
    })
  })
})
