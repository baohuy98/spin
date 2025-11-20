import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketOptions {
  url?: string
  autoConnect?: boolean
}

interface RoomData {
  roomId: string
  hostId: string
  members: string[]
}

interface SocketError {
  message: string
}

export function useSocket(options: UseSocketOptions = {}) {
  const { url = 'http://localhost:3003', autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRoomClosed, setIsRoomClosed] = useState(false)

  useEffect(() => {
    if (autoConnect) {
      const newSocket = io(url, {
        transports: ['websocket', 'polling']
      })

      socketRef.current = newSocket
      setSocket(newSocket)

      newSocket.on('connect', () => {
        setIsConnected(true)
        console.log('Socket connected:', newSocket.id)
      })

      newSocket.on('disconnect', () => {
        setIsConnected(false)
        console.log('Socket disconnected')
      })

      newSocket.on('room-created', (data: RoomData) => {
        setRoomData(data)
        setIsRoomClosed(false) // Reset room closed state
        console.log('Room created:', data)
      })

      newSocket.on('room-joined', (data: RoomData) => {
        console.log('[useSocket] Successfully joined room:', data)
        setRoomData(data)
        setIsRoomClosed(false) // Reset room closed state
        setError(null) // Clear any previous errors
      })

      newSocket.on('member-joined', (data: { memberId: string; members: string[] }) => {
        console.log('Member joined:', data)
        setRoomData(prev => prev ? { ...prev, members: data.members } : null)
      })

      newSocket.on('member-left', (data: { memberId: string; members: string[] }) => {
        console.log('Member left:', data)
        setRoomData(prev => {
          if (prev) {
            // Check if the host is the one who left
            if (prev.hostId === data.memberId) {
              console.log('Host left the room. Closing room.')
              setIsRoomClosed(true)
              return null // Clear room data if host leaves
            }
            return { ...prev, members: data.members }
          }
          return null
        })
      })

      newSocket.on('error', (data: SocketError) => {
        console.error('Socket error:', data)
        setError(data.message)
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [url, autoConnect])

  const createRoom = (hostId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('create-room', { hostId })
    }
  }

  const joinRoom = (roomId: string, memberId: string) => {
    if (socketRef.current) {
      console.log('[useSocket] Attempting to join room:', { roomId, memberId, socketId: socketRef.current.id })
      socketRef.current.emit('join-room', { roomId, memberId })
    } else {
      console.error('[useSocket] Cannot join room - socket not connected')
    }
  }

  const leaveRoom = (roomId: string, memberId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('leave-room', { roomId, memberId })
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

  const clearError = () => {
    setError(null)
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
    isRoomClosed
  }
}
