import type { TabId } from '../../App'
import { motion } from 'framer-motion'
import { playTabSound } from '../../lib/sounds'
import { useAlertStore } from '../../stores/alertStore'
import { useNavBadgeStore } from '../../stores/navBadgeStore'
import { MOTION } from '../../lib/motion'

const tabs: { id: TabId; icon: string }[] = [
  { id: 'home', icon: '⏱' },
  { id: 'skills', icon: '⚡' },
  { id: 'stats', icon: '📊' },
  { id: 'friends', icon: '👥' },
  { id: 'settings', icon: '⚙' },
]

interface BottomNavProps {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const { queue, currentAlert } = useAlertStore()
  const { incomingRequestsCount, unreadMessagesCount } = useNavBadgeStore()
  const badgeHome = (currentAlert && !currentAlert.claimed ? 1 : 0) + queue.length
  const badgeFriends = incomingRequestsCount + unreadMessagesCount
  const hasUnclaimedLoot = currentAlert && !currentAlert.claimed

  return (
    <div className="shrink-0 flex justify-center pb-3 pt-1">
      <nav className="flex items-center gap-4 rounded-full bg-discord-nav border border-white/[0.07] px-2.5 py-1.5 shadow-nav">
        {tabs.map((tab) => {
          const active = activeTab === tab.id
          const badgeCount = tab.id === 'home' ? badgeHome : tab.id === 'friends' ? badgeFriends : 0
          const isLootBadge = tab.id === 'home' && badgeCount > 0 && hasUnclaimedLoot
          return (
            <motion.button
              key={tab.id}
              whileTap={MOTION.interactive.tap}
              onClick={() => {
                playTabSound()
                onTabChange(tab.id)
              }}
              className={`relative w-9 h-9 flex items-center justify-center rounded-full text-sm transition-all duration-200 ${
                active
                  ? 'bg-cyber-neon/15 text-cyber-neon shadow-glow-sm'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 hover:-translate-y-[1px]'
              }`}
            >
              <span className="idly-tab-icon" aria-hidden>
                {tab.icon}
              </span>
              {badgeCount > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full text-[10px] font-bold text-white border-2 border-discord-nav ${
                    isLootBadge ? 'bg-orange-500' : 'bg-discord-red'
                  }`}
                  aria-label={isLootBadge ? 'Unclaimed loot' : `${badgeCount} new`}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
            </motion.button>
          )
        })}
      </nav>
    </div>
  )
}
