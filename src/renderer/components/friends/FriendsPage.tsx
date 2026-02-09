import { useState } from 'react'
import { useFriends } from '../../hooks/useFriends'
import { useChat } from '../../hooks/useChat'
import { FriendList } from './FriendList'
import { AddFriend } from './AddFriend'
import { FriendProfile } from './FriendProfile'
import { PendingRequests } from './PendingRequests'
import { Leaderboard } from './Leaderboard'
import { FriendCompare } from './FriendCompare'
import { ChatThread } from './ChatThread'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import type { FriendProfile as FriendProfileType } from '../../hooks/useFriends'

type FriendView = 'list' | 'profile' | 'compare' | 'chat'

export function FriendsPage() {
  const { user } = useAuthStore()
  const { friends, pendingRequests, unreadByFriendId, loading, error, refresh, acceptRequest, rejectRequest } = useFriends()
  const [selected, setSelected] = useState<FriendProfileType | null>(null)
  const [view, setView] = useState<FriendView>('list')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const peerId = view === 'chat' && selected ? selected.id : null
  const chat = useChat(peerId)

  const incomingCount = pendingRequests.filter((r) => r.direction === 'incoming').length

  return (
    <div className="p-4 pb-2">
      {!user ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-3">👥</span>
          <p className="text-white font-medium mb-1">Sign in to join the squad</p>
          <p className="text-gray-500 text-xs">Add friends, flex your stats, compete on the leaderboard.</p>
        </div>
      ) : !supabase ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-3xl mb-3">🔌</span>
          <p className="text-white font-medium mb-1">Supabase не настроен</p>
          <p className="text-gray-500 text-xs max-w-[280px]">
            Добавьте VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env в корне проекта и пересоберите приложение (npm run build).
          </p>
        </div>
      ) : view === 'compare' && selected ? (
        <FriendCompare friend={selected} onBack={() => setView('profile')} />
      ) : view === 'chat' && selected ? (
        <ChatThread
          profile={selected}
          onBack={() => { setView('list'); setSelected(null) }}
          messages={chat.messages}
          loading={chat.loading}
          sending={chat.sending}
          getConversation={chat.getConversation}
          sendMessage={chat.sendMessage}
          markConversationRead={chat.markConversationRead}
        />
      ) : view === 'profile' && selected ? (
        <FriendProfile
          profile={selected}
          onBack={() => { setSelected(null); setView('list') }}
          onCompare={() => setView('compare')}
          onMessage={() => setView('chat')}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Friends</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  showLeaderboard ? 'border-cyber-neon/50 text-cyber-neon bg-cyber-neon/10' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Leaderboard
              </button>
            </div>
          </div>

          <AddFriend onAdded={refresh} />

          {incomingCount > 0 && !showLeaderboard && (
            <PendingRequests
              requests={pendingRequests}
              onAccept={acceptRequest}
              onReject={rejectRequest}
            />
          )}

          {showLeaderboard ? (
            <Leaderboard />
          ) : (
            <>
              {error && (
                <div className="rounded-xl bg-discord-card/80 border border-red-500/30 p-4 text-center mb-3">
                  <p className="text-red-400 text-sm mb-2">{error}</p>
                  <button
                    onClick={() => refresh()}
                    className="text-xs px-3 py-1.5 rounded-lg bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/40 hover:bg-cyber-neon/30 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}
              {loading ? (
                <div className="rounded-xl bg-discord-card/80 border border-white/10 p-6 text-center text-gray-500">
                  <span className="text-2xl block mb-2">⏳</span>
                  <p className="text-sm">Loading friends...</p>
                </div>
              ) : (
                <FriendList
                  friends={friends}
                  onSelectFriend={(f) => { setSelected(f); setView('profile') }}
                  onMessageFriend={(f) => { setSelected(f); setView('chat') }}
                  unreadByFriendId={unreadByFriendId}
                />
              )}
              {!loading && pendingRequests.filter((r) => r.direction === 'outgoing').length > 0 && (
                <div className="mt-3">
                  <PendingRequests
                    requests={pendingRequests.filter((r) => r.direction === 'outgoing')}
                    onAccept={acceptRequest}
                    onReject={rejectRequest}
                  />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
