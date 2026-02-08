import 'dotenv/config'
import { app, BrowserWindow, Tray, nativeImage, Notification } from 'electron'
import path from 'path'
import { registerIpcHandlers, setMainWindow, setNotificationSender } from './ipc'
import { startSmartNotifications, stopSmartNotifications } from './notifications'
import { closeDatabase } from './database'
import { initAutoUpdater } from './updater'
import log from './logger'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isQuitting = false
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function createTray() {
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAOklEQVQ4T2NkYGD4z0ABYBzVMKoBBg0wMjAw/IdpwjgwqgEGDTAyMv5nZGT8z8DA8J+BgQE5LAAALpcK0wj+LREAAAAASUVORK5CYII='
  )
  tray = new Tray(icon.resize({ width: 16, height: 16 }))
  tray.setToolTip('Grinder')
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function showNativeNotification(title: string, body: string) {
  if (!Notification.isSupported()) return
  const n = new Notification({ title, body, icon: undefined })
  n.on('click', () => {
    if (mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
  n.show()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 700,
    minWidth: 380,
    minHeight: 500,
    maxWidth: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: true,
    backgroundColor: '#11111b',
    show: false,
    resizable: true,
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    // Start auto-updater after window is visible (production only)
    if (!isDev && mainWindow) initAutoUpdater(mainWindow)
  })
  mainWindow.on('close', (e) => {
    if (tray && !isQuitting) {
      e.preventDefault()
      mainWindow?.hide()
    }
  })
  mainWindow.on('closed', () => {
    setMainWindow(null)
    mainWindow = null
  })
  setMainWindow(mainWindow)
  startSmartNotifications(mainWindow)
}


// Prevent GPU cache errors on Windows (permission / lock issues)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache')
app.commandLine.appendSwitch('disable-gpu-cache')

app.whenReady().then(() => {
  log.info('Grinder starting up', { isDev, platform: process.platform })
  setNotificationSender(showNativeNotification)
  registerIpcHandlers()
  createWindow()
  if (process.platform === 'win32') createTray()
  log.info('Grinder ready')
})

app.on('window-all-closed', () => {
  if (tray) tray.destroy()
  tray = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  log.info('Grinder shutting down')
  isQuitting = true
  stopSmartNotifications()
  closeDatabase()
  log.info('Database closed, goodbye')
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
