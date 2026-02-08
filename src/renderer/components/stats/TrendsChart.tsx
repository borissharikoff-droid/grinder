import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'

interface DailyTotal {
  date: string
  total_seconds: number
  total_keystrokes: number
  sessions_count: number
}

type TrendRange = '7d' | '30d'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}

function getShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function TrendsChart() {
  const [range, setRange] = useState<TrendRange>('7d')
  const [data, setData] = useState<DailyTotal[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [range])

  async function loadData() {
    setLoading(true)
    const api = window.electronAPI
    if (!api?.db?.getDailyTotals) {
      setLoading(false)
      return
    }
    const days = range === '7d' ? 7 : 30
    const totals = await api.db.getDailyTotals(days) as DailyTotal[]
    setData(totals || [])
    setLoading(false)
  }

  // Fill in missing days
  const days = range === '7d' ? 7 : 30
  const filledData = useMemo(() => {
    const result: DailyTotal[] = []
    const dataMap = new Map(data.map(d => [d.date, d]))
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      result.push(dataMap.get(dateStr) || { date: dateStr, total_seconds: 0, total_keystrokes: 0, sessions_count: 0 })
    }
    return result
  }, [data, days])

  const maxSeconds = Math.max(...filledData.map(d => d.total_seconds), 1)
  const totalPeriodSeconds = filledData.reduce((s, d) => s + d.total_seconds, 0)
  const totalPeriodSessions = filledData.reduce((s, d) => s + d.sessions_count, 0)
  const avgDailySeconds = Math.round(totalPeriodSeconds / days)

  // For heatmap we always fetch 90 days worth
  const [heatmapFullData, setHeatmapFullData] = useState<DailyTotal[]>([])
  useEffect(() => {
    const api = window.electronAPI
    if (!api?.db?.getDailyTotals) return
    api.db.getDailyTotals(90).then((totals) => {
      setHeatmapFullData((totals as DailyTotal[]) || [])
    })
  }, [])

  const heatmap90 = useMemo(() => {
    const result: { date: string; seconds: number }[] = []
    const dataMap = new Map(heatmapFullData.map(d => [d.date, d.total_seconds]))
    for (let i = 89; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      result.push({ date: dateStr, seconds: dataMap.get(dateStr) || 0 })
    }
    return result
  }, [heatmapFullData])

  const heatmapMax = Math.max(...heatmap90.map(d => d.seconds), 1)

  function getHeatColor(seconds: number): string {
    if (seconds === 0) return 'rgba(255,255,255,0.03)'
    const intensity = Math.min(1, seconds / heatmapMax)
    if (intensity < 0.25) return 'rgba(0,255,136,0.15)'
    if (intensity < 0.5) return 'rgba(0,255,136,0.3)'
    if (intensity < 0.75) return 'rgba(0,255,136,0.5)'
    return 'rgba(0,255,136,0.75)'
  }

  // Arrange heatmap into weeks (columns) of 7 days
  const weeks: { date: string; seconds: number }[][] = []
  for (let i = 0; i < heatmap90.length; i += 7) {
    weeks.push(heatmap90.slice(i, i + 7))
  }

  if (loading) {
    return (
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
        <p className="text-[10px] text-gray-500 font-mono animate-pulse">Loading trends...</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Bar chart */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
        <div className="flex items-center justify-between mb-2.5">
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Daily Grind Time</p>
          <div className="flex gap-1">
            {(['7d', '30d'] as TrendRange[]).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-colors ${
                  range === r ? 'bg-cyber-neon/15 text-cyber-neon border border-cyber-neon/30' : 'text-gray-600 hover:text-gray-400'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Summary stats */}
        <div className="flex gap-3 mb-3">
          <div>
            <p className="text-[9px] text-gray-600 font-mono">Total</p>
            <p className="text-xs font-mono font-bold text-cyber-neon">{formatDuration(totalPeriodSeconds)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 font-mono">Avg/day</p>
            <p className="text-xs font-mono font-bold text-white">{formatDuration(avgDailySeconds)}</p>
          </div>
          <div>
            <p className="text-[9px] text-gray-600 font-mono">Sessions</p>
            <p className="text-xs font-mono font-bold text-white">{totalPeriodSessions}</p>
          </div>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-[2px] h-20">
          {filledData.map((d, i) => {
            const pct = (d.total_seconds / maxSeconds) * 100
            return (
              <div
                key={d.date}
                className="flex-1 flex flex-col items-center group relative"
                title={`${getShortDate(d.date)}: ${formatDuration(d.total_seconds)} (${d.sessions_count} sessions)`}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(pct, d.total_seconds > 0 ? 4 : 1)}%` }}
                  transition={{ duration: 0.4, delay: i * 0.02 }}
                  className={`w-full rounded-t-sm ${
                    d.total_seconds > 0 ? 'bg-cyber-neon/60 group-hover:bg-cyber-neon/80' : 'bg-white/[0.03]'
                  } transition-colors`}
                />
              </div>
            )
          })}
        </div>
        <div className="flex justify-between mt-1">
          {range === '7d' ? (
            filledData.map((d) => (
              <span key={d.date} className="text-[7px] text-gray-600 font-mono">{getDayLabel(d.date)}</span>
            ))
          ) : (
            <>
              <span className="text-[7px] text-gray-600 font-mono">{getShortDate(filledData[0]?.date || '')}</span>
              <span className="text-[7px] text-gray-600 font-mono">{getShortDate(filledData[Math.floor(filledData.length / 2)]?.date || '')}</span>
              <span className="text-[7px] text-gray-600 font-mono">{getShortDate(filledData[filledData.length - 1]?.date || '')}</span>
            </>
          )}
        </div>
      </div>

      {/* Contribution Heatmap */}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">Grind Heatmap (90 days)</p>
        <div className="flex gap-[2px]">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[2px] flex-1">
              {week.map((day) => (
                <div
                  key={day.date}
                  className="aspect-square rounded-[2px] transition-colors"
                  style={{ backgroundColor: getHeatColor(day.seconds) }}
                  title={`${day.date}: ${formatDuration(day.seconds)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-2">
          <span className="text-[8px] text-gray-600 font-mono">Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ backgroundColor: v === 0 ? 'rgba(255,255,255,0.03)' : `rgba(0,255,136,${v * 0.75})` }}
            />
          ))}
          <span className="text-[8px] text-gray-600 font-mono">More</span>
        </div>
      </div>
    </div>
  )
}
