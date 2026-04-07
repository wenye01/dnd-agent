/**
 * UI Manager coordinates HP bars, labels, and status icons for all entities.
 * Attached to a CombatScene; manages per-entity UI elements.
 */
import type Phaser from 'phaser'
import type { Combatant } from '../../types'
import { HealthBar } from './HealthBar'
import { NameLabel } from './NameLabel'
import { StatusIcon } from './StatusIcon'
import { SelectionRing } from './SelectionRing'
import {
  HP_BAR_OFFSET_Y,
  NAME_LABEL_OFFSET_Y,
  STATUS_ICON_OFFSET_Y,
  STATUS_ICON_SPACING,
} from '../constants'

interface EntityUI {
  healthBar: HealthBar
  nameLabel: NameLabel
  selectionRing: SelectionRing
  statusIcons: StatusIcon[]
}

export class GameUIManager {
  private scene: Phaser.Scene
  private entityUIs = new Map<string, EntityUI>()

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  /** Create UI elements for a combatant entity container. */
  createUI(
    combatantId: string,
    container: Phaser.GameObjects.Container,
    combatant: Combatant,
  ): void {
    // Health bar
    const healthBar = new HealthBar(this.scene)
    healthBar.setPosition(0, HP_BAR_OFFSET_Y)
    healthBar.setHp(combatant.currentHp, combatant.maxHp)
    container.add(healthBar)

    // Name label
    const nameColor = combatant.type === 'player' ? '#88bbff' : '#ff8888'
    const nameLabel = new NameLabel(this.scene, combatant.name, nameColor)
    nameLabel.setPosition(0, NAME_LABEL_OFFSET_Y)
    container.add(nameLabel)

    // Selection ring
    const selectionRing = new SelectionRing(this.scene)
    container.add(selectionRing)

    this.entityUIs.set(combatantId, {
      healthBar,
      nameLabel,
      selectionRing,
      statusIcons: [],
    })

    // Draw initial status icons
    this.updateStatusIcons(combatantId, container, combatant.conditions.map((c) => c.condition))
  }

  /** Update HP bar for a combatant. */
  updateHp(combatantId: string, currentHp: number, maxHp: number): void {
    const ui = this.entityUIs.get(combatantId)
    if (!ui) return
    ui.healthBar.setHp(currentHp, maxHp)
  }

  /** Update status condition icons for a combatant. */
  updateStatusIcons(
    combatantId: string,
    container: Phaser.GameObjects.Container,
    conditions: string[],
  ): void {
    const ui = this.entityUIs.get(combatantId)
    if (!ui) return

    // Remove old icons
    for (const icon of ui.statusIcons) {
      container.remove(icon, true)
      icon.destroy()
    }
    ui.statusIcons = []

    // Create new icons
    conditions.forEach((condition, index) => {
      const icon = new StatusIcon(this.scene, condition)
      const startX = -(conditions.length - 1) * (STATUS_ICON_SPACING / 2)
      icon.setPosition(startX + index * STATUS_ICON_SPACING, STATUS_ICON_OFFSET_Y)
      container.add(icon)
      ui.statusIcons.push(icon)
    })
  }

  /** Show/hide selection ring for a combatant. */
  setSelection(combatantId: string, selected: boolean): void {
    const ui = this.entityUIs.get(combatantId)
    if (!ui) return
    if (selected) {
      ui.selectionRing.show()
    } else {
      ui.selectionRing.hide()
    }
  }

  /** Clean up all UI elements. */
  destroy(): void {
    for (const [, ui] of this.entityUIs) {
      ui.healthBar.destroy()
      ui.nameLabel.destroy()
      ui.selectionRing.destroy()
      for (const icon of ui.statusIcons) {
        icon.destroy()
      }
    }
    this.entityUIs.clear()
  }
}
