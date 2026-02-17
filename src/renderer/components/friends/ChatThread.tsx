import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { playClickSound } from '../../lib/sounds'
import { useAuthStore } from '../../stores/authStore'
import type { FriendProfile as FriendProfileType } from '../../hooks/useFriends'
import type { ChatMessage } from '../../hooks/useChat'
import { MOTION } from '../../lib/motion'
import { BackButton } from '../shared/BackButton'
import { EmptyState } from '../shared/EmptyState'
import { ErrorState } from '../shared/ErrorState'
import { SkeletonBlock } from '../shared/PageLoading'

interface ChatThreadProps {
  profile: FriendProfileType
  onBack: () => void
  messages: ChatMessage[]
  loading: boolean
  sending: boolean
  sendError?: string | null
  getConversation: (otherUserId: string) => Promise<ChatMessage[]>
  sendMessage: (receiverId: string, body: string) => Promise<void>
  markConversationRead: (otherUserId: string) => Promise<void>
}

export function ChatThread({ profile, onBack, messages, loading, sending, sendError, getConversation, sendMessage, markConversationRead }: ChatThreadProps) {
  const { user } = useAuthStore()
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    getConversation(profile.id)
    markConversationRead(profile.id)
  }, [profile.id, getConversation, markConversationRead])

  // Mark new messages as read when they arrive while chat is open
  useEffect(() => {
    if (messages.length > 0) {
      markConversationRead(profile.id)
    }
  }, [messages.length, profile.id, markConversationRead])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Focus input immediately when chat opens/switches peer.
    inputRef.current?.focus()
  }, [profile.id])

  const handleSend = () => {
    const text = input.trim()
    if (!text || sending) return
    sendMessage(profile.id, text)
    setInput('')
    playClickSound()
  }

  const groupedMessages = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: ChatMessage[] }> = []
    for (const m of messages) {
      const d = new Date(m.created_at)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const prev = groups[groups.length - 1]
      if (!prev || prev.key !== key) {
        groups.push({ key, label, items: [m] })
      } else {
        prev.items.push(m)
      }
    }
    return groups
  }, [messages])

  return (
    <motion.div
      initial={MOTION.subPage.initial}
      animate={MOTION.subPage.animate}
      transition={{ duration: MOTION.duration.base, ease: MOTION.easing }}
      className="flex flex-col h-[calc(100vh-12rem)] min-h-[320px]"
    >
      <div className="flex items-center justify-between mb-3">
        <BackButton onClick={() => { onBack(); playClickSound() }} />
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${profile.is_online ? 'bg-cyber-neon' : 'bg-gray-600'} shrink-0`} />
          <span className="text-sm text-white font-medium truncate max-w-[140px]">{profile.username || 'Friend'}</span>
          <span className="text-[10px] text-gray-500 font-mono">{profile.is_online ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto rounded-xl bg-discord-card/80 border border-white/10 p-3 space-y-2 mb-3"
      >
        {loading ? (
          <div className="space-y-2 py-2">
            <SkeletonBlock className="h-8 w-36 rounded-2xl" />
            <SkeletonBlock className="h-8 w-44 rounded-2xl ml-auto bg-cyber-neon/10" />
            <SkeletonBlock className="h-8 w-28 rounded-2xl" />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Say hi to start the conversation." icon="💬" className="bg-transparent border-white/5" />
        ) : (
          groupedMessages.map((group) => (
            <div key={group.key} className="space-y-2">
              <div className="flex items-center justify-center">
                <span className="text-[10px] text-gray-500 font-mono px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/5">
                  {group.label}
                </span>
              </div>
              {group.items.map((m) => {
                const isMe = m.sender_id === user?.id
                return (
                  <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        isMe
                          ? 'bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/30 rounded-br-md'
                          : 'bg-white/10 text-gray-200 border border-white/10 rounded-bl-md'
                      }`}
                    >
                      <p className="break-words leading-relaxed">{m.body}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? 'text-cyber-neon/70' : 'text-gray-500'}`}>
                        {new Date(m.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
      </div>

      {sendError && (
        <ErrorState message={sendError} className="mb-2 py-2" />
      )}
      <div className="rounded-xl bg-discord-card/80 border border-white/10 p-2">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Message..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-discord-card border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyber-neon/40 max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="shrink-0 px-4 py-2 rounded-xl bg-cyber-neon/20 text-cyber-neon border border-cyber-neon/40 hover:bg-cyber-neon/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1 px-1">Enter to send, Shift+Enter for new line</p>
      </div>
    </motion.div>
  )
}
