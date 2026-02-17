import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SessionDetail } from './SessionDetail'
import { TrendsChart } from './TrendsChart'
import { OverviewAnalysis } from './OverviewAnalysis'
import { detectPersona, generateInsights } from '../../lib/persona'
import type { Insight } from '../../lib/persona'
import { MOTION } from '../../lib/motion'
import { CATEGORY_COLORS, CATEGORY_EMOJI, CATEGORY_LABELS } from '../../lib/uiConstants'
import { PageLoading } from '../shared/PageLoading'
import { EmptyState } from '../shared/EmptyState'

export interface SessionRecord {
  id: string
  start_time: number
  end_time: number
  duration_seconds: number
  summary: string | null
}

interface AppStat {
  app_name: string
  category: string
  total_ms: number
}

interface CatStat {
  category: string
  total_ms: number
}

interface WindowStat {
  app_name: string
  window_title: string
  category: string
  total_ms: number
}

interface HourlyStat {
  hour: number
  total_ms: number
}

interface SiteStat {
  domain: string
  total_ms: number
  sample_title: string
}

interface FocusBlock {
  start_time: number
  end_time: number
  total_seconds: number
  dominant_app: string
  categories: string[]
}

interface DistractionMetrics {
  distraction_seconds: number
  focus_seconds: number
  distraction_switches: number
  longest_focus_minutes: number
  top_distractions: { app_name: string; total_seconds: number }[]
}

interface PeriodComparison {
  current: { total_seconds: number; sessions_count: number; total_keystrokes: number }
  previous: { total_seconds: number; sessions_count: number; total_keystrokes: number }
}

interface RefinedLabel {
  app_name: string
  window_title: string
  refined_category: string
  confidence: number
  reason: string
}

