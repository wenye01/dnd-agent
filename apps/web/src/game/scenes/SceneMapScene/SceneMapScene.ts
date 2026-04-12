/**
 * SceneMapScene - Exploration scene with click-to-move, interactable objects,
 * and map transitions. Designed to integrate with the B208 backend map system.
 *
 * Uses mock data during development; Phase 4 integration replaces with real API.
 */
import Phaser from 'phaser'
import { BaseScene } from '../BaseScene'
import { eventBus } from '../../../events/eventBus'
import { GameEvents } from '../../../events/gameEvents'
import { TILE_SIZE } from '../../constants'
import { InteractableHighlight } from './InteractableHighlight'
import { MapTransition } from './MapTransition'

// Tile types for rendering
const TILE_COLORS = {
  floor: 0x1a1a2e,
  wall: 0x2a2844,
  water: 0x1a3a5c,
  door: 0x4a3820,
  grass: 0x1a2e1a,
  path: 0x252337,
} as const

// Mock map data for development
interface MockMapData {
  id: string
  name: string
  width: number
  height: number
  tiles: number[][]
  playerStart: { x: number; y: number }
  interactables: Array<{
    id: string
    type: 'door' | 'chest' | 'npc' | 'portal'
    name: string
    position: { x: number; y: number }
    description?: string
    targetMap?: string
  }>
}

const MOCK_MAPS: Record<string, MockMapData> = {
  tavern: {
    id: 'tavern',
    name: 'The Rusty Anchor Tavern',
    width: 16,
    height: 12,
    tiles: generateTavernMap(),
    playerStart: { x: 8, y: 10 },
    interactables: [
      { id: 'door_exit', type: 'door', name: 'Front Door', position: { x: 8, y: 0 }, description: 'A heavy oak door leading outside.', targetMap: 'village' },
      { id: 'barkeep', type: 'npc', name: 'Barkeep Gundren', position: { x: 3, y: 3 }, description: 'A weathered dwarf polishing a tankard.' },
      { id: 'chest_1', type: 'chest', name: 'Wooden Chest', position: { x: 13, y: 2 }, description: 'A dusty chest in the corner.' },
    ],
  },
  village: {
    id: 'village',
    name: 'Phandalin Village',
    width: 20,
    height: 15,
    tiles: generateVillageMap(),
    playerStart: { x: 10, y: 14 },
    interactables: [
      { id: 'tavern_door', type: 'door', name: 'Tavern Entrance', position: { x: 10, y: 7 }, description: 'The Rusty Anchor Tavern.', targetMap: 'tavern' },
      { id: 'npc_goblin', type: 'npc', name: 'Goblin Scout', position: { x: 17, y: 4 }, description: 'A goblin lurking near the forest edge.' },
      { id: 'portal_dungeon', type: 'portal', name: 'Cave Entrance', position: { x: 0, y: 7 }, description: 'A dark cave entrance.', targetMap: 'dungeon' },
    ],
  },
  dungeon: {
    id: 'dungeon',
    name: 'Cragmaw Cave',
    width: 12,
    height: 10,
    tiles: generateDungeonMap(),
    playerStart: { x: 11, y: 5 },
    interactables: [
      { id: 'cave_exit', type: 'door', name: 'Cave Exit', position: { x: 11, y: 5 }, description: 'The way back to the surface.', targetMap: 'village' },
      { id: 'chest_loot', type: 'chest', name: 'Goblin Treasure', position: { x: 2, y: 2 }, description: 'A pile of stolen goods.' },
      { id: 'npc_boss', type: 'npc', name: 'Cragmaw Chief', position: { x: 3, y: 4 }, description: 'A large bugbear armed with a morningstar.' },
    ],
  },
}

// Map generators (simple procedural layouts)
function generateTavernMap(): number[][] {
  const w = 16, h = 12
  const map: number[][] = Array.from({ length: h }, () => Array(w).fill(0)) // 0=floor
  // Walls
  for (let x = 0; x < w; x++) { map[0][x] = 1; map[h - 1][x] = 1 }
  for (let y = 0; y < h; y++) { map[y][0] = 1; map[y][w - 1] = 1 }
  // Door at top center
  map[0][8] = 3 // door
  // Bar counter
  for (let x = 2; x <= 5; x++) { map[4][x] = 1 }
  // Tables (just use floor, walls block movement)
  map[2][10] = 1; map[2][11] = 1
  map[6][8] = 1; map[6][9] = 1
  map[8][4] = 1; map[8][5] = 1; map[8][6] = 1
  map[8][10] = 1; map[8][11] = 1
  return map
}

