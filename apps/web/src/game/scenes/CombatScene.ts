import Phaser from 'phaser'
import { useGameStore } from '../../stores/gameStore'
import { Grid } from '../objects/Grid'
import { UnitSprite } from '../objects/UnitSprite'
import { RangeHighlight } from '../objects/RangeHighlight'
import { CombatAnimations } from '../animations/CombatAnimations'
import { EffectManager } from '../effects/EffectManager'
import {
  TILE_SIZE,
  worldToGrid,
} from '../types/combat-scene'
import type {
  CombatSceneInitData,
  CombatUnitData,
  GridPosition,
  WeaponType,
  SpellSchool,
} from '../types/combat-scene'
import type { Character } from '../../types/character'
import type { CombatState } from '../../types/state'
import type { ClientMessage, CombatActionPayload } from '../../types/message'

/**
 * CombatScene - The Phaser scene for the battle grid.
 *
 * Renders a tactical grid with unit sprites, handles user interaction
 * (click to move/attack/select), plays combat animations, and
 * synchronizes state with the gameStore and WebSocket backend.
 */
export class CombatScene extends Phaser.Scene {
  // Sub-systems
  private grid!: Grid
  private rangeHighlight!: RangeHighlight
  private animations!: CombatAnimations
  private effectManager!: EffectManager

  // Units currently on the board
  private unitSprites: Map<string, UnitSprite> = new Map()
  // Track which IDs are party members vs enemies for team assignment
  private partyIds: Set<string> = new Set()
  // Track unit grid positions for range/interaction logic
  private unitPositions: Map<string, GridPosition> = new Map()
  // Track current turn character
  private currentTurnId: string | null = null
  // Selected unit for viewing info / targeting
  private selectedUnitId: string | null = null

  // Default grid dimensions (will be overridden by init data or camera)
  private gridWidth = 12
  private gridHeight = 10

  // Store unsubscribe
  private unsubscribeStore: (() => void) | null = null
  // WebSocket message unsubscribe
  private unsubscribeWs: (() => void) | null = null

  // Scene key
  constructor() {
    super({ key: 'combat' })
  }

  // ---- Lifecycle --------------------------------------------------------

  override init(data: CombatSceneInitData): void {
    this.gridWidth = data.gridWidth ?? 12
    this.gridHeight = data.gridHeight ?? 10
  }

  override create(): void {
    // Set world bounds
    this.physics.world.setBounds(0, 0, this.gridWidth * TILE_SIZE, this.gridHeight * TILE_SIZE)

    // Initialize subsystems
    this.grid = new Grid(this, this.gridWidth, this.gridHeight)
    this.rangeHighlight = new RangeHighlight(this)
    this.animations = new CombatAnimations(this)
    this.effectManager = new EffectManager(this)

    // Populate initial state from gameStore
    this.syncFromStore()

    // Set up interactions
    this.setupInteraction()

    // Subscribe to store changes for real-time updates
    this.subscribeToStore()
  }

  override shutdown(): void {
    this.unsubscribeStore?.()
    this.unsubscribeWs?.()
    this.rangeHighlight.destroy()
    this.effectManager.clearAll()
    this.unitSprites.forEach((sprite) => sprite.destroy())
    this.unitSprites.clear()
    this.grid.destroy()
  }

  // ---- Store Synchronization --------------------------------------------

  /** Read current combat state from the gameStore and build/update sprites. */
  private syncFromStore(): void {
    const state = useGameStore.getState()
    const gameState = state.gameState
    if (!gameState) return

    const combat = gameState.combat
    const party = gameState.party

    // Track party IDs
    this.partyIds = new Set(party.map((c) => c.id))

    if (combat) {
      this.rebuildUnits(party, combat)
      this.updateTurnFromCombat(combat)
    }
  }

  /** Subscribe to gameStore changes to update the scene reactively. */
  private subscribeToStore(): void {
    this.unsubscribeStore = useGameStore.subscribe((state) => {
      const gameState = state.gameState
      if (!gameState) return

      const combat = gameState.combat
      const party = gameState.party

      this.partyIds = new Set(party.map((c) => c.id))

      if (combat) {
        this.rebuildUnits(party, combat)
        this.updateTurnFromCombat(combat)
      } else {
        // Combat ended - clear all units
        this.clearAllUnits()
      }
    })
  }

