/**
 * World <-> Grid coordinate conversion utilities.
 * Grid uses 64px tiles; grid coords are integer-based.
 */
import { TILE_SIZE } from '../constants'

export interface GridPosition {
  x: number
  y: number
}

/** Convert pixel (world) coordinates to grid coordinates. */
export function worldToGrid(worldX: number, worldY: number): GridPosition {
  return {
    x: Math.floor(worldX / TILE_SIZE),
    y: Math.floor(worldY / TILE_SIZE),
  }
}

/** Convert grid coordinates to pixel center of that cell. */
export function gridToWorld(gridX: number, gridY: number): GridPosition {
  return {
    x: gridX * TILE_SIZE + TILE_SIZE / 2,
    y: gridY * TILE_SIZE + TILE_SIZE / 2,
  }
}

/** Snap a pixel position to the center of its grid cell. */
export function snapToGrid(worldX: number, worldY: number): GridPosition {
  const grid = worldToGrid(worldX, worldY)
  return gridToWorld(grid.x, grid.y)
}

/** Manhattan distance between two grid positions. */
export function gridDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}
