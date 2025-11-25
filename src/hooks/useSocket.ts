import { useEffect } from 'react'
import { useSocketStore } from '../store/socketStore'

interface UseSocketOptions {
  url?: string
  autoConnect?: boolean
}

export interface MemberDetail {
  genID: string
  name: string
  isHost: boolean
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

export function useSocket(options: UseSocketOptions = {}) {
  const { url = 'http://localhost:3003', autoConnect = true } = options

  const {
    socket,
    isConnected,
    roomData,
    error,
    isRoomClosed,
    isHostDisconnected,
    messages,
    initializeSocket,
    createRoom,
    joinRoom,
    leaveRoom,
    emitSpinResult,
    onSpinResult,
    sendChatMessage,
    reactToMessage,
    clearError
  } = useSocketStore()

  useEffect(() => {
    if (autoConnect && !socket) {
      initializeSocket(url)
    }

    return () => {
      // Don't disconnect on unmount to preserve socket connection across components
    }
  }, [autoConnect, url, socket, initializeSocket])

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
    isHostDisconnected,
    messages,
    sendChatMessage,
    reactToMessage
  }
}