  /** Rebuild or update unit sprites to match current state. */
  private rebuildUnits(party: Character[], combat: CombatState): void {
    const activeIds = new Set<string>()

    // Create/update party members
    for (const char of party) {
      activeIds.add(char.id)
      const existing = this.unitSprites.get(char.id)
      const gridPos = this.getUnitGridPosition(char.id, combat)
      const data: CombatUnitData = {
        id: char.id,
        name: char.name,
        team: 'player',
        hp: char.currentHitPoints,
        maxHp: char.maxHitPoints,
        ac: char.armorClass,
        speed: char.speed,
        conditions: char.conditions,
        gridPosition: gridPos,
      }

      if (existing) {
        existing.updateData(data)
        if (existing.gridPosition.x !== gridPos.x || existing.gridPosition.y !== gridPos.y) {
          existing.setGridPosition(gridPos)
        }
        this.effectManager.updateConditions(existing, char.conditions)
      } else {
        const sprite = new UnitSprite(this, data)
        this.unitSprites.set(char.id, sprite)
        this.unitPositions.set(char.id, gridPos)
        this.effectManager.updateConditions(sprite, char.conditions)
      }
    }

    // Create/update enemies from combat participants that are not in party
    for (const id of combat.participants) {
      if (this.partyIds.has(id)) continue
      activeIds.add(id)
      const existing = this.unitSprites.get(id)
      const gridPos = this.getUnitGridPosition(id, combat)

      if (existing) {
        if (existing.gridPosition.x !== gridPos.x || existing.gridPosition.y !== gridPos.y) {
          existing.setGridPosition(gridPos)
        }
      } else {
        const data: CombatUnitData = {
          id,
          name: this.getEnemyName(id),
          team: 'enemy',
          hp: 0,
          maxHp: 0,
          ac: 0,
          speed: 30,
          conditions: [],
          gridPosition: gridPos,
        }
        const sprite = new UnitSprite(this, data)
        this.unitSprites.set(id, sprite)
        this.unitPositions.set(id, gridPos)
      }
    }

    // Remove sprites for units no longer in combat
    for (const [id, sprite] of this.unitSprites) {
      if (!activeIds.has(id)) {
        this.effectManager.clearUnitIcons(id)
        sprite.destroy()
        this.unitSprites.delete(id)
        this.unitPositions.delete(id)
      }
    }
  }

  /** Update the current turn indicator based on combat state. */
  private updateTurnFromCombat(combat: CombatState): void {
    const initiatives = combat.initiatives
    if (initiatives.length === 0) return

    const currentInitiative = initiatives[combat.turnIndex]
    if (!currentInitiative) return

    const newTurnId = currentInitiative.characterId
    if (newTurnId !== this.currentTurnId) {
      // Clear previous turn indicator
      if (this.currentTurnId) {
        const prevSprite = this.unitSprites.get(this.currentTurnId)
        prevSprite?.setCurrentTurn(false)
      }

      this.currentTurnId = newTurnId

      // Set new turn indicator
      const newSprite = this.unitSprites.get(newTurnId)
      newSprite?.setCurrentTurn(true)
    }
  }

  /** Clear all unit sprites from the scene. */
  private clearAllUnits(): void {
    for (const [, sprite] of this.unitSprites) {
      sprite.destroy()
    }
    this.unitSprites.clear()
    this.unitPositions.clear()
    this.effectManager.clearAll()
    this.currentTurnId = null
  }

  // ---- Interaction ------------------------------------------------------

