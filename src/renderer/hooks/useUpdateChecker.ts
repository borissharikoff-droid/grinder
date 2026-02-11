import { useEffect } from 'react'
import { useNotificationStore } from '../stores/notificationStore'

const CURRENT_VERSION = __APP_VERSION__
const CHECK_URL = 'https://raw.githubusercontent.com/borissharikoff-droid/Idly/main/package.json'
const RELEASES_URL = 'https://github.com/borissharikoff-droid/Idly/releases'
const CHECK_INTERVAL_MS = 60 * 60 * 1000 // 1 hour

function isNewer(remote: string, local: string): boolean {
  const r = remote.split('.').map(Number)
  const l = local.split('.').map(Number)
  for (let i = 0; i < Math.max(r.length, l.length); i++) {
    if ((r[i] ?? 0) > (l[i] ?? 0)) return true
    if ((r[i] ?? 0) < (l[i] ?? 0)) return false
  }
  return false
}

async function checkForUpdate() {
  try {
    const res = await fetch(CHECK_URL, { cache: 'no-store' })
    if (!res.ok) return
    const data = await res.json()
    const remoteVersion = data.version as string
    if (!remoteVersion) return

    if (isNewer(remoteVersion, CURRENT_VERSION)) {
      const store = useNotificationStore.getState()
      // Don't duplicate update notifications
      const alreadyNotified = store.items.some(
        (n) => n.type === 'update' && n.body.includes(remoteVersion)
      )
      if (!alreadyNotified) {
        store.push({
          type: 'update',
          icon: '🆕',
          title: `Update v${remoteVersion} available`,
          body: `New version v${remoteVersion} is out. Current: v${CURRENT_VERSION}`,
          url: RELEASES_URL,
        })
      }
    }
  } catch {
    // Network error — silently ignore
  }
}

export function useUpdateChecker() {
  useEffect(() => {
    // Check on startup (with small delay to not block render)
    const timeout = setTimeout(checkForUpdate, 5000)
    // Re-check periodically
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS)
    return () => { clearTimeout(timeout); clearInterval(interval) }
  }, [])
}
