import { useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

interface UseWebRTCOptions {
  socket: Socket | null
  roomId: string | null
  isHost: boolean
}

export function useWebRTC({ socket, roomId, isHost }: UseWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  // WebRTC configuration
  const configuration: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  }

  useEffect(() => {
    if (!socket || !roomId) return

    // Listen for WebRTC signaling events
    socket.on('offer', async (data: { offer: RTCSessionDescriptionInit; from: string }) => {
      if (!isHost) {
        await handleReceiveOffer(data.offer)
      }
    })

    socket.on('answer', async (data: { answer: RTCSessionDescriptionInit }) => {
      if (isHost && peerConnectionRef.current) {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescription(data.answer)
        )
      }
    })

    socket.on('ice-candidate', async (data: { candidate: RTCIceCandidateInit }) => {
      if (peerConnectionRef.current && data.candidate) {
        await peerConnectionRef.current.addIceCandidate(
          new RTCIceCandidate(data.candidate)
        )
      }
    })

    return () => {
      socket.off('offer')
      socket.off('answer')
      socket.off('ice-candidate')
    }
  }, [socket, roomId, isHost])

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

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      // Create peer connection and send offer
      await createPeerConnection(stream)
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

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }

    setIsSharing(false)

    // Notify viewers that screen sharing has stopped
    if (socket && roomId) {
      socket.emit('stop-sharing', { roomId })
    }
  }

  const createPeerConnection = async (stream: MediaStream) => {
    if (!socket || !roomId) return

    const peerConnection = new RTCPeerConnection(configuration)
    peerConnectionRef.current = peerConnection

    // Add tracks to peer connection
    stream.getTracks().forEach(track => {
      peerConnection.addTrack(track, stream)
    })

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    // Create and send offer
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    socket.emit('offer', {
      roomId,
      offer: offer
    })
  }

  const handleReceiveOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!socket || !roomId) return

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
        socket.emit('ice-candidate', {
          roomId,
          candidate: event.candidate.toJSON()
        })
      }
    }

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await peerConnection.createAnswer()
    await peerConnection.setLocalDescription(answer)

    socket.emit('answer', {
      roomId,
      answer: answer
    })
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
    }
  }, [])

  return {
    localStream,
    remoteStream,
    isSharing,
    error,
    startScreenShare,
    stopScreenShare
  }
}