/** Exclude the Idly app from stats */
function isIdlyApp(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  const n = name.toLowerCase()
  return n.includes('grinder') || n.includes('idly') || n === 'grind tracker' || n === 'grind_tracker'
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatMs(ms: number): string {
  return formatDuration(Math.round(ms / 1000))
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}

type TimeFilter = 'today' | 'week' | 'all'

function getFilterMs(filter: TimeFilter): number {
  if (filter === 'today') {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  if (filter === 'week') return Date.now() - 7 * 86400000
  return 0
}

function getPeriodLabel(filter: TimeFilter): string {
  if (filter === 'today') return 'Today'
  if (filter === 'week') return 'Last 7 days'
  return 'Last 30 days'
}

function getComparisonWindow(filter: TimeFilter): {
  currentSince: number
  currentUntil: number
  previousSince: number
  previousUntil: number
} {
  const now = Date.now()
  if (filter === 'today') {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const currentSince = start.getTime()
    const previousSince = currentSince - 86400000
    return { currentSince, currentUntil: now, previousSince, previousUntil: currentSince }
  }
  if (filter === 'week') {
    const currentSince = now - 7 * 86400000
    const previousSince = currentSince - 7 * 86400000
    return { currentSince, currentUntil: now, previousSince, previousUntil: currentSince }
  }
  const currentSince = now - 30 * 86400000
  const previousSince = currentSince - 30 * 86400000
  return { currentSince, currentUntil: now, previousSince, previousUntil: currentSince }
}

function toPct(v: number, total: number): number {
  if (!total) return 0
  return Math.round((v / total) * 100)
}

function buildSessionStory(session: SessionRecord): string {
  const start = new Date(session.start_time)
  const hour = start.getHours()
  const mood = hour < 12 ? 'Morning session' : hour < 18 ? 'Daytime session' : 'Evening session'
  const length = session.duration_seconds >= 3600 ? 'long push' : session.duration_seconds >= 1800 ? 'solid block' : 'short sprint'
  return `${mood}: ${length} (${formatDuration(session.duration_seconds)}).`
}

function buildPersonaTooltip(
  persona: { emoji: string; label: string; description: string },
  categories: { category: string; total_ms: number }[],
): string {
  const total = categories.reduce((sum, c) => sum + c.total_ms, 0)
  if (total <= 0) {
    return `${persona.emoji} ${persona.label}: persona based on your activity category distribution (coding/design/social/etc.).`
  }
  const top = [...categories]
    .sort((a, b) => b.total_ms - a.total_ms)
    .slice(0, 3)
    .map((c) => `${c.category}: ${Math.round((c.total_ms / total) * 100)}%`)
    .join(', ')
  return `${persona.emoji} ${persona.label}. Calculated from time distribution by categories. Top categories: ${top}.`
}

const PERSONA_RULES_TEXT = [
  'Available statuses and rules:',
  '💻 Developer - coding >= 40%',
  '🎨 Creative - creative >= 25%',
  '🎮 Gamer - games >= 30%',
  '💬 Social Connector - social >= 30%',
  '🌐 Explorer - browsing >= 40%',
  '🎵 Music Lover - music >= 25%',
  '📚 Scholar - learning >= 25%',
  '⚡ Idly - mixed activity (when no rule above matches)',
]

export function StatsPage() {
  const [sessions, setSessions] = useState<SessionRecord[]>([])
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TimeFilter>('all')

  const [totalSessions, setTotalSessions] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [appUsage, setAppUsage] = useState<AppStat[]>([])
  const [categoryStats, setCategoryStats] = useState<CatStat[]>([])
  const [contextSwitches, setContextSwitches] = useState(0)
  const [streak, setStreak] = useState(0)
  const [insights, setInsights] = useState<Insight[]>([])
  const [windowStats, setWindowStats] = useState<WindowStat[]>([])
  const [hourly, setHourly] = useState<HourlyStat[]>([])
  const [totalKeystrokes, setTotalKeystrokes] = useState(0)
  const [siteUsage, setSiteUsage] = useState<SiteStat[]>([])
  const [focusBlocks, setFocusBlocks] = useState<FocusBlock[]>([])
  const [distractionMetrics, setDistractionMetrics] = useState<DistractionMetrics | null>(null)
  const [periodComparison, setPeriodComparison] = useState<PeriodComparison | null>(null)
  const [aiRefineEnabled, setAiRefineEnabled] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiRefined, setAiRefined] = useState<RefinedLabel[]>([])
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const loadData = async (resetPage = true) => {
    setLoading(true)
    const sinceMs = getFilterMs(filter)
    const comparison = getComparisonWindow(filter)
    const api = window.electronAPI
    const pageOffset = resetPage ? 0 : offset

    if (api?.db) {
      const [sessionsData, apps, cats, switches, sessionCount, secs, streakVal, winStats, hourlyData, keys, sites, blocks, distraction, comparisonData] = await Promise.all([
        api.db.getSessionsPage(20, pageOffset, sinceMs),
        api.db.getAppUsageStats(sinceMs),
        api.db.getCategoryStats(sinceMs),
        api.db.getContextSwitchCount(sinceMs),
        api.db.getSessionCount(sinceMs),
        api.db.getTotalSeconds(sinceMs),
        api.db.getStreak(),
        api.db.getWindowTitleStats(sinceMs),
        api.db.getHourlyDistribution(sinceMs),
        api.db.getTotalKeystrokes(sinceMs),
        api.db.getSiteUsageStats(sinceMs),
        api.db.getFocusBlocks(sinceMs, 20),
        api.db.getDistractionMetrics(sinceMs),
        api.db.getPeriodComparison(comparison.currentSince, comparison.currentUntil, comparison.previousSince, comparison.previousUntil),
      ])

      const pageSessions = (sessionsData as SessionRecord[]) || []
      const filteredSessions = sinceMs > 0 ? pageSessions.filter((s) => s.start_time >= sinceMs) : pageSessions

      if (resetPage) {
        setSessions(filteredSessions)
        setOffset(filteredSessions.length)
      } else {
        setSessions((prev) => [...prev, ...filteredSessions])
        setOffset((prev) => prev + filteredSessions.length)
      }
      setHasMore(filteredSessions.length >= 20)
      const filteredApps = ((apps as AppStat[]) || []).filter((a) => !isIdlyApp(a.app_name))
      setAppUsage(filteredApps)
      setCategoryStats((cats as CatStat[]) || [])
      setContextSwitches(switches as number)
      setTotalSessions(sessionCount as number)
      setTotalSeconds(secs as number)
      setStreak(streakVal as number)
      setWindowStats(((winStats as WindowStat[]) || []).filter((w) => !isIdlyApp(w.app_name)))
      setHourly((hourlyData as HourlyStat[]) || [])
      setTotalKeystrokes(keys as number)
      setSiteUsage((sites as SiteStat[]) || [])
      setFocusBlocks((blocks as FocusBlock[]) || [])
      setDistractionMetrics((distraction as DistractionMetrics) || null)
      setPeriodComparison((comparisonData as PeriodComparison) || null)

      setInsights(generateInsights({
        appUsage: filteredApps,
        categoryStats: (cats as CatStat[]) || [],
        contextSwitches: switches as number,
        totalSessions: sessionCount as number,
        totalSeconds: secs as number,
        streak: streakVal as number,
      }))
    } else {
      try {
        const stored = JSON.parse(localStorage.getItem('idly_sessions') || '[]') as SessionRecord[]
        const filtered = sinceMs > 0 ? stored.filter((s) => s.start_time >= sinceMs) : stored
        setSessions(filtered)
        setTotalSessions(filtered.length)
        setTotalSeconds(filtered.reduce((sum, s) => sum + s.duration_seconds, 0))
      } catch { /* ignore */ }
    }
    setLoading(false)
  }

  useEffect(() => { loadData(true) }, [filter])

  const persona = detectPersona(categoryStats)
  const totalCatMs = categoryStats.reduce((s, c) => s + c.total_ms, 0)
  const avgSessionMin = totalSessions > 0 ? Math.round(totalSeconds / totalSessions / 60) : 0
  const focusSeconds = distractionMetrics?.focus_seconds || 0
  const distractionSeconds = distractionMetrics?.distraction_seconds || 0
  const trackableSeconds = focusSeconds + distractionSeconds
  const focusScore = toPct(focusSeconds, trackableSeconds)
  const distractionScore = toPct(distractionSeconds, trackableSeconds)
  const comparisonDelta = useMemo(() => {
    if (!periodComparison) return 0
    return periodComparison.current.total_seconds - periodComparison.previous.total_seconds
  }, [periodComparison])
  const personaTooltip = useMemo(
    () => buildPersonaTooltip(persona, categoryStats),
    [persona, categoryStats],
  )
  const browserCandidates = useMemo(() => {
    return windowStats
      .filter((w) => ['browsing', 'other'].includes(w.category))
      .filter((w) => /chrome|edge|firefox|browser|arc|vivaldi|brave/i.test(w.app_name))
      .slice(0, 15)
  }, [windowStats])

  useEffect(() => {
    if (!aiRefineEnabled) return
    if (browserCandidates.length === 0) {
      setAiRefined([])
      return
    }
    const run = async () => {
      const api = window.electronAPI
      if (!api?.ai?.refineActivityLabels) return
      setAiRefining(true)
      try {
        const result = await api.ai.refineActivityLabels(
          browserCandidates.map((row) => ({
            app_name: row.app_name,
            window_title: row.window_title,
            current_category: row.category,
          })),
        )
        setAiRefined((result as RefinedLabel[]) || [])
      } catch {
        setAiRefined([])
      } finally {
        setAiRefining(false)
      }
    }
    run()
  }, [aiRefineEnabled, browserCandidates])

  // Build deep breakdown: category -> apps -> window titles
  const categoryGroups = categoryStats.map((cat) => {
    const apps = appUsage.filter((a) => a.category === cat.category)
    const appsWithTitles = apps.map((app) => {
      const titles = windowStats
        .filter((w) => w.app_name === app.app_name && w.category === cat.category)
        .slice(0, 5)
      return { ...app, titles }
    })
    const pct = totalCatMs > 0 ? (cat.total_ms / totalCatMs) * 100 : 0
    return {
      ...cat,
      pct,
      label: CATEGORY_LABELS[cat.category] || cat.category,
      emoji: CATEGORY_EMOJI[cat.category] || '📱',
      color: CATEGORY_COLORS[cat.category] || CATEGORY_COLORS.other,
      apps: appsWithTitles,
    }
  })

  // Hourly chart data
  const maxHourMs = Math.max(...hourly.map((h) => h.total_ms), 1)

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: MOTION.duration.fast, ease: MOTION.easing }} className="p-4">
        <PageLoading label="Loading stats..." />
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={MOTION.page.initial}
      animate={MOTION.page.animate}
      exit={MOTION.page.exit}
      className="p-4 pb-2 space-y-3"
    >
      <AnimatePresence mode="wait">
        {selectedId ? (
          <motion.div key="detail" initial={MOTION.subPage.initial} animate={MOTION.subPage.animate} exit={MOTION.subPage.exit} transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}>
            <SessionDetail sessionId={selectedId} onBack={() => setSelectedId(null)} />
          </motion.div>
        ) : (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">

            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">Stats</h2>
                {totalSessions > 0 && (
                  <div className="relative group">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-discord-card border border-white/10 text-gray-400 font-mono cursor-help"
                    >
                      {persona.emoji} {persona.label}
                    </span>
                    <div className="pointer-events-none absolute left-0 top-full mt-1.5 z-20 w-72 rounded-lg border border-white/10 bg-discord-dark/95 p-2 text-[10px] leading-relaxed text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity shadow-xl">
                      <p className="text-cyber-neon mb-1">{personaTooltip}</p>
                      {PERSONA_RULES_TEXT.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => loadData(true)} className="w-7 h-7 rounded-lg bg-discord-card border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors" title="Refresh">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                </svg>
              </button>
            </div>

            {/* Time filter */}
            <div className="flex gap-1.5">
              {(['today', 'week', 'all'] as TimeFilter[]).map((f) => (
                <button key={f} onClick={() => setFilter(f)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all ${filter === f ? 'bg-cyber-neon/15 border border-cyber-neon/30 text-cyber-neon' : 'bg-discord-card border border-white/5 text-gray-500 hover:text-white'}`}>
                  {f === 'today' ? 'Today' : f === 'week' ? '7 days' : 'All time'}
                </button>
              ))}
            </div>

            {/* 1/5 Focus Summary */}
            <div className="rounded-xl bg-discord-card border border-white/10 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">1/5 Focus Summary</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Total time</p>
                  <p className="text-white font-mono text-sm">{formatDuration(totalSeconds)}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Focus score</p>
                  <p className="text-cyber-neon font-mono text-sm">{focusScore}%</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Distraction score</p>
                  <p className="text-discord-red font-mono text-sm">{distractionScore}%</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Context switches</p>
                  <p className="text-white font-mono text-sm">{contextSwitches}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 font-mono">
                {totalSessions} sessions, ~{avgSessionMin} min/session, {totalKeystrokes} keys, streak {streak}d.
                {comparisonDelta !== 0 && ` ${comparisonDelta > 0 ? '+' : ''}${Math.round(comparisonDelta / 60)} min vs previous ${getPeriodLabel(filter).toLowerCase()}.`}
              </p>
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Insights</p>
                {insights.map((ins, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * MOTION.stagger.normal }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${
                      ins.type === 'tip' ? 'border-yellow-500/20 bg-yellow-500/5' :
                      ins.type === 'praise' ? 'border-cyber-neon/20 bg-cyber-neon/5' :
                      ins.type === 'warning' ? 'border-discord-red/20 bg-discord-red/5' :
                      'border-discord-accent/20 bg-discord-accent/5'
                    }`}
                  >
                    <span className="text-sm">{ins.icon}</span>
                    <span className="text-xs text-gray-300">{ins.text}</span>
                  </motion.div>
                ))}
              </div>
            )}

            {/* 2/5 Where Time Goes */}
            {categoryGroups.length > 0 && (
              <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2.5">2/5 Where Time Goes</p>

                {/* Timeline bar */}
                <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mb-3">
                  {categoryGroups.filter((c) => c.pct >= 0.5).map((cat) => (
                    <motion.div key={cat.category} initial={{ width: 0 }} animate={{ width: `${cat.pct}%` }} transition={{ duration: MOTION.duration.verySlow, ease: MOTION.easing }} className="h-full rounded-sm" style={{ backgroundColor: cat.color }} />
                  ))}
                </div>

                {/* Category list with nested apps and window titles */}
                <div className="space-y-1">
                  {categoryGroups.map((group, gi) => {
                    const isExpanded = expandedCat === group.category
                    return (
                      <motion.div key={group.category} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: gi * MOTION.stagger.tight }}>
                        <button
                          type="button"
                          onClick={() => setExpandedCat(isExpanded ? null : group.category)}
                          className="w-full flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-white/[0.02] transition-colors text-left"
                        >
                          <span className="text-sm shrink-0">{group.emoji}</span>
                          <span className="text-xs font-semibold text-white flex-1 min-w-0 truncate">{group.label}</span>
                          <span className="text-xs font-mono font-bold shrink-0" style={{ color: group.color }}>{Math.round(group.pct)}%</span>
                          <span className="text-[10px] text-gray-600 font-mono shrink-0 w-14 text-right">{formatMs(group.total_ms)}</span>
                          <span className={`text-gray-600 text-[10px] transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="pl-7 pr-1 pb-2 space-y-1">
                                {group.apps.map((app) => (
                                  <div key={app.app_name}>
                                    <div className="flex items-center gap-2 py-0.5">
                                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: group.color, opacity: 0.5 }} />
                                      <span className="text-[11px] text-gray-300 truncate flex-1 min-w-0">{app.app_name}</span>
                                      <span className="text-[10px] text-gray-500 font-mono shrink-0">{formatMs(app.total_ms)}</span>
                                    </div>
                                    {/* Window titles */}
                                    {app.titles.length > 0 && (
                                      <div className="pl-4 space-y-0.5">
                                        {app.titles.map((t, ti) => (
                                          <div key={ti} className="flex items-center gap-1.5 py-0.5">
                                            <span className="text-[9px] text-gray-700 shrink-0">—</span>
                                            <span className="text-[10px] text-gray-500 truncate flex-1 min-w-0">{t.window_title}</span>
                                            <span className="text-[9px] text-gray-600 font-mono shrink-0">{formatMs(t.total_ms)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    )
                  })}
                </div>

                {siteUsage.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-1.5">Top domains</p>
                    <div className="space-y-1">
                      {siteUsage.slice(0, 6).map((site) => (
                        <div key={site.domain} className="flex items-center gap-2 text-xs">
                          <span className="text-gray-400 flex-1 truncate">{site.domain}</span>
                          <span className="text-gray-600 font-mono">{formatMs(site.total_ms)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-white/5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">Hybrid AI refinement</p>
                    <button
                      onClick={() => setAiRefineEnabled((v) => !v)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono border transition-colors ${
                        aiRefineEnabled
                          ? 'text-cyber-neon border-cyber-neon/30 bg-cyber-neon/10'
                          : 'text-gray-500 border-white/10 hover:text-white'
                      }`}
                    >
                      {aiRefineEnabled ? 'Enabled' : 'Enable'}
                    </button>
                  </div>
                  {aiRefineEnabled && (
                    <>
                      {aiRefining && <p className="text-[10px] text-gray-500 font-mono">Refining ambiguous browser titles...</p>}
                      {!aiRefining && aiRefined.length === 0 && (
                        <p className="text-[10px] text-gray-600 font-mono">No AI refinements yet or API unavailable.</p>
                      )}
                      {!aiRefining && aiRefined.length > 0 && (
                        <div className="space-y-1">
                          {aiRefined.slice(0, 6).map((row, idx) => (
                            <div key={`${row.window_title}-${idx}`} className="text-[10px] text-gray-400">
                              <span className="text-cyber-neon font-mono">{row.refined_category}</span>
                              <span className="text-gray-600"> ({Math.round(row.confidence * 100)}%)</span>
                              <span className="text-gray-500"> - {row.window_title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* 3/5 Distraction Radar */}
            <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">3/5 Distraction Radar</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Distraction time</p>
                  <p className="text-discord-red font-mono text-sm">{formatDuration(distractionSeconds)}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Focus blocks</p>
                  <p className="text-white font-mono text-sm">{focusBlocks.length}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Distraction switches</p>
                  <p className="text-white font-mono text-sm">{distractionMetrics?.distraction_switches || 0}</p>
                </div>
                <div className="rounded-lg border border-white/5 bg-discord-darker/60 p-2">
                  <p className="text-[10px] text-gray-500 font-mono">Longest focus run</p>
                  <p className="text-cyber-neon font-mono text-sm">{distractionMetrics?.longest_focus_minutes || 0}m</p>
                </div>
              </div>
              {distractionMetrics && distractionMetrics.top_distractions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {distractionMetrics.top_distractions.slice(0, 4).map((d) => (
                    <div key={d.app_name} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400 flex-1 truncate">{d.app_name}</span>
                      <span className="text-gray-600 font-mono">{formatDuration(d.total_seconds)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4/5 Session Story */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2">4/5 Session Story</p>
              {sessions.length === 0 ? (
                <EmptyState title="No grinds yet" description="Hit GRIND on Home to start." icon="📊" />
              ) : (
                <div className="space-y-1">
                  {sessions.slice(0, 10).map((s, i) => (
                    <motion.button key={s.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                      onClick={() => setSelectedId(s.id)}
                      className="w-full rounded-lg bg-discord-card/60 border border-white/5 px-3 py-2 hover:border-white/10 transition-colors text-left"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-cyber-neon text-xs font-bold w-12 shrink-0">{formatDuration(s.duration_seconds)}</span>
                        <span className="text-xs text-gray-400 flex-1">{formatDate(s.start_time)}</span>
                        <span className="text-[10px] text-gray-600">{formatTime(s.start_time)}</span>
                        <span className="text-gray-700 text-xs">›</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-1">{buildSessionStory(s)}</p>
                    </motion.button>
                  ))}
                  {hasMore && (
                    <button
                      onClick={() => loadData(false)}
                      className="w-full rounded-lg border border-white/10 bg-discord-card/40 py-2 text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Load more sessions
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 5/5 Trends & Comparisons */}
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">5/5 Trends & Comparisons</p>
              {hourly.length > 0 && (
                <div className="rounded-xl bg-discord-card/80 border border-white/10 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-mono mb-2.5">Hourly Activity</p>
                  <div className="flex items-end gap-0.5 h-12">
                    {Array.from({ length: 24 }, (_, h) => {
                      const data = hourly.find((d) => d.hour === h)
                      const ms = data?.total_ms || 0
                      const pct = maxHourMs > 0 ? (ms / maxHourMs) * 100 : 0
                      return (
                        <div key={h} className="flex-1 h-full flex items-end" title={`${h}:00 — ${formatMs(ms)}`}>
                          <div className="w-full rounded-t-sm bg-cyber-neon/20" style={{ height: `${Math.max(pct, 2)}%` }} />
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[10px] text-gray-600 font-mono">0:00</span>
                    <span className="text-[10px] text-gray-600 font-mono">6:00</span>
                    <span className="text-[10px] text-gray-600 font-mono">12:00</span>
                    <span className="text-[10px] text-gray-600 font-mono">18:00</span>
                    <span className="text-[10px] text-gray-600 font-mono">23:00</span>
                  </div>
                </div>
              )}
              <TrendsChart />
            </div>

            <OverviewAnalysis
              totalSessions={totalSessions}
              totalSeconds={totalSeconds}
              contextSwitches={contextSwitches}
              totalKeystrokes={totalKeystrokes}
              appUsage={appUsage}
              categoryStats={categoryStats}
              windowTitles={windowStats}
              periodLabel={getPeriodLabel(filter)}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
