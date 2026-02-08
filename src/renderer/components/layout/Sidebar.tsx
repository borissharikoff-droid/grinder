import { motion } from 'framer-motion'
import type { TabId } from '../../App'

const tabs: { id: TabId; label: string; icon: string }[] = [
  { id: 'home', label: 'Home', icon: '◉' },
  { id: 'stats', label: 'Stats', icon: '▣' },
  { id: 'friends', label: 'Friends', icon: '◈' },
]

interface SidebarProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-[72px] flex flex-col items-center py-4 bg-discord-darker border-r border-white/5 shrink-0">
      <div className="font-mono text-2xl text-cyber-neon mb-8 tracking-widest drop-shadow-[0_0_8px_rgba(0,255,136,0.5)]">
        G
      </div>
      <nav className="flex flex-col gap-1">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onTabChange(tab.id)}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center text-lg transition-all duration-200 ${
              activeTab === tab.id
                ? 'bg-discord-accent text-white shadow-glow-sm'
                : 'text-gray-400 hover:bg-discord-card hover:text-white'
            }`}
            title={tab.label}
          >
            {tab.icon}
            {activeTab === tab.id && (
              <motion.span
                layoutId="sidebar-indicator"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              />
            )}
          </motion.button>
        ))}
      </nav>
      <div className="mt-auto pt-4 border-t border-white/5 w-8 font-mono text-[10px] text-gray-500 text-center">
        v0.1
      </div>
    </aside>
  )
}
