const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions'

interface ActivityRow {
  app_name: string | null
  window_title: string | null
  category: string | null
  start_time: number
  end_time: number
  keystrokes?: number
}

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  if (m >= 60) {
    const h = Math.floor(m / 60)
    const rm = m % 60
    return `${h}h ${rm}m`
  }
  return `${m}m ${s}s`
}

export async function analyzeSession(
  activities: ActivityRow[],
  durationSeconds: number,
  apiKey: string,
  contextSwitches = 0,
  totalKeystrokes = 0
): Promise<string> {
  // Aggregate by app
  const byApp: Record<string, { sec: number; keys: number }> = {}
  const byCategory: Record<string, number> = {}
  const windowTitles: Record<string, Record<string, number>> = {}

  for (const a of activities) {
    const app = a.app_name || 'Unknown'
    const cat = a.category || 'other'
    const dur = (a.end_time - a.start_time) / 1000
    const keys = a.keystrokes || 0

    if (!byApp[app]) byApp[app] = { sec: 0, keys: 0 }
    byApp[app].sec += dur
    byApp[app].keys += keys
    byCategory[cat] = (byCategory[cat] || 0) + dur

    // Track window titles per app
    const title = a.window_title || ''
    if (title) {
      if (!windowTitles[app]) windowTitles[app] = {}
      windowTitles[app][title] = (windowTitles[app][title] || 0) + dur
    }
  }

  const appLines = Object.entries(byApp)
    .sort((a, b) => b[1].sec - a[1].sec)
    .slice(0, 12)
    .map(([name, d]) => {
      const pct = durationSeconds > 0 ? Math.round((d.sec / durationSeconds) * 100) : 0
      let line = `${name}: ${fmtDur(d.sec)} (${pct}%)`
      if (d.keys > 0) line += ` [${d.keys} keystrokes]`
      // Top window titles for this app
      const titles = windowTitles[name]
      if (titles) {
        const topTitles = Object.entries(titles)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([t, s]) => `  - "${t.slice(0, 60)}": ${fmtDur(s)}`)
        if (topTitles.length > 0) line += '\n' + topTitles.join('\n')
      }
      return line
    })

  const catLine = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([name, sec]) => {
      const pct = durationSeconds > 0 ? Math.round((sec / durationSeconds) * 100) : 0
      return `${name}: ${pct}%`
    })
    .join(', ')

  const switchRate = durationSeconds > 0 ? (contextSwitches / (durationSeconds / 60)).toFixed(1) : '0'
  const keysPerMin = durationSeconds > 0 ? Math.round(totalKeystrokes / (durationSeconds / 60)) : 0

  const userContent = `Session: ${fmtDur(durationSeconds)} total.
Context switches: ${contextSwitches} (${switchRate}/min).
Keystrokes: ${totalKeystrokes} (${keysPerMin}/min).
Categories: ${catLine}.

App breakdown:
${appLines.join('\n')}

Analyze this.`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are GRINDALYTICS — a sharp, no-BS productivity analyst inside a gamified focus tracker app.
You analyze work/focus sessions and deliver SHORT, punchy verdicts. No fluff. No markdown. No headers. No bullet points.

Reply in EXACTLY 3 short paragraphs separated by blank lines. Each paragraph is 1-2 sentences max.

Paragraph 1 — BEHAVIOR PROFILE: What the user actually did. Be specific — percentages, app names, what they were looking at. Example: "You spent 86% of this session in Dota 2 with a brief 3-minute detour into Cursor. This was a gaming session, not a work session."

Paragraph 2 — PATTERNS: Analyze context switching frequency, sustained focus vs scattered behavior, ADHD-like rapid switching, or locked-in deep work. Use the switch rate and keystroke data. Be direct — "24 context switches in 30 min = scattered" or "zero switches, 400 keystrokes = locked in deep work."

Paragraph 3 — VERDICT: Start with a one-word rating in caps (LOCKED IN / FOCUSED / DECENT / SCATTERED / DISTRACTED / UNFOCUSED / GAMING). Then one sentence on their strongest or weakest point. Be honest but never cruel.`,
        },
        { role: 'user', content: userContent },
      ],
      stream: false,
      max_tokens: 500,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} ${err}`)
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from DeepSeek')
  return text
}

/** Overview analysis across multiple sessions for a time period. */
export interface OverviewData {
  totalSessions: number
  totalSeconds: number
  contextSwitches: number
  totalKeystrokes: number
  appUsage: { app_name: string; category: string; total_ms: number }[]
  categoryStats: { category: string; total_ms: number }[]
  windowTitles: { app_name: string; window_title: string; total_ms: number }[]
  periodLabel: string
}

