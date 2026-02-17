import { useState, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useChat } from '../../hooks/useChat'
import { FriendList } from './FriendList'
import { FriendListSkeleton } from './FriendListSkeleton'
import { AddFriend } from './AddFriend'
import { FriendProfile } from './FriendProfile'
import { PendingRequests } from './PendingRequests'
import { Leaderboard } from './Leaderboard'
import { FriendCompare } from './FriendCompare'
import { ChatThread } from './ChatThread'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { useChatTargetStore } from '../../stores/chatTargetStore'
import type { FriendProfile as FriendProfileType, FriendsModel } from '../../hooks/useFriends'
import { syncSkillsToSupabase } from '../../services/supabaseSync'
import { useSkillSyncStore } from '../../stores/skillSyncStore'
import { PageHeader } from '../shared/PageHeader'
import { BackButton } from '../shared/BackButton'
import { ErrorState } from '../shared/ErrorState'
import { EmptyState } from '../shared/EmptyState'
import { MOTION } from '../../lib/motion'
import { FriendEventFeed } from './FriendEventFeed'
import { FEATURE_FLAGS } from '../../lib/featureFlags'

type FriendView = 'list' | 'profile' | 'compare' | 'chat'

interface FriendsPageProps {
  friendsModel: FriendsModel
}

export function FriendsPage({ friendsModel }: FriendsPageProps) {
  const { user } = useAuthStore()
  const { friends, pendingRequests, unreadByFriendId, loading, error, refresh, acceptRequest, rejectRequest, removeFriend } = friendsModel
  const [selected, setSelected] = useState<FriendProfileType | null>(null)
  const [view, setView] = useState<FriendView>('list')
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const peerId = view === 'chat' && selected ? selected.id : null
  const chat = useChat(peerId)
  const chatTargetFriendId = useChatTargetStore((s) => s.friendId)
  const setChatTargetFriendId = useChatTargetStore((s) => s.setFriendId)
  const { setSyncState } = useSkillSyncStore()

  const retrySkillSync = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.db?.getAllSkillXP) return
    setSyncState({ status: 'syncing', error: null })
    const result = await syncSkillsToSupabase(api, { maxAttempts: 3 })
    if (result.ok) {
      setSyncState({ status: 'success', at: result.lastSkillSyncAt, error: null })
      refresh()
      return
    }
    setSyncState({ status: 'error', error: result.error ?? 'Skill sync failed' })
  }, [refresh, setSyncState])

  // Navigate to chat when MessageBanner signals (e.g. clicked on new message)
  useEffect(() => {
    if (!chatTargetFriendId) return
    const friend = friends.find((f) => f.id === chatTargetFriendId)
    setChatTargetFriendId(null)
    if (friend) {
      setSelected(friend)
      setView('chat')
    }
  }, [chatTargetFriendId, friends, setChatTargetFriendId])

  // Wrap markConversationRead to also refresh friend unread badges
  const markConversationReadAndRefresh = useCallback(async (otherUserId: string) => {
    await chat.markConversationRead(otherUserId)
    refresh()
  }, [chat.markConversationRead, refresh])

  const incomingCount = pendingRequests.filter((r) => r.direction === 'incoming').length
  const isSubview = view === 'chat' || view === 'profile' || view === 'compare'
  const backToList = useCallback(() => {
    setView('list')
    setSelected(null)
  }, [])

  useEffect(() => {
    if (!isSubview) return
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null
      if (!el) return false
      const tag = el.tagName?.toLowerCase()
      return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable
    }
    const isMouseBack = (button: number) => button === 3 || button === 4

    const onKeyDownCapture = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      backToList()
    }
    const onMouseBackCapture = (e: MouseEvent) => {
      if (!isMouseBack(e.button)) return
      if (isEditableTarget(e.target)) return
      e.preventDefault()
      e.stopPropagation()
      backToList()
    }

    window.addEventListener('keydown', onKeyDownCapture, true)
    window.addEventListener('mousedown', onMouseBackCapture, true)
    window.addEventListener('auxclick', onMouseBackCapture, true)
    return () => {
      window.removeEventListener('keydown', onKeyDownCapture, true)
      window.removeEventListener('mousedown', onMouseBackCapture, true)
      window.removeEventListener('auxclick', onMouseBackCapture, true)
    }
  }, [isSubview, backToList])

  return (
    <motion.div
      initial={{ opacity: MOTION.page.initial.opacity }}
      animate={{ opacity: MOTION.page.animate.opacity }}
      exit={{ opacity: MOTION.page.exit.opacity }}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="p-4 pb-2"
    >
      {!user ? (
        <EmptyState title="Sign in to join the squad" description="Add friends, flex your stats, and compete on the leaderboard." icon="👥" />
      ) : !supabase ? (
        <EmptyState
          title="Supabase not configured"
          description="Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env in the project root and rebuild."
          icon="🔌"
        />
      ) : view === 'compare' && selected ? (
        <FriendCompare friend={selected} onBack={() => setView('profile')} />
      ) : view === 'chat' && selected ? (
        <ChatThread
          profile={selected}
          onBack={backToList}
          messages={chat.messages}
          loading={chat.loading}
          sending={chat.sending}
          sendError={chat.sendError}
          getConversation={chat.getConversation}
          sendMessage={chat.sendMessage}
          markConversationRead={markConversationReadAndRefresh}
        />
      ) : view === 'profile' && selected ? (
        <FriendProfile
          profile={selected}
          onBack={backToList}
          onCompare={() => setView('compare')}
          onMessage={() => setView('chat')}
          onRetrySync={retrySkillSync}
          onRemove={async () => {
            const ok = await removeFriend(selected.friendship_id)
            if (ok) {
              setSelected(null)
              setView('list')
            }
          }}
        />
      ) : (
        <div className="space-y-4">
          <PageHeader
            title="Friends"
            rightSlot={(
              <button
                onClick={() => setShowLeaderboard(!showLeaderboard)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  showLeaderboard ? 'border-cyber-neon/50 text-cyber-neon bg-cyber-neon/10' : 'border-white/10 text-gray-400 hover:text-white'
                }`}
              >
                Leaderboard
              </button>
            )}
          />

          <AddFriend onAdded={refresh} />
          {FEATURE_FLAGS.socialFeed && <FriendEventFeed />}

          {incomingCount > 0 && !showLeaderboard && (
            <PendingRequests
              requests={pendingRequests}
              onAccept={acceptRequest}
              onReject={rejectRequest}
            />
          )}

          {showLeaderboard ? (
            <div className="space-y-3">
              <BackButton onClick={() => setShowLeaderboard(false)} />
              <Leaderboard />
            </div>
          ) : (
            <>
              {error && (
                <ErrorState message={error} onRetry={() => refresh()} retryLabel="Reconnect" secondaryAction={{ label: 'Retry sync', onClick: retrySkillSync }} className="mb-3" />
              )}
              {loading ? (
                <FriendListSkeleton />
              ) : (
                <FriendList
                  friends={friends}
                  onSelectFriend={(f) => { setSelected(f); setView('profile') }}
                  onMessageFriend={(f) => { setSelected(f); setView('chat') }}
                  unreadByFriendId={unreadByFriendId}
                />
              )}
              {!loading && friends.length === 0 && (
                <EmptyState title="No friends data yet" description="Reconnect to refresh your friends list." icon="🛰" actionLabel="Reconnect" onAction={() => refresh()} />
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
    </motion.div>
  )
}
