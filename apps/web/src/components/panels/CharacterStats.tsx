import React from 'react'
import { getModifier, formatModifier } from '../../utils/modifiers'

interface AbilityScoreProps {
  name: string
  value: number
}

export function AbilityScore({ name, value }: AbilityScoreProps) {
  const modifier = getModifier(value)
  const modifierStr = formatModifier(modifier)

  return (
    <div className="stat-badge">
      <span className="text-[9px] font-display font-semibold text-gold/70 uppercase tracking-wider">{name}</span>
      <span className="text-sm font-mono font-bold text-parchment">{value}</span>
      <span className="text-[10px] text-gold font-mono font-medium">{modifierStr}</span>
    </div>
  )
}

export function StatChip({ icon: Icon, label, value, color = 'text-parchment' }: {
  icon: React.ElementType
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-1 bg-cave/50 rounded border border-gold/12">
      <Icon className="w-3 h-3 text-gold/50" />
      <span className="text-[10px] text-antique/70 font-display uppercase">{label}</span>
      <span className={`text-xs font-mono font-bold ${color}`}>{value}</span>
    </div>
  )
}
