import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import log from './logger'

/**
 * Initialise auto-updater.
 *
 * electron-updater will check for updates published as GitHub Releases
 * (configured via `publish` in electron-builder.yml).
 *
 * Flow:
 *   1. App starts → checks for update
 *   2. If update available → downloads it silently
 *   3. Notifies the renderer that a restart is needed
 *   4. On next quit the update is installed automatically
 */
export function initAutoUpdater(win: BrowserWindow): void {
  // Send electron-updater logs through our logger
  autoUpdater.logger = log

  // Don't auto-download — let us control the flow
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    log.info('[updater] Checking for update...')
  })

  autoUpdater.on('update-available', (info) => {
    log.info('[updater] Update available:', info.version)
    win.webContents.send('updater:status', { status: 'downloading', version: info.version })
  })

  autoUpdater.on('update-not-available', () => {
    log.info('[updater] App is up to date')
  })

  autoUpdater.on('download-progress', (progress) => {
    log.info(`[updater] Download: ${Math.round(progress.percent)}%`)
  })

  autoUpdater.on('update-downloaded', (info) => {
    log.info('[updater] Update downloaded:', info.version)
    // Tell renderer to show "restart to update" badge
    win.webContents.send('updater:status', { status: 'ready', version: info.version })
  })

  autoUpdater.on('error', (err) => {
    log.error('[updater] Error:', err.message)
  })

  // Check immediately on launch, then every 30 minutes
  autoUpdater.checkForUpdates().catch(() => {})
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {})
  }, 30 * 60 * 1000)
}