  private setupInteraction(): void {
    // Click on a game object (unit sprite)
    this.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (gameObject instanceof UnitSprite) {
          this.onUnitClick(gameObject)
        }
      }
    )

    // Click on empty tile
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Only handle clicks that did not hit a unit
      const clickedObject = this.input.hitTestPointer(pointer)
      if (clickedObject.length > 0) return

      const tilePos = worldToGrid(pointer.worldX, pointer.worldY)
      this.onTileClick(tilePos)
    })
  }

  /** Handle clicking on a unit sprite. */
  private onUnitClick(unit: UnitSprite): void {
    if (!this.currentTurnId) return

    if (unit.team === 'enemy' || unit.team === 'neutral') {
      // Click on enemy -> attack
      this.sendCombatAction({
        action: 'attack',
        targetId: unit.unitId,
      })
    } else if (unit.unitId === this.currentTurnId) {
      // Click on self -> select and show move range
      this.selectedUnitId = unit.unitId
      this.showMoveRange(unit)
    } else {
      // Click on ally -> select / show info
      this.selectedUnitId = unit.unitId
      this.rangeHighlight.clearAll()
    }
  }

  /** Handle clicking on an empty tile. */
  private onTileClick(tilePos: GridPosition): void {
    if (!this.currentTurnId) return

    // If a friendly unit is selected and it is the current turn, move there
    if (this.selectedUnitId && this.selectedUnitId === this.currentTurnId) {
      this.sendCombatAction({
        action: 'move',
        position: { x: tilePos.x, y: tilePos.y },
      })
      this.rangeHighlight.clearAll()
    }
  }

  /** Show the movement range for a unit. */
  private showMoveRange(unit: UnitSprite): void {
    const pos = unit.gridPosition
    // Speed in feet / 5 feet per grid cell
    const gridSpeed = Math.ceil(unit.getData('speed') ?? 30) / 5
    this.rangeHighlight.showMoveRange(pos, gridSpeed)
  }

  // ---- Combat Event Handling -------------------------------------------

  /**
   * Handle a combat event from the WebSocket.
   * Called externally by the scene consumer (useGameMessages or similar).
   */
  handleCombatEvent(event: {
    eventType: string
    characterId?: string
    target?: string
    data?: unknown
    round?: number
  }): void {
    switch (event.eventType) {
      case 'move': {
        if (event.characterId && event.data) {
          const moveData = event.data as { from?: GridPosition; to?: GridPosition }
          if (moveData.to) {
            this.handleMove(event.characterId, moveData.to)
          }
        }
        break
      }
      case 'attack': {
        if (event.characterId && event.target) {
          const attackData = event.data as {
            hit?: boolean
            critical?: boolean
            damage?: number
            weaponType?: WeaponType
          }
          this.handleAttack(
            event.characterId,
            event.target,
            attackData?.hit ?? true,
            attackData?.damage ?? 0,
            attackData?.critical ?? false,
            attackData?.weaponType ?? 'melee'
          )
        }
        break
      }
      case 'spell': {
        if (event.characterId) {
          const spellData = event.data as {
            school?: SpellSchool
            damage?: number
            isHeal?: boolean
            aoeCenter?: GridPosition
            aoeRadius?: number
          }
          this.handleSpell(
            event.characterId,
            event.target ?? null,
            spellData?.school ?? 'evocation',
            spellData?.damage ?? 0,
            spellData?.isHeal ?? false,
            spellData?.aoeCenter,
            spellData?.aoeRadius
          )
        }
        break
      }
      case 'turn_start': {
        if (event.characterId) {
          this.handleTurnChange(event.characterId)
        }
        break
      }
      default:
        break
    }
  }

  /** Handle a unit movement event. */
  private handleMove(unitId: string, to: GridPosition): void {
    const sprite = this.unitSprites.get(unitId)
    if (!sprite) return

    this.unitPositions.set(unitId, to)
    this.animations.animateMove(sprite, to)
  }

  /** Handle an attack event with full visual sequence. */
  private async handleAttack(
    sourceId: string,
    targetId: string,
    hit: boolean,
    damage: number,
    critical: boolean,
    weaponType: WeaponType
  ): Promise<void> {
    const source = this.unitSprites.get(sourceId)
    const target = this.unitSprites.get(targetId)
    if (!source || !target) return

    // Melee attack animation (lunge)
    if (weaponType === 'melee' || weaponType === 'magic') {
      await this.animations.animateMeleeAttack(source, target, weaponType)
    } else {
      await this.animations.animateRangedAttack(source, target)
    }

    // Play the full effect sequence
    await this.effectManager.playAttackSequence(
      source, target, hit, damage, critical, weaponType
    )

    // Flash target on hit
    if (hit) {
      this.animations.animateHit(target)
    } else {
      this.animations.animateMiss(target)
    }
  }

  /** Handle a spell cast event. */
  private async handleSpell(
    casterId: string,
    targetId: string | null,
    school: SpellSchool,
    damage: number,
    isHeal: boolean,
    aoeCenter?: GridPosition,
    aoeRadius?: number
  ): Promise<void> {
    const caster = this.unitSprites.get(casterId)
    const target = targetId ? this.unitSprites.get(targetId) : null
    if (!caster) return

    // AOE effect
    if (aoeCenter && aoeRadius) {
      this.effectManager.playAOESpell(aoeCenter, aoeRadius, school)
    }

    await this.effectManager.playSpellSequence(caster, target, school, damage, isHeal)
  }

  /** Handle a turn change event. */
  private handleTurnChange(newTurnId: string): void {
    // Clear old turn indicator
    if (this.currentTurnId) {
      const oldSprite = this.unitSprites.get(this.currentTurnId)
      oldSprite?.setCurrentTurn(false)
    }

    this.currentTurnId = newTurnId
    this.selectedUnitId = newTurnId

    // Set new indicator
    const newSprite = this.unitSprites.get(newTurnId)
    newSprite?.setCurrentTurn(true)

    // Clear range highlights
    this.rangeHighlight.clearAll()
  }

  // ---- Public API -------------------------------------------------------

  /** Show the attack range for a given unit (for target selection mode). */
  showAttackRange(unitId: string, range: number): void {
    const sprite = this.unitSprites.get(unitId)
    if (!sprite) return
    this.rangeHighlight.showAttackRange(sprite.gridPosition, range)
  }

  /** Clear all range highlights. */
  clearRange(): void {
    this.rangeHighlight.clearAll()
  }

  /** Get a unit sprite by ID. */
  getUnitSprite(id: string): UnitSprite | undefined {
    return this.unitSprites.get(id)
  }

  // ---- Helpers ----------------------------------------------------------

  /**
   * Get grid position for a unit. Uses the tracked positions map,
   * or assigns a default position for new units.
   */
  private getUnitGridPosition(unitId: string, combat: CombatState): GridPosition {
    const existing = this.unitPositions.get(unitId)
    if (existing) return existing

    // Default placement: party on left, enemies on right
    const isParty = this.partyIds.has(unitId)
    const partyIndex = [...this.partyIds].indexOf(unitId)
    const enemyParticipants = combat.participants.filter((id) => !this.partyIds.has(id))
    const enemyIndex = enemyParticipants.indexOf(unitId)

    if (isParty) {
      return { x: 1, y: 1 + partyIndex }
    } else {
      return { x: this.gridWidth - 2, y: 1 + enemyIndex }
    }
  }

  /** Generate a display name for enemy IDs. */
  private getEnemyName(id: string): string {
    // Try to extract a readable name, otherwise use a shortened ID
    if (id.startsWith('monster-') || id.startsWith('enemy-')) {
      const parts = id.split('-')
      return parts.slice(1).map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    }
    if (id.length <= 8) return id
    return id.substring(0, 6) + '..'
  }

  /**
   * Send a combat action through the gameStore / WebSocket.
   * This is the main way the scene triggers backend actions.
   */
  private sendCombatAction(action: {
    action: 'attack' | 'move' | 'spell' | 'dodge' | 'disengage' | 'end_turn'
    targetId?: string
    position?: { x: number; y: number }
    spellId?: string
  }): void {
    if (!this.currentTurnId) return

    const payload: CombatActionPayload = {
      action: action.action,
      targetId: action.targetId,
      position: action.position,
      spellId: action.spellId,
    }

    // We need to get the WebSocket send function.
    // Since the scene cannot directly import React hooks, we use an
    // event-based approach: the scene dispatches a custom DOM event,
    // and the React layer (useGameMessages or a combat hook) picks it up.
    const message: ClientMessage = {
      type: 'combat_action',
      payload: {
        actionType: action.action,
        unitId: this.currentTurnId,
        ...payload,
      } as Record<string, unknown>,
    }

    // Dispatch through a custom event so the React layer can forward via WebSocket
    window.dispatchEvent(
      new CustomEvent('dnd-combat-action', { detail: message })
    )
  }
}
