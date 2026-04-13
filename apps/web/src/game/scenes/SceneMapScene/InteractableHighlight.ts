/**
 * InteractableHighlight - Visual highlight effect for map interactable objects.
 * Shows a pulsing glow and icon for doors, chests, NPCs, and portals.
 */
import Phaser from 'phaser'
import { TILE_SIZE } from '../../constants'

// Interactable type visual config
const TYPE_CONFIG: Record<string, { color: number; alpha: number; icon: string }> = {
  door: { color: 0x8B6914, alpha: 0.4, icon: '\u{1F6AA}' },
  chest: { color: 0xD4A843, alpha: 0.5, icon: '\u{1F4E6}' },
  npc: { color: 0x44CC44, alpha: 0.4, icon: '\u{1F464}' },
  portal: { color: 0x9B6DFF, alpha: 0.5, icon: '\u{1F300}' },
  lever: { color: 0xFF8844, alpha: 0.4, icon: '\u{1F527}' },
  trap: { color: 0xFF4444, alpha: 0.3, icon: '\u{26A0}' },
  item: { color: 0x44AAFF, alpha: 0.4, icon: '\u{2728}' },
}

export class InteractableHighlight {
  private container: Phaser.GameObjects.Container
  private pulseTween: Phaser.Tweens.Tween | null = null
  private _destroyed = false

  constructor(
    scene: Phaser.Scene,
    gridX: number,
    gridY: number,
    type: string,
    name: string,
    onClick: () => void
  ) {
    const config = TYPE_CONFIG[type] || TYPE_CONFIG.item
    const worldX = gridX * TILE_SIZE + TILE_SIZE / 2
    const worldY = gridY * TILE_SIZE + TILE_SIZE / 2

    this.container = scene.add.container(worldX, worldY)
    this.container.setDepth(50)

    // Glow circle
    const glow = scene.add.circle(0, 0, TILE_SIZE / 2 - 2, config.color, config.alpha)
    glow.setStrokeStyle(2, config.color, 0.6)
    this.container.add(glow)

    // Label
    const label = scene.add.text(0, TILE_SIZE / 2 + 2, name, {
      fontSize: '8px',
      fontFamily: 'monospace',
      color: '#D4A843',
      stroke: '#000000',
      strokeThickness: 2,
      align: 'center',
    }).setOrigin(0.5, 0)
    this.container.add(label)

    // Make interactive
    glow.setInteractive({ useHandCursor: true })
    glow.on('pointerdown', onClick)
    glow.on('pointerover', () => {
      glow.setAlpha(config.alpha + 0.3)
      this.container.setScale(1.1)
    })
    glow.on('pointerout', () => {
      glow.setAlpha(config.alpha)
      this.container.setScale(1)
    })

    // Pulse animation
    this.pulseTween = scene.tweens.add({
      targets: glow,
      alpha: config.alpha * 0.5,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  update(): void {
    // Future: update animation states
  }

  isActive(): boolean {
    return !this._destroyed
  }

  destroy(): void {
    if (this._destroyed) return
    this._destroyed = true
    if (this.pulseTween) {
      this.pulseTween.stop()
      this.pulseTween = null
    }
    this.container.destroy()
  }
}