function generateVillageMap(): number[][] {
  const w = 20, h = 15
  const map: number[][] = Array.from({ length: h }, () => Array(w).fill(5)) // 5=grass
  // Path (horizontal and vertical)
  for (let x = 2; x < w - 2; x++) { map[7][x] = 4 } // horizontal path
  for (let y = 5; y < h - 1; y++) { map[y][10] = 4 } // vertical path
  // Buildings (walls)
  for (let x = 8; x <= 12; x++) { map[5][x] = 1; map[9][x] = 1 }
  for (let y = 5; y <= 9; y++) { map[y][8] = 1; map[y][12] = 1 }
  map[9][10] = 3 // tavern door
  // Trees (walls at edges)
  for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) map[y][x] = 1
  for (let y = 0; y < 3; y++) for (let x = w - 3; x < w; x++) map[y][x] = 1
  // Forest edge
  for (let y = 0; y < 4; y++) map[y][w - 4] = 1
  for (let x = w - 4; x < w; x++) map[3][x] = 1
  return map
}

function generateDungeonMap(): number[][] {
  const w = 12, h = 10
  const map: number[][] = Array.from({ length: h }, () => Array(w).fill(1)) // 1=wall
  // Carve rooms
  for (let y = 2; y <= 5; y++) for (let x = 1; x <= 5; x++) map[y][x] = 0
  for (let y = 3; y <= 7; y++) for (let x = 7; x <= 10; x++) map[y][x] = 0
  // Corridor
  for (let x = 5; x <= 7; x++) map[4][x] = 0
  // Entry
  map[5][11] = 3 // door/exit
  for (let y = 4; y <= 6; y++) map[y][10] = 0
  return map
}

export class SceneMapScene extends BaseScene {
  private currentMapId: string = 'tavern'
  private tiles: Phaser.GameObjects.Rectangle[][] = []
  private playerMarker: Phaser.GameObjects.Container | null = null
  private interactableHighlights: InteractableHighlight[] = []
  private mapTransition: MapTransition | null = null
  private moveTween: Phaser.Tweens.Tween | null = null

  constructor() {
    super({ key: 'exploring' })
  }

  init(data: Record<string, unknown>): void {
    this.currentMapId = (data.mapId as string) || 'tavern'
  }

  preload(): void {
    // No external assets needed for mock rendering
  }

  create(): void {
    this.loadMap(this.currentMapId)
    this.setupInput()
    this.setupEventListeners()
  }

  update(): void {
    // Update interactable highlight animations
    for (const hl of this.interactableHighlights) {
      hl.update()
    }
  }

  shutdown(): void {
    this.cleanupScene()
    super.shutdown()
  }

  private cleanupScene(): void {
    if (this.moveTween) {
      this.moveTween.stop()
      this.moveTween = null
    }
    this.interactableHighlights = []
    this.mapTransition = null
    this.playerMarker = null
  }

  /** Load and render a map by ID */
  private loadMap(mapId: string, entryPosition?: { x: number; y: number }): void {
    const mapData = MOCK_MAPS[mapId]
    if (!mapData) {
      console.warn(`[SceneMapScene] Map "${mapId}" not found`)
      return
    }

    this.currentMapId = mapId

    // Update camera bounds
    this.cameras.main.setBounds(0, 0, mapData.width * TILE_SIZE, mapData.height * TILE_SIZE)

    // Render tiles
    this.renderTiles(mapData)

    // Place player
    const startPos = entryPosition || mapData.playerStart
    this.createPlayerMarker(startPos)

    // Place interactables
    this.createInteractables(mapData)
  }

