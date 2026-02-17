const SESSION_TAG_RE = /\s*\[session:(\d{10,})\]\s*$/i
const APP_SEP = ' · '

export interface ParsedFriendPresence {
  activityLabel: string
  appName: string | null
  sessionStartMs: number | null
}

export function buildPresenceActivity(
  presenceLabel: string | null,
  isSessionActive: boolean,
  appName: string | null,
  sessionStartTime: number | null,
): string | null {
  if (!isSessionActive) return null

  let base: string | null = null
  if (presenceLabel) {
    base = appName ? `${presenceLabel}${APP_SEP}${appName}` : presenceLabel
  } else if (appName) {
    base = appName
  }
  if (!base) return null

  if (sessionStartTime && Number.isFinite(sessionStartTime) && sessionStartTime > 0) {
    return `${base} [session:${Math.floor(sessionStartTime)}]`
  }
  return base
}

export function parseFriendPresence(raw: string | null): ParsedFriendPresence {
  if (!raw) return { activityLabel: '', appName: null, sessionStartMs: null }

  const match = raw.match(SESSION_TAG_RE)
  const sessionStartMs = match ? Number(match[1]) : null
  const clean = raw.replace(SESSION_TAG_RE, '').trim()

  const idx = clean.indexOf(APP_SEP)
  if (idx >= 0) {
    return {
      activityLabel: clean.slice(0, idx).trim(),
      appName: clean.slice(idx + APP_SEP.length).trim() || null,
      sessionStartMs,
    }
  }
  return { activityLabel: clean, appName: null, sessionStartMs }
}

export function formatSessionDurationCompact(startMs: number, nowMs = Date.now()): string {
  const diff = Math.max(0, Math.floor((nowMs - startMs) / 1000))
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${diff}s`
}

