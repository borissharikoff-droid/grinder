export interface SessionCoachGoal {
  target_seconds: number
  target_category: string | null
  period: 'daily'
  reason: string
}

export interface SessionCoachSummary {
  focusEater: string
  deepWork: string
  tomorrow: string
  suggestedGoal: SessionCoachGoal
}

interface SegmentInput {
  category: string
  appName?: string
  startTime: number
  endTime: number
}

const FOCUS_CATEGORIES = new Set(['coding', 'design', 'creative', 'learning'])
const DISTRACTION_CATEGORIES = new Set(['social', 'games', 'other'])

const CATEGORY_LABEL: Record<string, string> = {
  coding: 'Coding',
  design: 'Design',
  creative: 'Creative work',
  learning: 'Learning',
  social: 'Social apps',
  games: 'Games',
  other: 'Misc apps',
  browsing: 'Browsing',
  music: 'Music',
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${Math.max(1, Math.floor(seconds))}s`
}

export function generateSessionCoach(segments: SegmentInput[]): SessionCoachSummary {
  if (!segments.length) {
    return {
      focusEater: 'No distraction data for this session.',
      deepWork: 'No deep-work block was detected yet.',
      tomorrow: 'Start with one 25m focused block to build momentum.',
      suggestedGoal: {
        period: 'daily',
        target_seconds: 25 * 60,
        target_category: null,
        reason: 'Build consistency with one short focus block.',
      },
    }
  }

  const totals: Record<string, number> = {}
  let totalSec = 0
  let longestFocusSec = 0
  let currentFocusSec = 0
  let topFocusCategory: string | null = null
  let topFocusSec = 0

  for (const seg of segments) {
    const sec = Math.max(0, Math.floor((seg.endTime - seg.startTime) / 1000))
    if (sec <= 0) continue
    totalSec += sec
    totals[seg.category] = (totals[seg.category] || 0) + sec

    if (FOCUS_CATEGORIES.has(seg.category)) {
      currentFocusSec += sec
      if (currentFocusSec > longestFocusSec) longestFocusSec = currentFocusSec
      if ((totals[seg.category] || 0) > topFocusSec) {
        topFocusSec = totals[seg.category] || 0
        topFocusCategory = seg.category
      }
    } else {
      currentFocusSec = 0
    }
  }

  const distractionEntries = Object.entries(totals)
    .filter(([cat]) => DISTRACTION_CATEGORIES.has(cat) || cat === 'browsing')
    .sort((a, b) => b[1] - a[1])
  const [topDistrCat, topDistrSec] = distractionEntries[0] || ['other', 0]
  const distractionPct = totalSec > 0 ? Math.round((topDistrSec / totalSec) * 100) : 0

  const focusEater = topDistrSec > 0
    ? `${CATEGORY_LABEL[topDistrCat] || topDistrCat} consumed ${formatDuration(topDistrSec)} (${distractionPct}%).`
    : 'Distractions stayed low in this session.'

  const deepWork = longestFocusSec >= 20 * 60
    ? `Best deep-work streak: ${formatDuration(longestFocusSec)} without major switches.`
    : `Longest focused streak was ${formatDuration(longestFocusSec)}. Try pushing to 25m.`

  let suggested: SessionCoachGoal
  if (topDistrSec > totalSec * 0.35) {
    suggested = {
      period: 'daily',
      target_seconds: 90 * 60,
      target_category: topFocusCategory,
      reason: 'Recover focus with a protected 90m block.',
    }
  } else if (longestFocusSec < 20 * 60) {
    suggested = {
      period: 'daily',
      target_seconds: 25 * 60,
      target_category: topFocusCategory,
      reason: 'Stabilize attention with one Pomodoro block.',
    }
  } else {
    suggested = {
      period: 'daily',
      target_seconds: 120 * 60,
      target_category: topFocusCategory,
      reason: 'Extend your strongest focus pattern tomorrow.',
    }
  }

  const targetLabel = suggested.target_category ? (CATEGORY_LABEL[suggested.target_category] || suggested.target_category) : 'focus'
  const tomorrow = `Plan for tomorrow: ${formatDuration(suggested.target_seconds)} of ${targetLabel.toLowerCase()}.`

  return {
    focusEater,
    deepWork,
    tomorrow,
    suggestedGoal: suggested,
  }
}

