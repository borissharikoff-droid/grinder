import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'
import { useNavBadgeStore } from '../stores/navBadgeStore'
import { playMessageSound } from '../lib/sounds'

export interface ChatMessage {
  id: string
  sender_id: string
  receiver_id: string
  body: string
  created_at: string
  read_at: string | null
}

/** @param peerId When set, new messages from this peer are appended to the thread and do not increase unread count. */
export function useChat(peerId: string | null = null) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const { setUnreadMessagesCount, addUnreadMessages } = useNavBadgeStore()

  const fetchUnreadCount = useCallback(async () => {
    if (!supabase || !user?.id) return
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user.id)
      .is('read_at', null)
    if (!error) setUnreadMessagesCount(count ?? 0)
  }, [user?.id, setUnreadMessagesCount])

  useEffect(() => {
    if (!user?.id) {
      setUnreadMessagesCount(0)
      return
    }
    fetchUnreadCount()
  }, [user?.id, fetchUnreadCount, setUnreadMessagesCount])

  useEffect(() => {
    if (!supabase || !user?.id) return
    const channel = supabase
      .channel('dm-incoming')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as ChatMessage
          const isFromOpenThread = peerId !== null && row.sender_id === peerId
          if (isFromOpenThread) {
            setMessages((prev) => [...prev, row].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
          } else {
            addUnreadMessages(1)
            playMessageSound()
          }
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, peerId, addUnreadMessages])

  const getConversation = useCallback(
    async (otherUserId: string) => {
      if (!supabase || !user?.id) return []
      setLoading(true)
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, body, created_at, read_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
      setLoading(false)
      if (error) return []
      setMessages((data as ChatMessage[]) ?? [])
      return (data as ChatMessage[]) ?? []
    },
    [user?.id]
  )

  const sendMessage = useCallback(
    async (receiverId: string, body: string) => {
      if (!supabase || !user?.id || !body.trim()) return
      setSending(true)
      const { data, error } = await supabase
        .from('messages')
        .insert({ sender_id: user.id, receiver_id: receiverId, body: body.trim() })
        .select('id, sender_id, receiver_id, body, created_at, read_at')
        .single()
      setSending(false)
      if (!error && data) {
        setMessages((prev) => [...prev, data as ChatMessage].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()))
      }
    },
    [user?.id]
  )

  const markConversationRead = useCallback(
    async (otherUserId: string) => {
      if (!supabase || !user?.id) return
      await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', user.id)
        .eq('sender_id', otherUserId)
        .is('read_at', null)
      fetchUnreadCount()
    },
    [user?.id, fetchUnreadCount]
  )

  return {
    messages,
    loading,
    sending,
    getConversation,
    sendMessage,
    markConversationRead,
    fetchUnreadCount,
  }
}
