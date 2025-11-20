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

export function useSocket(options: UseSocketOptions = {}) {
  const { url = 'http://localhost:3001', autoConnect = true } = options
  const socketRef = useRef<Socket | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [roomData, setRoomData] = useState<RoomData | null>(null)

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
        console.log('Room created:', data)
      })

      newSocket.on('room-joined', (data: RoomData) => {
        setRoomData(data)
        console.log('Room joined:', data)
      })

      newSocket.on('member-joined', (data: { memberId: string; members: string[] }) => {
        console.log('Member joined:', data)
        setRoomData(prev => prev ? { ...prev, members: data.members } : null)
      })

      newSocket.on('member-left', (data: { memberId: string; members: string[] }) => {
        console.log('Member left:', data)
        setRoomData(prev => prev ? { ...prev, members: data.members } : null)
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
      socketRef.current.emit('join-room', { roomId, memberId })
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

  return {
    socket,
    isConnected,
    roomData,
    createRoom,
    joinRoom,
    leaveRoom,
    emitSpinResult,
    onSpinResult
  }
}
