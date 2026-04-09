/**
 * Grid validation and occupancy utilities.
 */
import type { GridPosition } from './CoordinateUtils'
import { GRID_WIDTH, GRID_HEIGHT } from '../constants'

export interface OccupiedCell {
  unitId: string
  position: GridPosition
}

/** Check whether a grid position is within bounds. */
export function isValidCell(pos: GridPosition): boolean {
  return pos.x >= 0 && pos.x < GRID_WIDTH && pos.y >= 0 && pos.y < GRID_HEIGHT
}

/** Build a Set of "x,y" keys for quick occupancy lookup. */
export function buildOccupancySet(cells: OccupiedCell[]): Set<string> {
  return new Set(cells.map((c) => `${c.position.x},${c.position.y}`))
}

/** Check whether a grid cell is occupied. */
export function isCellOccupied(
  pos: GridPosition,
  occupancy: Set<string>,
): boolean {
  return occupancy.has(`${pos.x},${pos.y}`)
}

/** Build an obstacle grid (2D boolean array) from occupancy data and optional wall map. */
export function buildObstacleGrid(
  occupiedCells: OccupiedCell[],
  walls?: boolean[][],
): boolean[][] {
  const grid: boolean[][] = []
  for (let y = 0; y < GRID_HEIGHT; y++) {
    grid[y] = []
    for (let x = 0; x < GRID_WIDTH; x++) {
      grid[y][x] = walls?.[y]?.[x] ?? false
    }
  }

  for (const cell of occupiedCells) {
    const { x, y } = cell.position
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      grid[y][x] = true
    }
  }

  return grid
}

/** Get the four cardinal neighbors of a grid cell. */
export function getNeighbors(pos: GridPosition): GridPosition[] {
  return [
    { x: pos.x - 1, y: pos.y },
    { x: pos.x + 1, y: pos.y },
    { x: pos.x, y: pos.y - 1 },
    { x: pos.x, y: pos.y + 1 },
  ]
}
