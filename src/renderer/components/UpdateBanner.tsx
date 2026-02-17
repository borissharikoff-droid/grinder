import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNotificationStore } from '../stores/notificationStore'

export function UpdateBanner() {
  const [updateReady, setUpdateReady] = useState(false)
  const [version, setVersion] = useState('')

  useEffect(() => {
    const api = window.electronAPI
    if (!api?.updater?.onStatus) return
    const unsub = api.updater.onStatus((info) => {
      if (info.status === 'ready') {
        setUpdateReady(true)
        setVersion(info.version || '')
        useNotificationStore.getState().push({
          type: 'update',
          icon: '⬇️',
          title: 'Update is ready',
          body: info.version ? `Version ${info.version} is available` : 'A new version is available',
        })
      }
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!updateReady) return
    const t = setTimeout(() => setUpdateReady(false), 5000)
    return () => clearTimeout(t)
  }, [updateReady])

  return (
    <AnimatePresence>
      {updateReady && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="px-4 py-2 bg-discord-accent/15 border-b border-discord-accent/30"
        >
          <p className="text-xs text-white text-center">
            Update <span className="font-mono text-discord-accent font-bold">{version}</span> ready
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
