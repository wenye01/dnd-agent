/**
 * A* pathfinding and BFS move-range calculation.
 * Uses 4-directional movement on a grid with obstacles.
 */
import type { GridPosition } from './CoordinateUtils'
import { isValidCell, getNeighbors } from './GridUtils'

// ---------- A* Pathfinding ----------

interface AStarNode {
  x: number
  y: number
  g: number // cost from start
  h: number // heuristic to end
  f: number // g + h
  parent: AStarNode | null
}

function heuristic(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y)
}

/**
 * Find the shortest path from start to end, avoiding obstacles.
 * Returns an array of grid positions (including start and end), or empty if no path.
 * @param allowEndObstacle If true, the end cell may be an obstacle (useful for attack targeting).
 *   Default false — pure movement should never target an obstacle cell.
 */
export function findPath(
  start: GridPosition,
  end: GridPosition,
  obstacles: boolean[][],
  { allowEndObstacle = false }: { allowEndObstacle?: boolean } = {},
): GridPosition[] {
  if (!isValidCell(start) || !isValidCell(end)) return []
  if (!allowEndObstacle && obstacles[end.y]?.[end.x]) return []

  const openSet: AStarNode[] = []
  const closedSet = new Set<string>()

  const startNode: AStarNode = {
    x: start.x,
    y: start.y,
    g: 0,
    h: heuristic(start, end),
    f: heuristic(start, end),
    parent: null,
  }
  openSet.push(startNode)

  while (openSet.length > 0) {
    // Pick node with lowest f
    let lowestIdx = 0
    for (let i = 1; i < openSet.length; i++) {
      if (openSet[i].f < openSet[lowestIdx].f) lowestIdx = i
    }
    const current = openSet.splice(lowestIdx, 1)[0]

    // Reached goal
    if (current.x === end.x && current.y === end.y) {
      const path: GridPosition[] = []
      let node: AStarNode | null = current
      while (node) {
        path.unshift({ x: node.x, y: node.y })
        node = node.parent
      }
      return path
    }

    const key = `${current.x},${current.y}`
    closedSet.add(key)

    for (const neighbor of getNeighbors({ x: current.x, y: current.y })) {
      if (!isValidCell(neighbor)) continue
      if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue
      // Allow the end cell only when explicitly requested (e.g., attack targeting)
      if (obstacles[neighbor.y]?.[neighbor.x] && !(allowEndObstacle && neighbor.x === end.x && neighbor.y === end.y)) continue

      const g = current.g + 1
      const h = heuristic(neighbor, end)
      const f = g + h

      const existing = openSet.find(
        (n) => n.x === neighbor.x && n.y === neighbor.y,
      )
      if (existing) {
        if (g < existing.g) {
          existing.g = g
          existing.f = f
          existing.parent = current
        }
      } else {
        openSet.push({ x: neighbor.x, y: neighbor.y, g, h, f, parent: current })
      }
    }
  }

  return [] // no path found
}

// ---------- BFS Move Range ----------

/**
 * Calculate all reachable cells within `range` steps from start, avoiding obstacles.
 * Uses BFS to consider wall / obstacle blocking.
 * `ignoreUnit` optionally excludes a single occupied cell (e.g. the mover's own cell).
 */
export function getMoveRange(
  start: GridPosition,
  range: number,
  obstacles: boolean[][],
  ignoreUnit?: string,
  occupiedKeys?: Set<string>,
): GridPosition[] {
  const result: GridPosition[] = []
  const visited = new Set<string>()
  const queue: { x: number; y: number; steps: number }[] = [
    { x: start.x, y: start.y, steps: 0 },
  ]
  visited.add(`${start.x},${start.y}`)

  while (queue.length > 0) {
    const current = queue.shift()!

    // Add current cell to range (except start if desired)
    if (current.x !== start.x || current.y !== start.y) {
      result.push({ x: current.x, y: current.y })
    }

    if (current.steps >= range) continue

    for (const neighbor of getNeighbors({ x: current.x, y: current.y })) {
      const key = `${neighbor.x},${neighbor.y}`
      if (!isValidCell(neighbor)) continue
      if (visited.has(key)) continue
      if (obstacles[neighbor.y]?.[neighbor.x]) continue
      // Skip cells occupied by other units (unless it's the ignored unit)
      if (occupiedKeys?.has(key) && key !== ignoreUnit) continue

      visited.add(key)
      queue.push({ x: neighbor.x, y: neighbor.y, steps: current.steps + 1 })
    }
  }

  return result
}
