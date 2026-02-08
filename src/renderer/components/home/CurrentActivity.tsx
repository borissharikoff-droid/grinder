import { useSessionStore } from '../../stores/sessionStore'
import { categoryToSkillId, getSkillById } from '../../lib/skills'

export function CurrentActivity() {
  const currentActivity = useSessionStore((s) => s.currentActivity)
  const isBrowser = typeof window === 'undefined' || !window.electronAPI

  if (isBrowser) {
    return (
      <div className="w-full max-w-xs rounded-xl bg-discord-card/60 border border-white/5 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">🌐</span>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium">Browser Mode</p>
            <p className="text-gray-500 text-xs">window detection works in desktop app</p>
          </div>
        </div>
      </div>
    )
  }

  if (!currentActivity) {
    return (
      <div className="w-full max-w-xs rounded-xl bg-discord-card/60 border border-white/5 px-4 py-3 text-center">
        <p className="text-gray-500 text-xs font-mono">detecting window...</p>
      </div>
    )
  }

  const skillId = categoryToSkillId(currentActivity.category)
  const skill = getSkillById(skillId)
  const skillLabel = skill ? skill.name : 'Grinding'
  const title = currentActivity.windowTitle
    ? currentActivity.windowTitle.slice(0, 35) + (currentActivity.windowTitle.length > 35 ? '...' : '')
    : ''

  return (
    <div className="w-full max-w-xs rounded-xl bg-discord-card border border-white/5 px-4 py-3">
      <div className="flex items-center gap-2.5">
        <span className="text-lg">{skill?.icon ?? '📱'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-medium truncate">Leveling {skillLabel}</p>
          <p className="text-gray-500 text-xs truncate">{currentActivity.appName}{title ? ` · ${title}` : ''}</p>
        </div>
      </div>
    </div>
  )
}
