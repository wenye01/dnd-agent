import Phaser from 'phaser'
import { TILE_SIZE } from '../types/combat-scene'
import type { UnitSprite } from '../objects/UnitSprite'
import {
  ConditionIconMap,
  ConditionColors,
} from '../types/combat-scene'
import type { Condition } from '../../types/game'

/**
 * ConditionIcons - Manages status condition icons displayed above unit sprites.
 *
 * Icons are small labeled circles that appear above the unit and can be
 * animated in/out.
 */
export class ConditionIcons {
  private scene: Phaser.Scene
  /** Maps "unitId-condition" to the icon container */
  private icons: Map<string, Phaser.GameObjects.Container> = new Map()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /**
   * Update the condition icons for a given unit.
   * Removes icons no longer present, adds new ones.
   */
  updateConditions(unit: UnitSprite, conditions: Condition[]): void {
    const unitId = unit.unitId

    // Determine which conditions need icons
    const currentKeys = new Set(conditions.map((c) => `${unitId}-${c}`))

    // Remove icons for conditions no longer present
    for (const [key, container] of this.icons) {
      if (key.startsWith(`${unitId}-`) && !currentKeys.has(key)) {
        this.animateOut(container)
        this.icons.delete(key)
      }
    }

    // Add icons for new conditions (limit to 5 visible)
    const visibleConditions = conditions.slice(0, 5)
    visibleConditions.forEach((condition, index) => {
      const key = `${unitId}-${condition}`
      if (!this.icons.has(key)) {
        const icon = this.createIcon(unit, condition, index, visibleConditions.length)
        this.icons.set(key, icon)
      }
    })
  }

  /**
   * Remove all icons for a unit (e.g. unit dies or is removed).
   */
  clearUnitIcons(unitId: string): void {
    for (const [key, container] of this.icons) {
      if (key.startsWith(`${unitId}-`)) {
        container.destroy()
        this.icons.delete(key)
      }
    }
  }

  /**
   * Clear all condition icons.
   */
  clearAll(): void {
    for (const [, container] of this.icons) {
      container.destroy()
    }
    this.icons.clear()
  }

  private createIcon(
    unit: UnitSprite,
    condition: Condition,
    index: number,
    total: number
  ): Phaser.GameObjects.Container {
    const iconSize = 12
    const spacing = iconSize + 2
    const startX = -(total - 1) * spacing / 2
    const xOffset = startX + index * spacing
    const yOffset = -(TILE_SIZE / 2 + 22)

    const container = this.scene.add.container(unit.x + xOffset, unit.y + yOffset)
    container.setDepth(1001)

    // Background circle
    const bgColor = ConditionColors[condition] ?? 0x666666
    const bg = this.scene.add.circle(0, 0, iconSize / 2, bgColor, 0.85)
    bg.setStrokeStyle(1, 0xffffff, 0.4)
    container.add(bg)

    // Text label
    const label = this.scene.add.text(0, 0, ConditionIconMap[condition] ?? '?', {
      fontSize: '8px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    })
    label.setOrigin(0.5, 0.5)
    container.add(label)

    // Animate in - scale from 0
    container.setScale(0)
    this.scene.tweens.add({
      targets: container,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Back.easeOut',
    })

    return container
  }

  private animateOut(container: Phaser.GameObjects.Container): void {
    this.scene.tweens.add({
      targets: container,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      ease: 'Cubic.easeIn',
      onComplete: () => container.destroy(),
    })
  }
}
