import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

interface UseWebRTCOptions {
  socket: Socket | null
  roomId: string | null
  isHost: boolean
  isConnected?: boolean
}

export function useWebRTC({ socket, roomId, isHost, isConnected = false }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new')

  // For host: maintain multiple peer connections (one per viewer)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  // For viewer: single peer connection to host
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  // Track viewers who joined before screen sharing started
  const pendingViewersRef = useRef<Set<string>>(new Set())
  // Queue for ICE candidates that arrive before remote description is set
  const iceCandidatesQueueRef = useRef<RTCIceCandidateInit[]>([])

  // WebRTC configuration
  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }
  const handleReceiveOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!socket || !roomId) return

    console.log('Viewer handling offer')

    // Close existing peer connection if any (host might have restarted sharing)
    if (peerConnectionRef.current) {
      console.log('Closing existing peer connection before creating new one')
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      console.log('Received remote track:', event.streams[0])
      setRemoteStream(event.streams[0])
    }

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate to host')
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log('[VIEWER] Peer connection state:', peerConnection.connectionState)
      setConnectionState(peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        console.error('[VIEWER] Connection failed')
        setError('WebRTC connection failed')
      }
    }

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log('[VIEWER] ICE connection state:', peerConnection.iceConnectionState)
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))

    // Process queued ICE candidates
    if (iceCandidatesQueueRef.current.length > 0) {
      console.log('[VIEWER] Processing queued ICE candidates:', iceCandidatesQueueRef.current.length)
      for (const candidate of iceCandidatesQueueRef.current) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
      }
      iceCandidatesQueueRef.current = []
    }

    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    console.log('Sending answer to host')
    socket.emit('answer', {
      roomId,
      answer: answer
    })
  }

  const createPeerConnectionForViewer = async (viewerId: string, stream: MediaStream) => {
    if (!socket || !roomId) return

    // Check if peer connection already exists for this viewer
    const existingConnection = peerConnectionsRef.current.get(viewerId)
    if (existingConnection) {
      console.log('Peer connection already exists for viewer:', viewerId, '- closing old connection')
      existingConnection.close()
      peerConnectionsRef.current.delete(viewerId)
    }

    console.log('Creating peer connection for viewer:', viewerId)

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionsRef.current.set(viewerId, peerConnection)

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      console.log('Adding track to peer connection:', track.kind)
      peerConnection.addTrack(track, stream)
    })

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        console.log('Sending ICE candidate to viewer:', viewerId)
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON(),
          to: viewerId
        })
      }
    }

    // Monitor connection state
    peerConnection.onconnectionstatechange = () => {
      console.log(`[HOST] Peer connection state with ${viewerId}:`, peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        console.error(`[HOST] Connection failed with viewer ${viewerId}`)
      }
    }

    // Monitor ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log(`[HOST] ICE connection state with ${viewerId}:`, peerConnection.iceConnectionState)
    }

    // Create and send offer
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    console.log('Sending offer to viewer:', viewerId)
    socket.emit('offer', {
      roomId,
      offer: offer,
      to: viewerId
    })
  }

  useEffect(() => {
    if (!socket || !roomId) return

    // Listen for WebRTC signaling events
    socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (!isHost) {
        console.log('Viewer received offer from:', data.from)
        await handleReceiveOffer(data.offer)
      }
    })

    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit; from: string }) => {
      if (isHost) {
        console.log('Host received answer from:', data.from)
        const peerConnection = peerConnectionsRef.current.get(data.from)
        if (peerConnection) {
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          )
        }
      }
    })

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit; from: string }) => {
      console.log('Received ICE candidate from:', data.from)
      if (isHost) {
        const peerConnection = peerConnectionsRef.current.get(data.from)
        if (peerConnection && data.candidate) {
          await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate))
        }
      } else {
        if (peerConnectionRef.current && data.candidate) {
          const pc = peerConnectionRef.current
          if (pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate))
          } else {
            console.log('[VIEWER] Queueing ICE candidate (remote description not set)')
            iceCandidatesQueueRef.current.push(data.candidate)
          }
        }
      }
    })

    // Listen for new viewer joining (host only)
    socket.on('viewer-joined', async (data: { viewerId: string }) => {
      if (isHost) {
        console.log('New viewer joined:', data.viewerId)
        if (localStreamRef.current) {
          // Host is already sharing, create connection immediately
          console.log('Host already sharing, creating peer connection for:', data.viewerId)
          await createPeerConnectionForViewer(data.viewerId, localStreamRef.current)
        } else {
          // Host not sharing yet, add to pending viewers
          console.log('Host not sharing yet, adding viewer to pending list:', data.viewerId)
          pendingViewersRef.current.add(data.viewerId)
        }
      }
    })

    // Listen for stop sharing
    socket.on('stop-sharing', () => {
      console.log('Host stopped sharing')
      setRemoteStream(null)
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    })

    // Listen for existing viewers (when host restarts screen sharing)
    socket.on('existing-viewers', async (data: { viewerIds: string[] }) => {
      if (isHost && localStreamRef.current) {
        console.log('Received existing viewers to reconnect:', data.viewerIds)
        for (const viewerId of data.viewerIds) {
          await createPeerConnectionForViewer(viewerId, localStreamRef.current)
        }
      }
    })

    // Listen for host reconnection (viewer only) - reset WebRTC state
    socket.on('host-reconnected', () => {
      if (!isHost) {
        console.log('[VIEWER] Host reconnected, resetting WebRTC state')
        // Close existing peer connection
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
          peerConnectionRef.current = null
        }
        setRemoteStream(null)
        // Request stream from host
        socket.emit('request-stream', { roomId })
      }
    })

    // Listen for stream request (host only) - viewer is ready for WebRTC
    socket.on('request-stream', (data: { viewerId: string }) => {
      if (isHost && localStreamRef.current) {
        console.log('[HOST] Viewer requested stream:', data.viewerId)
        createPeerConnectionForViewer(data.viewerId, localStreamRef.current)
      }
    })

    // For viewer: request stream when WebRTC is ready (handles page reload timing issue)
    if (!isHost && !peerConnectionRef.current && isConnected) {
      console.log('[VIEWER] WebRTC ready and socket connected, requesting stream from host')
      socket.emit('request-stream', { roomId })
    }

    return () => {
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
      socket.off('viewer-joined')
      socket.off('stop-sharing')
      socket.off('existing-viewers')
      socket.off('host-reconnected')
      socket.off('request-stream')
    }
  }, [socket, roomId, isHost, isConnected])

  const startScreenShare = async () => {
    if (!isHost) {
      setError('Only the host can share screen')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor'
        },
        audio: false
      })

      localStreamRef.current = stream
      setLocalStream(stream)
      setIsSharing(true)
      setError(null)

      console.log('Screen share started, stream tracks:', stream.getTracks())

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      // Create peer connections for all pending viewers
      if (pendingViewersRef.current.size > 0) {
        console.log('Creating peer connections for pending viewers:', Array.from(pendingViewersRef.current))
        for (const viewerId of pendingViewersRef.current) {
          await createPeerConnectionForViewer(viewerId, stream)
        }
        pendingViewersRef.current.clear()
      }

      // Notify backend that host is ready to share
      if (socket && roomId) {
        socket.emit('host-ready-to-share', { roomId })
      }
    } catch (err) {
      console.error('Error starting screen share:', err)
      setError('Failed to start screen sharing')
      setIsSharing(false)
    }
  }

  const stopScreenShare = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    // Close all peer connections for host
    if (isHost) {
      peerConnectionsRef.current.forEach(pc => pc.close())
      peerConnectionsRef.current.clear()
    } else {
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
        peerConnectionRef.current = null
      }
    }

    setIsSharing(false)

    // Clear pending viewers
    pendingViewersRef.current.clear()

    // Notify viewers that screen sharing has stopped
    if (socket && roomId) {
      socket.emit('stop-sharing', { roomId })
    }
  }





  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (isHost) {
        peerConnectionsRef.current.forEach(pc => pc.close())
        peerConnectionsRef.current.clear()
      } else {
        if (peerConnectionRef.current) {
          peerConnectionRef.current.close()
        }
      }
    }
  }, [isHost])

  return {
    localStream,
    remoteStream,
    isSharing,
    error,
    connectionState,
    startScreenShare,
    stopScreenShare
  }
}