  /** Render the tile grid */
  private renderTiles(mapData: MockMapData): void {
    // Clear existing tiles
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.destroy()
      }
    }
    this.tiles = []

    for (let y = 0; y < mapData.height; y++) {
      const row: Phaser.GameObjects.Rectangle[] = []
      for (let x = 0; x < mapData.width; x++) {
        const tileType = mapData.tiles[y]?.[x] ?? 0
        const color = this.getTileColor(tileType)
        const isWalkable = tileType !== 1 // 1=wall

        const rect = this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          color,
          1
        )
        rect.setStrokeStyle(1, 0x333355, 0.3)
        rect.setData('walkable', isWalkable)
        rect.setData('gridX', x)
        rect.setData('gridY', y)
        row.push(rect)
      }
      this.tiles.push(row)
    }
  }

  /** Create the player marker */
  private createPlayerMarker(position: { x: number; y: number }): void {
    if (this.playerMarker) {
      this.playerMarker.destroy()
    }

    const container = this.add.container(
      position.x * TILE_SIZE + TILE_SIZE / 2,
      position.y * TILE_SIZE + TILE_SIZE / 2
    )

    // Player circle
    const circle = this.add.circle(0, 0, TILE_SIZE / 2 - 8, 0x4488ff, 0.8)
    circle.setStrokeStyle(2, 0x88bbff, 0.6)
    container.add(circle)

    // Glow effect
    const glow = this.add.circle(0, 0, TILE_SIZE / 2 - 4, 0x4488ff, 0.2)
    container.add(glow)

    // Pulse animation on glow
    this.tweens.add({
      targets: glow,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.1,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    container.setDepth(100)
    this.playerMarker = container
  }

  /** Create interactable highlight objects */
  private createInteractables(mapData: MockMapData): void {
    this.interactableHighlights = []

    for (const interactable of mapData.interactables) {
      const highlight = new InteractableHighlight(
        this,
        interactable.position.x,
        interactable.position.y,
        interactable.type,
        interactable.name,
        () => this.handleInteractableClick(interactable)
      )
      this.interactableHighlights.push(highlight)
    }
  }

  /** Setup click and hover input */
  private setupInput(): void {
    this.input.on('gameobjectdown', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      const gridX = gameObject.getData('gridX') as number | undefined
      const gridY = gameObject.getData('gridY') as number | undefined
      const walkable = gameObject.getData('walkable') as boolean | undefined

      if (gridX !== undefined && gridY !== undefined) {
        if (walkable) {
          this.movePlayerTo(gridX, gridY)
        }

        // Emit tile click event
        eventBus.emit(GameEvents.SCENEMAP_TILE_CLICK, {
          x: gridX,
          y: gridY,
          mapId: this.currentMapId,
          walkable,
        })
      }
    })

    // Pointer hover effect
    this.input.on('gameobjectover', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Rectangle) {
        gameObject.setAlpha(0.8)
      }
    })

    this.input.on('gameobjectout', (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
      if (gameObject instanceof Phaser.GameObjects.Rectangle) {
        gameObject.setAlpha(1)
      }
    })
  }

  /** Setup event listeners for scene control */
  private setupEventListeners(): void {
    const unsub1 = eventBus.on(GameEvents.SCENEMAP_TRANSITION_START, (data) => {
      const d = data as { mapId: string; entryPoint?: { x: number; y: number } }
      this.transitionToMap(d.mapId, d.entryPoint)
    })

    this.addUnsubscribe(unsub1)
  }

  /** Move player to a grid position with smooth animation */
  private movePlayerTo(gridX: number, gridY: number): void {
    if (!this.playerMarker) return

    // Stop any existing movement
    if (this.moveTween) {
      this.moveTween.stop()
    }

    const targetX = gridX * TILE_SIZE + TILE_SIZE / 2
    const targetY = gridY * TILE_SIZE + TILE_SIZE / 2

    this.moveTween = this.tweens.add({
      targets: this.playerMarker,
      x: targetX,
      y: targetY,
      duration: 300,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.moveTween = null
      },
    })
  }

  /** Handle clicking on an interactable */
  private handleInteractableClick(interactable: MockMapData['interactables'][number]): void {
    eventBus.emit(GameEvents.SCENEMAP_INTERACT, {
      id: interactable.id,
      type: interactable.type,
      name: interactable.name,
      description: interactable.description,
      position: interactable.position,
      mapId: this.currentMapId,
    })

    // If this is a door/portal with a target map, transition
    if (interactable.targetMap) {
      this.transitionToMap(interactable.targetMap)
    }
  }

  /** Transition to another map with animation */
  private transitionToMap(mapId: string, entryPoint?: { x: number; y: number }): void {
    if (this.mapTransition?.isActive()) return

    this.mapTransition = new MapTransition(this, () => {
      this.loadMap(mapId, entryPoint)
    })
    this.mapTransition.start()
  }

  /** Get tile color based on type */
  private getTileColor(tileType: number): number {
    switch (tileType) {
      case 0: return TILE_COLORS.floor
      case 1: return TILE_COLORS.wall
      case 2: return TILE_COLORS.water
      case 3: return TILE_COLORS.door
      case 4: return TILE_COLORS.path
      case 5: return TILE_COLORS.grass
      default: return TILE_COLORS.floor
    }
  }
}
