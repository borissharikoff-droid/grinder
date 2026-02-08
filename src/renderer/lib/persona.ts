export interface PersonaResult {
  id: string
  label: string
  emoji: string
  description: string
}

const PERSONAS: PersonaResult[] = [
  { id: 'developer', label: 'Developer', emoji: '💻', description: 'Code is your language' },
  { id: 'creative', label: 'Creative', emoji: '🎨', description: 'Design & create' },
  { id: 'gamer', label: 'Gamer', emoji: '🎮', description: 'Play to win' },
  { id: 'social', label: 'Social Connector', emoji: '💬', description: 'Always connected' },
  { id: 'explorer', label: 'Explorer', emoji: '🌐', description: 'Curious by nature' },
  { id: 'music_lover', label: 'Music Lover', emoji: '🎵', description: 'Vibes on point' },
  { id: 'grinder', label: 'Grinder', emoji: '⚡', description: 'Pure focus energy' },
]

/**
 * Detect persona from category distribution
 * @param categories - { category: string; total_ms: number }[]
 */
export function detectPersona(
  categories: { category: string; total_ms: number }[]
): PersonaResult {
  if (categories.length === 0) return PERSONAS[6] // default: grinder

  const total = categories.reduce((sum, c) => sum + c.total_ms, 0)
  if (total === 0) return PERSONAS[6]

  const byCategory: Record<string, number> = {}
  for (const c of categories) {
    byCategory[c.category] = (byCategory[c.category] || 0) + c.total_ms
  }

  const pct = (cat: string) => ((byCategory[cat] || 0) / total) * 100

  // Determine dominant persona
  if (pct('coding') >= 40) return PERSONAS[0] // developer
  if (pct('games') >= 30) return PERSONAS[2]  // gamer
  if (pct('social') >= 30) return PERSONAS[3]  // social
  if (pct('music') >= 25) return PERSONAS[5]  // music lover
  if (pct('browsing') >= 40) return PERSONAS[4] // explorer

  // Mixed — return grinder
  return PERSONAS[6]
}

export interface Insight {
  icon: string
  text: string
  type: 'tip' | 'praise' | 'warning' | 'info'
}

/**
 * Generate smart, brief insights from activity data
 */
export function generateInsights(params: {
  appUsage: { app_name: string; category: string; total_ms: number }[]
  categoryStats: { category: string; total_ms: number }[]
  contextSwitches: number
  totalSessions: number
  totalSeconds: number
  streak: number
}): Insight[] {
  const { appUsage, categoryStats, contextSwitches, totalSessions, totalSeconds, streak } = params
  const insights: Insight[] = []
  const totalMs = categoryStats.reduce((s, c) => s + c.total_ms, 0)

  if (totalMs === 0 || totalSessions === 0) return insights

  const avgSessionMin = Math.round(totalSeconds / totalSessions / 60)

  // Category percentages
  const catPct: Record<string, number> = {}
  for (const c of categoryStats) {
    catPct[c.category] = (c.total_ms / totalMs) * 100
  }

  // Context switch insight
  const switchesPerSession = totalSessions > 0 ? contextSwitches / totalSessions : 0
  if (switchesPerSession > 15) {
    insights.push({
      icon: '🔄',
      text: `${Math.round(switchesPerSession)} app switches per session — try to stay in one app longer`,
      type: 'warning',
    })
  } else if (switchesPerSession < 5 && totalSessions >= 2) {
    insights.push({
      icon: '🎯',
      text: 'Deep focus king — barely any app switching',
      type: 'praise',
    })
  }

  // Coding insight
  if ((catPct.coding || 0) >= 50) {
    insights.push({
      icon: '💻',
      text: `${Math.round(catPct.coding)}% coding — you're locked in`,
      type: 'praise',
    })
  } else if ((catPct.coding || 0) > 0 && (catPct.coding || 0) < 20) {
    insights.push({
      icon: '⌨️',
      text: `Only ${Math.round(catPct.coding || 0)}% coding — if you want to ship, code more`,
      type: 'tip',
    })
  }

  // Social overuse
  if ((catPct.social || 0) >= 30) {
    insights.push({
      icon: '💬',
      text: `${Math.round(catPct.social)}% on socials — maybe mute notifications?`,
      type: 'warning',
    })
  }

  // Gaming during grind
  if ((catPct.games || 0) >= 20) {
    insights.push({
      icon: '🎮',
      text: `${Math.round(catPct.games)}% gaming during grind — no judgment, but focus diff`,
      type: 'tip',
    })
  }

  // Music
  if ((catPct.music || 0) >= 10 && (catPct.music || 0) < 40) {
    insights.push({
      icon: '🎵',
      text: 'Music on while grinding — nice flow state',
      type: 'praise',
    })
  }

  // Top app dominance
  if (appUsage.length > 0) {
    const topApp = appUsage[0]
    const topPct = (topApp.total_ms / totalMs) * 100
    if (topPct >= 60) {
      insights.push({
        icon: '🏠',
        text: `${topApp.app_name} is your home — ${Math.round(topPct)}% of grind time`,
        type: 'info',
      })
    }
  }

  // Session length
  if (avgSessionMin >= 60) {
    insights.push({
      icon: '⏱️',
      text: `Avg ${avgSessionMin}min per session — marathon grinder`,
      type: 'praise',
    })
  } else if (avgSessionMin < 15 && totalSessions >= 3) {
    insights.push({
      icon: '⏱️',
      text: `Avg ${avgSessionMin}min sessions — try longer grinds for deeper focus`,
      type: 'tip',
    })
  }

  // Streak
  if (streak >= 7) {
    insights.push({
      icon: '🔥',
      text: `${streak}-day streak — unstoppable`,
      type: 'praise',
    })
  } else if (streak >= 2) {
    insights.push({
      icon: '🔥',
      text: `${streak}-day streak — keep the momentum`,
      type: 'info',
    })
  }

  return insights.slice(0, 4) // max 4 insights
}
