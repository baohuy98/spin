import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'

interface UseSocketOptions {
  url?: string
  autoConnect?: boolean
}

export interface MemberDetail {
  name: string
  isHost: boolean
}

interface RoomData {
  roomId: string
  hostId: string
  members: string[]
  membersWithDetails?: MemberDetail[]
  theme?: string
}

interface SocketError {
  message: string
}

export interface MessageReaction {
  emoji: string
  userIds: string[]
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  message: string
  timestamp: number
  roomId: string
  reactions?: MessageReaction[]
}

export interface LivestreamReaction {
  id: string
  emoji: string
  userId: string
  userName: string
  timestamp: number
}

export function useSocket(options: UseSocketOptions = {}) {
  const { url = import.meta.env.VITE_WEBSOCKET_SERVER_URL || 'http://localhost:3003', autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(() => {
    // Try to restore room data from sessionStorage on mount
    const savedRoomData = sessionStorage.getItem('roomData')
    if (savedRoomData) {
      try {
        const parsed = JSON.parse(savedRoomData)
        // Check if room data is too old (older than 24 hours)
        const savedTime = sessionStorage.getItem('roomDataTimestamp')
        if (savedTime) {
          const age = Date.now() - parseInt(savedTime)
          if (age > 24 * 60 * 60 * 1000) { // 24 hours
            console.log('[useSocket] Clearing stale room data (older than 24h)')
            sessionStorage.removeItem('roomData')
            sessionStorage.removeItem('roomDataTimestamp')
            return null
          }
        }
        return parsed
      } catch (e) {
        console.error('[useSocket] Failed to parse room data:', e)
        sessionStorage.removeItem('roomData')
        return null
      }
    }
    return null
  })
  const [error, setError] = useState<string | null>(null)
  const [isRoomClosed, setIsRoomClosed] = useState(false)
  const [isRoomDeleted, setIsRoomDeleted] = useState(false)
  const [isHostDisconnected, setIsHostDisconnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [livestreamReactions, setLivestreamReactions] = useState<LivestreamReaction[]>([])
  const pendingJoinRef = useRef<string | null>(null) // Track pending join request

  const updateLivestreamReaction = (data: LivestreamReaction) => {
    setLivestreamReactions(prev => [...prev, data])
    // Auto-remove after animation duration
    setTimeout(() => {
      setLivestreamReactions(prev => prev.filter(r => r.id !== data.id))
    }, 3500) // 3.5 seconds (max animation duration + buffer)

  }
  useEffect(() => {
    if (autoConnect) {
      const newSocket = io(url, {
        transports: ['websocket', 'polling']
      })

      socketRef.current = newSocket
      setSocket(newSocket)

      newSocket.on('connect', () => {
        setIsConnected(true)
        console.log('[FE-SOCKET] ✅ Socket connected:', newSocket.id)
      })

      newSocket.on('disconnect', (reason) => {
        setIsConnected(false)
        console.log('[FE-SOCKET] ⚠️  Socket disconnected:', reason)

        // If disconnected by server due to duplicate connection, show message
        if (reason === 'io server disconnect') {
          // Server forcefully disconnected - don't auto-reconnect
          newSocket.io.opts.autoConnect = false
          console.log('[FE-SOCKET] 🔌 Server forced disconnect, disabling auto-reconnect')
        }
      })

      newSocket.on('room-created', (data: RoomData) => {
        console.log('[FE-SOCKET] 📝 Room created event received:', {
          roomId: data.roomId,
          hostId: data.hostId,
          memberCount: data.members.length,
          theme: data?.theme
        })
        setRoomData(data)
        sessionStorage.setItem('roomData', JSON.stringify(data))
        sessionStorage.setItem('roomDataTimestamp', Date.now().toString())
        setIsRoomClosed(false) // Reset room closed state
      })

      newSocket.on('room-joined', (data: RoomData & { memberId?: string }) => {
        console.log('[FE-SOCKET] ✅ Room joined event received:', {
          roomId: data.roomId,
          hostId: data.hostId,
          memberCount: data.members.length,
          memberId: data.memberId
        })
        setRoomData(data)
        sessionStorage.setItem('roomData', JSON.stringify(data))
        setIsRoomClosed(false) // Reset room closed state
        setIsHostDisconnected(false) // Reset host disconnected state
        setError(null) // Clear any previous errors
        pendingJoinRef.current = null // Clear pending join
      })

      newSocket.on('member-joined', (data: { memberId: string; memberName: string; members: string[]; membersWithDetails?: MemberDetail[] }) => {
        console.log('[FE-SOCKET] 👥 Member joined event:', {
          memberId: data.memberId,
          memberName: data.memberName,
          totalMembers: data.members.length
        })
        setRoomData(prev => {
          if (prev) {
            // Check if host rejoined
            if (prev.hostId === data.memberId) {
              console.log('Host rejoined the room')
              setIsHostDisconnected(false)
            }

            const updatedData = {
              ...prev,
              members: data.members,
              membersWithDetails: data.membersWithDetails || prev.membersWithDetails
            }
            sessionStorage.setItem('roomData', JSON.stringify(updatedData))
            return updatedData
          }
          return null
        })
      })

      newSocket.on('member-left', (data: { memberId: string; members: string[]; membersWithDetails?: MemberDetail[] }) => {
        console.log('[FE-SOCKET] 👋 Member left event:', {
          memberId: data.memberId,
          remainingMembers: data.members.length
        })
        setRoomData(prev => {
          if (prev) {
            // Check if the host is the one who left
            if (prev.hostId === data.memberId) {
              console.log('[FE-SOCKET] ⚠️  Host left the room. Marking as disconnected.')
              setIsHostDisconnected(true)
              // Do NOT close the room immediately, allow for reconnection
              // setIsRoomClosed(true)
              // sessionStorage.removeItem('roomData')
              // return null
            }
            const updatedData = {
              ...prev,
              members: data.members,
              membersWithDetails: data.membersWithDetails || prev.membersWithDetails
            }
            sessionStorage.setItem('roomData', JSON.stringify(updatedData))
            return updatedData
          }
          return null
        })
      })

      newSocket.on('error', (data: SocketError) => {
        console.error('[FE-SOCKET] ❌ Socket error:', data.message)
        setError(data.message)
        pendingJoinRef.current = null // Clear pending join on error

        // Show toast for duplicate connection
        if (data.message.includes('another tab') || data.message.includes('another window')) {
          toast.error(data.message, { duration: 5000 })
        }
      })

      newSocket.on('room-deleted', (data: { message: string }) => {
        console.log('[FE-SOCKET] 🗑️  Room deleted event:', data.message)
        setIsRoomDeleted(true)
        sessionStorage.removeItem('roomData')
        sessionStorage.removeItem('roomDataTimestamp')
        toast.error(data.message, { duration: 5000 })
      })

      // Note: Auto re-join is handled by ViewerPage/HostPage components
      // to avoid duplicate join attempts and race conditions

      // Chat events
      newSocket.on('chat-message', (data: ChatMessage) => {
        console.log('Received chat message:', data)
        setMessages(prev => [...prev, data])
      })

      newSocket.on('chat-history', (data: { messages: ChatMessage[] }) => {
        console.log('Received chat history:', data)
        setMessages(data.messages)
      })

      // Reaction events
      newSocket.on('message-reaction-updated', (data: { messageId: string; reactions: MessageReaction[] }) => {
        console.log('Received reaction update:', data)
        setMessages(prev => prev.map(msg =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        ))
      })

      // Livestream reaction events
      newSocket.on('livestream-reaction', (data: LivestreamReaction) => {
        console.log('Received livestream reaction:', data)
        updateLivestreamReaction(data)
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [url, autoConnect])

  const createRoom = (hostId: string, name: string) => {
    if (socketRef.current) {
      console.log('[FE-SOCKET] 📤 Emitting create-room event:', { hostId, name, socket: socketRef.current.id })
      socketRef.current.emit('create-room', { hostId, name })
    } else {
      console.error('[FE-SOCKET] ❌ Cannot create room - socket not connected')
    }
  }

  const joinRoom = (roomId: string, memberId: string, name: string) => {
    if (socketRef.current) {
      const joinKey = `${roomId}-${memberId}`
      const currentSocketId = socketRef.current.id

      // Check if there's already a pending join request for this room-member combo
      if (pendingJoinRef.current === joinKey) {
        console.log('[useSocket] Join already in progress:', { roomId, memberId })
        return
      }

      console.log('[useSocket] Attempting to join room:', { roomId, memberId, name, socketId: currentSocketId })
      pendingJoinRef.current = joinKey // Mark as pending

      socketRef.current.emit('join-room', { roomId, memberId, name })
    } else {
      console.error('[FE-SOCKET] ❌ Cannot join room - socket not connected')
    }
  }

  const leaveRoom = (roomId: string, memberId: string) => {
    if (socketRef.current) {
      console.log('[FE-SOCKET] 📤 Emitting leave-room event:', { roomId, memberId, socket: socketRef.current.id })
      socketRef.current.emit('leave-room', { roomId, memberId })
      pendingJoinRef.current = null
      sessionStorage.removeItem('roomData')
    }
  }

  const emitSpinResult = (roomId: string, result: string) => {
    if (socketRef.current) {
      socketRef.current.emit('spin-result', { roomId, result })
    }
  }

  const onSpinResult = (callback: (result: string) => void) => {
    if (socketRef.current) {
      socketRef.current.on('spin-result', callback)
    }
  }

  const sendChatMessage = (roomId: string, userId: string, userName: string, message: string) => {
    if (socketRef.current) {
      const chatMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        roomId,
        userId,
        userName,
        message
      }
      socketRef.current.emit('send-message', chatMessage)
    }
  }

  const reactToMessage = (roomId: string, messageId: string, userId: string, emoji: string) => {
    if (socketRef.current) {
      socketRef.current.emit('react-to-message', { roomId, messageId, userId, emoji })
    }
  }

  const sendLivestreamReaction = (roomId: string, userId: string, userName: string, emoji: string) => {
    if (socketRef.current) {
      updateLivestreamReaction({
        id: new Date().toISOString(),
        userId,
        userName,
        timestamp: new Date().getTime(),
        emoji,
      })
      socketRef.current.emit('livestream-reaction', { roomId, userId, userName, emoji })
    }
  }

  const clearError = () => {
    setError(null)
  }

  const updateTheme = (roomId: string, theme: string) => {
    if (socketRef.current) {
      socketRef.current.emit('update-theme', { roomId, theme })
    }
  }

  return {
    socket,
    isConnected,
    roomData,
    error,
    clearError,
    createRoom,
    joinRoom,
    leaveRoom,
    emitSpinResult,
    onSpinResult,
    isRoomClosed,
    isRoomDeleted,
    isHostDisconnected,
    messages,
    sendChatMessage,
    reactToMessage,
    livestreamReactions,
    sendLivestreamReaction,
    updateTheme
  }
}