export async function analyzeOverview(data: OverviewData, apiKey: string): Promise<string> {
  const totalMs = data.totalSeconds * 1000
  const totalCatMs = data.categoryStats.reduce((s, c) => s + c.total_ms, 0)

  const catLine = data.categoryStats
    .map((c) => {
      const pct = totalCatMs > 0 ? Math.round((c.total_ms / totalCatMs) * 100) : 0
      return `${c.category}: ${pct}% (${fmtDur(c.total_ms / 1000)})`
    })
    .join(', ')

  const appLines = data.appUsage.slice(0, 15).map((a) => {
    const pct = totalCatMs > 0 ? Math.round((a.total_ms / totalCatMs) * 100) : 0
    let line = `${a.app_name} [${a.category}]: ${fmtDur(a.total_ms / 1000)} (${pct}%)`
    const titles = data.windowTitles
      .filter((w) => w.app_name === a.app_name)
      .slice(0, 3)
    if (titles.length > 0) {
      line += '\n' + titles.map((t) => `  - "${t.window_title.slice(0, 60)}": ${fmtDur(t.total_ms / 1000)}`).join('\n')
    }
    return line
  })

  const switchRate = data.totalSeconds > 0 ? (data.contextSwitches / (data.totalSeconds / 60)).toFixed(1) : '0'
  const keysPerMin = data.totalSeconds > 0 ? Math.round(data.totalKeystrokes / (data.totalSeconds / 60)) : 0

  const userContent = `Period: ${data.periodLabel}.
Sessions: ${data.totalSessions}, total time: ${fmtDur(data.totalSeconds)}.
Context switches: ${data.contextSwitches} (${switchRate}/min avg).
Keystrokes: ${data.totalKeystrokes} (${keysPerMin}/min avg).
Categories: ${catLine}.

Top apps:
${appLines.join('\n')}

Analyze my behavior over this period.`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: `You are GRINDALYTICS — a sharp productivity analyst inside a gamified focus tracker.
You analyze OVERALL behavior across multiple sessions and deliver a detailed but punchy report. No markdown. No headers.

Reply in EXACTLY 4 short paragraphs separated by blank lines. Each paragraph is 2-3 sentences max.

Paragraph 1 — PROFILE: Describe the user's overall behavior pattern. What are they — a coder? a gamer? a multitasker? What apps/sites dominate their time? Be specific with names, percentages, hours.

Paragraph 2 — DISTRACTIONS: Identify their top distractions and time sinks. Which apps pull them away from productive work? How much time goes to messaging, social media, games? Name the specific apps. If they chat a lot — say so. If they game too much — say so. Be direct.

Paragraph 3 — STRENGTHS & WEAKNESSES: What are they good at? Sustained deep work? Quick task switching? What's their weak spot — context switching too often, getting pulled into messengers, gaming sessions that eat hours? Mention ADHD-like patterns if switching is rapid, or praise deep focus if they stay locked in.

Paragraph 4 — VERDICT: Rate overall as one word in caps (ELITE / LOCKED IN / PRODUCTIVE / DECENT / SCATTERED / DISTRACTED / UNFOCUSED). Then 1-2 sentences of actionable advice — what ONE thing they should change to level up. Be honest, direct, but encouraging.`,
        },
        { role: 'user', content: userContent },
      ],
      stream: false,
      max_tokens: 700,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} ${err}`)
  }

  const result = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const text = result.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('Empty response from DeepSeek')
  return text
}

export interface LabelRefineInput {
  app_name: string
  window_title: string
  current_category: string
}

export interface LabelRefineOutput {
  app_name: string
  window_title: string
  refined_category: string
  confidence: number
  reason: string
}

export async function refineActivityLabels(items: LabelRefineInput[], apiKey: string): Promise<LabelRefineOutput[]> {
  if (items.length === 0) return []
  const compact = items.slice(0, 25).map((it, idx) => ({
    idx,
    app: it.app_name,
    title: it.window_title.slice(0, 140),
    current: it.current_category,
  }))

  const userContent = `Classify each item by browser activity context.
Allowed categories: coding, design, learning, social, music, browsing, games, creative, other.
Return strict JSON array, each item:
{"idx":number,"refined_category":string,"confidence":number,"reason":string}

Items:
${JSON.stringify(compact)}`

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: 'You classify ambiguous app/window titles for productivity tracking. Respond only with valid JSON array. No markdown.',
        },
        { role: 'user', content: userContent },
      ],
      stream: false,
      max_tokens: 700,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`DeepSeek API error: ${res.status} ${err}`)
  }

  const result = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  const content = result.choices?.[0]?.message?.content?.trim()
  if (!content) throw new Error('Empty response from DeepSeek')

  const normalized = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
  const parsed = JSON.parse(normalized) as { idx: number; refined_category: string; confidence?: number; reason?: string }[]
  const allowed = new Set(['coding', 'design', 'learning', 'social', 'music', 'browsing', 'games', 'creative', 'other'])
  return parsed
    .filter((r) => Number.isInteger(r.idx) && r.idx >= 0 && r.idx < compact.length && allowed.has(r.refined_category))
    .map((r) => ({
      app_name: items[r.idx].app_name,
      window_title: items[r.idx].window_title,
      refined_category: r.refined_category,
      confidence: Math.max(0, Math.min(1, typeof r.confidence === 'number' ? r.confidence : 0.7)),
      reason: (r.reason || 'AI context refinement').slice(0, 160),
    }))
}
