import { useSessionStore } from '../../stores/sessionStore'
import { categoryToSkillId, getSkillById } from '../../lib/skills'

export function CurrentActivity() {
  const currentActivity = useSessionStore((s) => s.currentActivity)
  const sessionSkillXP = useSessionStore((s) => s.sessionSkillXP)
  const status = useSessionStore((s) => s.status)
  const isBrowser = typeof window === 'undefined' || !window.electronAPI

  if (isBrowser) {
    return (
      <div className="w-full max-w-xs rounded-xl px-4 py-3 border border-sky-400/25 bg-gradient-to-r from-sky-950/40 to-sky-900/20 shadow-[0_0_20px_rgba(56,189,248,0.08)]">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-sky-200 text-sm font-medium">Browser Mode</p>
            <p className="text-sky-400/70 text-xs">window detection works in desktop app</p>
          </div>
        </div>
      </div>
    )
  }

  const isUnknown = !currentActivity || currentActivity.appName === 'Unknown' || currentActivity.windowTitle === 'Detecting...'

  if (!currentActivity || isUnknown) {
    return (
      <div className="w-full max-w-xs rounded-xl bg-discord-card/60 border border-white/5 px-4 py-3 text-center">
        <p className="text-gray-500 text-xs font-mono">detecting window...</p>
      </div>
    )
  }

  const skillId = categoryToSkillId(currentActivity.category)
  const skill = getSkillById(skillId)
  const skillLabel = skill ? skill.name : 'Grinding'
  const xpThisSession = status === 'running' ? (sessionSkillXP[skillId] ?? 0) : 0
  const title = currentActivity.windowTitle
    ? currentActivity.windowTitle.slice(0, 35) + (currentActivity.windowTitle.length > 35 ? '...' : '')
    : ''

  return (
    <div className="w-full max-w-xs rounded-xl bg-discord-card/90 border border-cyber-neon/20 px-4 py-3 shadow-[0_0_16px_rgba(0,255,136,0.06)]">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{skill?.icon ?? '📱'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-cyber-neon/95 text-sm font-medium truncate">Leveling {skillLabel}</p>
            {xpThisSession > 0 && (
              <span className="text-[11px] font-mono text-gray-400">+{xpThisSession} XP</span>
            )}
          </div>
          <p className="text-gray-400 text-xs truncate">{currentActivity.appName}{title ? ` · ${title}` : ''}</p>
        </div>
      </div>
    </div>
  )
}
