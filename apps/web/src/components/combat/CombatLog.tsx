/**
 * CombatLog: scrollable list of combat event text entries.
 */
import React, { useEffect, useRef } from 'react'
import { useCombatStore, type CombatLogEntry } from '../../stores/combatStore'

/** Maximum height for the scrollable combat log area. */
const COMBAT_LOG_MAX_HEIGHT = '120px'

export function CombatLog() {
  const logEntries = useCombatStore((s) => s.logEntries)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [logEntries.length])

  if (logEntries.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      <div className="text-[10px] font-display text-gold/60 uppercase tracking-wider px-2 py-1 border-b border-gold/10 flex-shrink-0">
        Combat Log
      </div>
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5"
        style={{ maxHeight: COMBAT_LOG_MAX_HEIGHT }}
      >
        {logEntries.map((entry) => (
          <LogEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  )
}

const TYPE_COLORS: Record<CombatLogEntry['type'], string> = {
  info: 'text-stone-text/60',
  damage: 'text-red-400/80',
  heal: 'text-green-400/80',
  status: 'text-yellow-400/80',
  turn: 'text-gold/70',
  system: 'text-arcane/70',
}

const LogEntry = React.memo(function LogEntry({ entry }: { entry: CombatLogEntry }) {
  const colorClass = TYPE_COLORS[entry.type] ?? 'text-stone-text/60'

  return (
    <div className={`text-[9px] font-mono leading-tight ${colorClass}`}>
      {entry.text}
    </div>
  )
})
