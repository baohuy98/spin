import { create } from 'zustand'
import { io, Socket } from 'socket.io-client'
import { toast } from 'sonner'
import type { ChatMessage, MemberDetail, MessageReaction } from '../hooks/useSocket'

interface RoomData {
  roomId: string
  hostId: string
  members: string[]
  membersWithDetails?: MemberDetail[]
}

interface SocketState {
  socket: Socket | null
  isConnected: boolean
  roomData: RoomData | null
  error: string | null
  isRoomClosed: boolean
  isHostDisconnected: boolean
  messages: ChatMessage[]

  // Actions
  initializeSocket: (url?: string) => void
  disconnectSocket: () => void
  createRoom: (hostId: string, name: string) => void
  joinRoom: (roomId: string, memberId: string, name: string, force?: boolean) => void
  leaveRoom: (roomId: string, memberId: string) => void
  emitSpinResult: (roomId: string, result: string) => void
  onSpinResult: (callback: (result: string) => void) => void
  sendChatMessage: (roomId: string, userId: string, userName: string, message: string) => void
  reactToMessage: (roomId: string, messageId: string, userId: string, emoji: string) => void
  clearError: () => void
  setRoomData: (roomData: RoomData | null) => void
}

let pendingJoinRef: string | null = null

export const useSocketStore = create<SocketState>((set, get) => ({
  socket: null,
  isConnected: false,
  roomData: (() => {
    // Try to restore room data from sessionStorage on init
    const savedRoomData = sessionStorage.getItem('roomData')
    if (savedRoomData) {
      try {
        const parsed = JSON.parse(savedRoomData)
        // Check if room data is too old (older than 24 hours)
        const savedTime = sessionStorage.getItem('roomDataTimestamp')
        if (savedTime) {
          const age = Date.now() - parseInt(savedTime)
          if (age > 24 * 60 * 60 * 1000) {
            console.log('[socketStore] Clearing stale room data (older than 24h)')
            sessionStorage.removeItem('roomData')
            sessionStorage.removeItem('roomDataTimestamp')
            return null
          }
        }
        return parsed
      } catch (e) {
        console.error('[socketStore] Failed to parse room data:', e)
        sessionStorage.removeItem('roomData')
        return null
      }
    }
    return null
  })(),
  error: null,
  isRoomClosed: false,
  isHostDisconnected: false,
  messages: [],

  initializeSocket: (url = 'http://localhost:3003') => {
    const existingSocket = get().socket
    if (existingSocket) {
      console.log('[socketStore] Socket already initialized')
      return
    }

    const newSocket = io(url, {
      transports: ['websocket', 'polling']
    })

    // Setup event listeners
    newSocket.on('connect', () => {
      set({ isConnected: true })
      console.log('[socketStore] Socket connected:', newSocket.id)

      // Auto re-join room on reconnection if room data exists
      const savedRoomData = sessionStorage.getItem('roomData')
      const savedMember = sessionStorage.getItem('viewerMember')

      if (savedRoomData && savedMember) {
        try {
          const parsedRoom: RoomData = JSON.parse(savedRoomData)
          const parsedMember = JSON.parse(savedMember)

          console.log('[socketStore] Auto re-joining room on reconnect:', parsedRoom.roomId, 'as', parsedMember.genID)
          newSocket.emit('join-room', {
            roomId: parsedRoom.roomId,
            memberId: parsedMember.genID,
            name: parsedMember.name
          })
        } catch (e) {
          console.error('[socketStore] Failed to parse saved data for rejoin:', e)
        }
      }
    })

    newSocket.on('disconnect', (reason) => {
      set({ isConnected: false })
      console.log('[socketStore] Socket disconnected:', reason)

      if (reason === 'io server disconnect') {
        newSocket.io.opts.autoConnect = false
      }
    })

    newSocket.on('room-created', (data: RoomData) => {
      console.log('[socketStore] Room created:', data)
      set({ roomData: data, isRoomClosed: false })
      sessionStorage.setItem('roomData', JSON.stringify(data))
      sessionStorage.setItem('roomDataTimestamp', Date.now().toString())
    })

    newSocket.on('room-joined', (data: RoomData & { memberId?: string }) => {
      console.log('[socketStore] Successfully joined room:', data)
      set({ roomData: data, isRoomClosed: false, isHostDisconnected: false, error: null })
      sessionStorage.setItem('roomData', JSON.stringify(data))
      sessionStorage.setItem('roomDataTimestamp', Date.now().toString())
      pendingJoinRef = null
    })

    newSocket.on('member-joined', (data: { memberId: string; memberName: string; members: string[]; membersWithDetails?: MemberDetail[] }) => {
      console.log('[socketStore] Member joined:', data)
      const currentRoomData = get().roomData
      if (currentRoomData) {
        // Check if host rejoined
        if (currentRoomData.hostId === data.memberId) {
          console.log('[socketStore] Host rejoined the room')
          set({ isHostDisconnected: false })
        }

        const updatedData = {
          ...currentRoomData,
          members: data.members,
          membersWithDetails: data.membersWithDetails || currentRoomData.membersWithDetails
        }
        set({ roomData: updatedData })
        sessionStorage.setItem('roomData', JSON.stringify(updatedData))
      }
    })

    newSocket.on('member-left', (data: { memberId: string; members: string[]; membersWithDetails?: MemberDetail[] }) => {
      console.log('[socketStore] Member left:', data)
      const currentRoomData = get().roomData
      if (currentRoomData) {
        // Check if the host is the one who left
        if (currentRoomData.hostId === data.memberId) {
          console.log('[socketStore] Host left the room. Marking as disconnected.')
          set({ isHostDisconnected: true })
        }
        const updatedData = {
          ...currentRoomData,
          members: data.members,
          membersWithDetails: data.membersWithDetails || currentRoomData.membersWithDetails
        }
        set({ roomData: updatedData })
        sessionStorage.setItem('roomData', JSON.stringify(updatedData))
      }
    })

    newSocket.on('error', (data: { message: string }) => {
      console.error('[socketStore] Socket error:', data)
      set({ error: data.message })
      pendingJoinRef = null

      // Show toast for duplicate connection
      if (data.message.includes('another tab') || data.message.includes('another window')) {
        toast.error(data.message, { duration: 5000 })
      }
    })

    // Chat events
    newSocket.on('chat-message', (data: ChatMessage) => {
      console.log('[socketStore] Received chat message:', data)
      set((state) => ({ messages: [...state.messages, data] }))
    })

    newSocket.on('chat-history', (data: { messages: ChatMessage[] }) => {
      console.log('[socketStore] Received chat history:', data)
      set({ messages: data.messages })
    })

    // Reaction events
    newSocket.on('message-reaction-updated', (data: { messageId: string; reactions: MessageReaction[] }) => {
      console.log('[socketStore] Received reaction update:', data)
      set((state) => ({
        messages: state.messages.map(msg =>
          msg.id === data.messageId
            ? { ...msg, reactions: data.reactions }
            : msg
        )
      }))
    })

    set({ socket: newSocket })
  },

  disconnectSocket: () => {
    const socket = get().socket
    if (socket) {
      socket.disconnect()
      set({ socket: null, isConnected: false })
    }
  },

  createRoom: (hostId: string, name: string) => {
    const socket = get().socket
    if (socket) {
      console.log('[socketStore] Emitting create-room event for host:', hostId, name)
      socket.emit('create-room', { hostId, name })
    } else {
      console.error('[socketStore] Cannot create room - socket not connected')
    }
  },

  joinRoom: (roomId: string, memberId: string, name: string, force = false) => {
    const socket = get().socket
    const roomData = get().roomData

    if (socket) {
      const joinKey = `${roomId}-${memberId}`

      // Check if there's already a pending join request
      if (!force && pendingJoinRef === joinKey) {
        console.log('[socketStore] Join already in progress:', { roomId, memberId })
        return
      }

      // Check if already in the room
      if (!force && roomData && roomData.roomId === roomId && roomData.members.includes(memberId)) {
        console.log('[socketStore] Already in room:', { roomId, memberId })
        return
      }

      console.log('[socketStore] Attempting to join room:', { roomId, memberId, name, socketId: socket.id })
      pendingJoinRef = joinKey
      socket.emit('join-room', { roomId, memberId, name })
    } else {
      console.error('[socketStore] Cannot join room - socket not connected')
    }
  },

  leaveRoom: (roomId: string, memberId: string) => {
    const socket = get().socket
    if (socket) {
      socket.emit('leave-room', { roomId, memberId })
      pendingJoinRef = null
      sessionStorage.removeItem('roomData')
      sessionStorage.removeItem('roomDataTimestamp')
      set({ roomData: null })
    }
  },

  emitSpinResult: (roomId: string, result: string) => {
    const socket = get().socket
    if (socket) {
      socket.emit('spin-result', { roomId, result })
    }
  },

  onSpinResult: (callback: (result: string) => void) => {
    const socket = get().socket
    if (socket) {
      socket.on('spin-result', callback)
    }
  },

  sendChatMessage: (roomId: string, userId: string, userName: string, message: string) => {
    const socket = get().socket
    if (socket) {
      const chatMessage: Omit<ChatMessage, 'id' | 'timestamp'> = {
        roomId,
        userId,
        userName,
        message
      }
      socket.emit('send-message', chatMessage)
    }
  },

  reactToMessage: (roomId: string, messageId: string, userId: string, emoji: string) => {
    const socket = get().socket
    if (socket) {
      socket.emit('react-to-message', { roomId, messageId, userId, emoji })
    }
  },

  clearError: () => {
    set({ error: null })
  },

  setRoomData: (roomData: RoomData | null) => {
    set({ roomData })
  }
}))
