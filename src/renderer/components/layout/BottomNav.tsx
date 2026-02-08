import { motion } from 'framer-motion'
import type { TabId } from '../../App'
import { playTabSound } from '../../lib/sounds'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Grind', icon: '⏱' },
  { id: 'skills', label: 'Skills', icon: '⚡' },
  { id: 'stats', label: 'Stats', icon: '📊' },
  { id: 'friends', label: 'Friends', icon: '👥' },
  { id: 'settings', label: 'Config', icon: '⚙' },
]

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="h-14 flex items-stretch border-t border-white/5 bg-discord-darker shrink-0">
      {tabs.map((tab) => {
        const active = activeTab === tab.id
        return (
          <motion.button
            key={tab.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playTabSound()
              onTabChange(tab.id)
            }}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
              active ? 'text-cyber-neon' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="text-base">{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
            {active && (
              <motion.div
                layoutId="bottom-indicator"
                className="absolute bottom-0 h-0.5 w-8 bg-cyber-neon rounded-full"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </motion.button>
        )
      })}
    </nav>
  )
}
