import { motion } from 'framer-motion'
import type { SessionRecord } from './StatsPage'

function formatDate(ts: number): string {
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

interface SessionHistoryProps {
  sessions: SessionRecord[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRefresh: () => void
}

export function SessionHistory({ sessions, selectedId, onSelect, onRefresh }: SessionHistoryProps) {
  return (
    <div className="rounded-xl bg-discord-card/80 border border-white/10 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-gray-400 font-mono">Sessions</span>
        <button
          onClick={onRefresh}
          className="text-xs text-discord-accent hover:underline"
        >
          Refresh
        </button>
      </div>
      <ul className="max-h-[60vh] overflow-y-auto">
        {sessions.length === 0 ? (
          <li className="px-4 py-6 text-gray-500 text-sm text-center">No sessions yet.</li>
        ) : (
          sessions.map((s) => (
            <motion.li
              key={s.id}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
              className={`px-4 py-3 cursor-pointer border-b border-white/5 last:border-0 ${
                selectedId === s.id ? 'bg-discord-accent/20' : ''
              }`}
              onClick={() => onSelect(s.id)}
            >
              <div className="font-mono text-sm text-white">{formatDate(s.start_time)}</div>
              <div className="text-xs text-cyber-neon">{formatDuration(s.duration_seconds)}</div>
            </motion.li>
          ))
        )}
      </ul>
    </div>
  )
}
