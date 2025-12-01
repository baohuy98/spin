import { Device, types as MediasoupClientTypes } from 'mediasoup-client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Socket } from 'socket.io-client'

type Transport = MediasoupClientTypes.Transport
type Producer = MediasoupClientTypes.Producer
type Consumer = MediasoupClientTypes.Consumer
type RtpCapabilities = MediasoupClientTypes.RtpCapabilities

interface UseMediasoupWebRTCOptions {
  socket: Socket | null
  roomId: string | null
  isHost: boolean
  isConnected?: boolean
}

export function useMediasoupWebRTC({
  socket,
  roomId,
  isHost,
  isConnected = false,
}: UseMediasoupWebRTCOptions) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)
  const [isSharing, setIsSharing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<string>('new')

  const deviceRef = useRef<Device | null>(null)
  const sendTransportRef = useRef<Transport | null>(null)
  const recvTransportRef = useRef<Transport | null>(null)
  const sendTransportIdRef = useRef<string | null>(null) // Store custom transport ID
  const recvTransportIdRef = useRef<string | null>(null) // Store custom transport ID
  const producersRef = useRef<Map<string, Producer>>(new Map())
  const consumersRef = useRef<Map<string, Consumer>>(new Map())
  const localStreamRef = useRef<MediaStream | null>(null)
  const consumingProducersRef = useRef<Set<string>>(new Set()) // Track producers being consumed

  // Initialize mediasoup Device and load router RTP capabilities
  useEffect(() => {
    if (!socket || !roomId || !isConnected) return

    const initDevice = async () => {
      try {
        console.log('[FE-MEDIASOUP] 🎛️  Initializing mediasoup device for room:', roomId, 'isHost:', isHost)
        // Create device
        const device = new Device()
        deviceRef.current = device

        // Get router RTP capabilities from server
        console.log('[FE-MEDIASOUP] 📤 Requesting router RTP capabilities for room:', roomId)
        socket.emit('getRouterRtpCapabilities', { roomId })

        socket.once('routerRtpCapabilities', async (data: { rtpCapabilities: RtpCapabilities }) => {
          console.log('[FE-MEDIASOUP] ✅ Received router RTP capabilities, loading device...')
          await device.load({ routerRtpCapabilities: data.rtpCapabilities })
          console.log('[FE-MEDIASOUP] ✅ Device loaded successfully', data.rtpCapabilities)

          // If viewer, request existing producers after device is ready
          if (!isHost) {
            console.log('[FE-MEDIASOUP] 📤 Viewer requesting existing producers for room:', roomId)
            socket.emit('getProducers', { roomId })
          }
        })
      } catch (err) {
        console.error('[FE-MEDIASOUP] ❌ Failed to initialize device:', err)
        setError('Failed to initialize media device')
      }
    }
    initDevice()
  }, [socket, roomId, isHost, isConnected])

  // Helper functions must be defined before useEffect
  const produceMedia = useCallback(async (stream: MediaStream) => {
    if (!sendTransportRef.current) {
      console.error('[FE-MEDIASOUP] ❌ Send transport not ready')
      return
    }

    try {
      console.log('[FE-MEDIASOUP] 🎬 Starting media production...')
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        console.log('[FE-MEDIASOUP] 📹 Producing video track...')
        const videoProducer = await sendTransportRef.current.produce({
          track: videoTrack,
        })
        producersRef.current.set('video', videoProducer)
        console.log('[FE-MEDIASOUP] ✅ Video producer created:', videoProducer.id)
      }

      const audioTrack = stream.getAudioTracks()[0]
      if (audioTrack) {
        console.log('[FE-MEDIASOUP] 🎤 Producing audio track...')
        const audioProducer = await sendTransportRef.current.produce({
          track: audioTrack,
        })
        producersRef.current.set('audio', audioProducer)
        console.log('[FE-MEDIASOUP] ✅ Audio producer created:', audioProducer.id)
      }
    } catch (err) {
      console.error('[FE-MEDIASOUP] ❌ Failed to produce media:', err)
      setError('Failed to share media')
    }
  }, [])

  const consumeMedia = useCallback(async (producerId: string) => {
    // Check if already consuming this producer
    if (consumingProducersRef.current.has(producerId)) {
      console.log(`[FE-MEDIASOUP] ℹ️  Already consuming producer: ${producerId}`)
      return
    }

    if (!recvTransportRef.current || !deviceRef.current || !recvTransportIdRef.current) {
      console.error('[FE-MEDIASOUP] ❌ Recv transport or device not ready', {
        hasRecvTransport: !!recvTransportRef.current,
        hasDevice: !!deviceRef.current,
        hasTransportId: !!recvTransportIdRef.current,
      })
      return
    }

    // Mark as being consumed
    consumingProducersRef.current.add(producerId)

    try {
      const rtpCapabilities = deviceRef.current.rtpCapabilities

      console.log('[FE-MEDIASOUP] 📤 Requesting consume:', {
        roomId,
        transportId: recvTransportIdRef.current,
        producerId,
      })

      // Create unique event handlers for this consume request
      const handleConsumed = async (data: any) => {
        try {
          console.log(`[Mediasoup] Received consumed event [${data.kind}]:`, data.id)

          // Clean up error handler
          socket?.off('error', handleError)
          console.log('data in consumed handler', data)
          const consumer = await recvTransportRef.current!.consume({
            id: data.id,
            producerId: data.producerId,
            kind: data.kind,
            rtpParameters: data.rtpParameters,
          })

          consumersRef.current.set(data.id, consumer)

          // Resume consumer
          socket?.emit('resumeConsumer', { roomId, consumerId: data.id })

          // Add track to remote stream
          const track = consumer.track
          setRemoteStream((prevStream) => {
            // If no existing stream, create new one
            if (!prevStream) {
              const newStream = new MediaStream()
              newStream.addTrack(track)
              console.log('[Mediasoup] Created new remote stream with track')
              return newStream
            }

            // Check if this track is already in the stream
            const existingTrack = prevStream.getTracks().find(t => t.id === track.id)
            if (existingTrack) {
              console.log('[Mediasoup] Track already in stream, skipping')
              return prevStream
            }

            // Add new track to existing stream
            prevStream.addTrack(track)
            console.log('[Mediasoup] Added track to existing stream, total tracks:', prevStream.getTracks().length)
            return prevStream
          })

          console.log(`[Mediasoup] Consumer created [${data.kind}]:`, data.id)
        } catch (err) {
          console.error('[Mediasoup] Error in consumed handler:', err)
          consumingProducersRef.current.delete(producerId)
        }
      }

      const handleError = (error: { message: string }) => {
        console.error('[Mediasoup] Consume failed:', error)
        // Clean up consumed handler
        socket?.off('consumed', handleConsumed)
        // Remove from consuming set on error so it can be retried
        consumingProducersRef.current.delete(producerId)
      }

      // Register handlers
      socket?.once('consumed', handleConsumed)
      socket?.once('error', handleError)

      // Request to consume - use the custom transportId from backend
      socket?.emit('consume', {
        roomId,
        transportId: recvTransportIdRef.current,
        producerId,
        rtpCapabilities,
      })
    } catch (err) {
      console.error('[Mediasoup] Failed to consume media:', err)
      // Remove from consuming set on error so it can be retried
      consumingProducersRef.current.delete(producerId)
    }
  }, [socket, roomId])

  // Handle mediasoup signaling events
  useEffect(() => {
    if (!socket || !roomId) return

    // Transport created
    socket.on('transportCreated', async (data: any) => {
      console.log(`[Mediasoup] Transport created [${data.direction}]`)

      const device = deviceRef.current
      if (!device) {
        console.error('[Mediasoup] Device not initialized')
        return
      }

      try {
        if (data.direction === 'send') {
          // Store the custom transport ID from backend
          sendTransportIdRef.current = data.transportId

          const transport = device.createSendTransport({
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters,
          })

          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              console.log('[Mediasoup] Send transport connecting...')
              socket.emit('connectTransport', {
                roomId,
                transportId: sendTransportIdRef.current,
                dtlsParameters,
              })

              socket.once('transportConnected', () => {
                console.log('[Mediasoup] Send transport connected')
                callback()
              })
            } catch (err) {
              console.error('[Mediasoup] Send transport connect error:', err)
              errback(err as Error)
            }
          })

          transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
              console.log(`[Mediasoup] Producing ${kind}...`)
              socket.emit('produce', {
                roomId,
                transportId: sendTransportIdRef.current,
                kind,
                rtpParameters,
              })

              socket.once('produced', (producedData: { kind: string; id: string }) => {
                console.log(`[Mediasoup] Producer created [${producedData.kind}]:`, producedData.id)
                callback({ id: producedData.id })
              })
            } catch (err) {
              console.error('[Mediasoup] Produce error:', err)
              errback(err as Error)
            }
          })

          transport.on('connectionstatechange', (state) => {
            console.log('[Mediasoup] Send transport state:', state)
            setConnectionState(state)
          })

          sendTransportRef.current = transport
          console.log('[Mediasoup] Send transport ready')

          // If we have a local stream waiting to be sent, produce it now
          if (localStreamRef.current) {
            await produceMedia(localStreamRef.current)
          }
        } else if (data.direction === 'recv') {
          // Store the custom transport ID from backend
          recvTransportIdRef.current = data.transportId

          const transport = device.createRecvTransport({
            id: data.id,
            iceParameters: data.iceParameters,
            iceCandidates: data.iceCandidates,
            dtlsParameters: data.dtlsParameters,
          })

          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              console.log('[Mediasoup] Recv transport connecting...')
              socket.emit('connectTransport', {
                roomId,
                transportId: recvTransportIdRef.current,
                dtlsParameters,
              })

              socket.once('transportConnected', () => {
                console.log('[Mediasoup] Recv transport connected')
                callback()
              })
            } catch (err) {
              console.error('[Mediasoup] Recv transport connect error:', err)
              errback(err as Error)
            }
          })

          transport.on('connectionstatechange', (state) => {
            console.log('[Mediasoup] Recv transport state:', state)
            setConnectionState(state)
          })

          recvTransportRef.current = transport
          console.log('[Mediasoup] Recv transport ready')
        }
      } catch (err) {
        console.error('[Mediasoup] Failed to create transport:', err)
        setError('Failed to create media transport')
      }
    })

    // New producer available
    socket.on('newProducer', async (data: { producerId: string; kind: string }) => {
      if (isHost) return // Host doesn't consume

      console.log(`[Mediasoup] New producer available [${data.kind}]:`, data.producerId)

      // Create receive transport if not exists
      if (!recvTransportRef.current) {
        console.log('[Mediasoup] No recv transport, creating one first')
        socket.emit('createTransport', { roomId, direction: 'recv' })

        // Store the producer ID to consume after transport is ready
        const handleTransportCreated = (transportData: any) => {
          if (transportData.direction === 'recv') {
            console.log('[Mediasoup] Recv transport created, waiting 500ms before consuming')
            // Wait a bit for transport to be fully set up
            setTimeout(() => {
              console.log('[Mediasoup] Attempting to consume producer:', data.producerId)
              consumeMedia(data.producerId)
            }, 500)
          }
        }

        socket.once('transportCreated', handleTransportCreated)
      } else {
        // Transport exists, but make sure transport ID is set
        if (!recvTransportIdRef.current) {
          console.warn('[Mediasoup] Recv transport exists but ID not set, waiting...')
          setTimeout(() => consumeMedia(data.producerId), 500)
        } else {
          console.log('[Mediasoup] Recv transport ready, consuming immediately')
          await consumeMedia(data.producerId)
        }
      }
    })

    // Producer closed
    socket.on('producerClosed', (data: { producerId: string }) => {
      if (isHost) return

      console.log('[Mediasoup] Producer closed:', data.producerId)

      // Remove from consuming set
      consumingProducersRef.current.delete(data.producerId)

      // Find and close consumers for this producer
      consumersRef.current.forEach((consumer, consumerId) => {
        if (consumer.producerId === data.producerId) {
          console.log('[Mediasoup] Closing consumer:', consumerId)
          consumer.close()
          consumersRef.current.delete(consumerId)
        }
      })

      // Clear remote stream
      setRemoteStream(null)
    })

    // Existing producers list
    socket.on('producers', async (data: { producers: string[] }) => {
      console.log('[Mediasoup] Existing producers:', data.producers)

      // Create receive transport first if not exists
      if (!recvTransportRef.current && data.producers.length > 0) {
        socket.emit('createTransport', { roomId, direction: 'recv' })
        // Wait for transport to be created before consuming
        socket.once('transportCreated', async () => {
          for (const producerId of data.producers) {
            await consumeMedia(producerId)
          }
        })
      } else {
        for (const producerId of data.producers) {
          await consumeMedia(producerId)
        }
      }
    })

    // Listen for stop sharing
    socket.on('stop-sharing', () => {
      if (isHost) return

      console.log('[Mediasoup] Host stopped sharing, cleaning up')

      // Close all consumers
      consumersRef.current.forEach((consumer, consumerId) => {
        console.log('[Mediasoup] Closing consumer:', consumerId)
        consumer.close()
      })
      consumersRef.current.clear()

      // Clear consuming producers set
      consumingProducersRef.current.clear()

      // Clear remote stream
      setRemoteStream(null)
    })

    return () => {
      socket.off('transportCreated')
      socket.off('newProducer')
      socket.off('producerClosed')
      socket.off('producers')
      socket.off('stop-sharing')
    }
  }, [socket, roomId, isHost, consumeMedia, produceMedia])

  const startScreenShare = async () => {
    if (!isHost) {
      setError('Only the host can share screen')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
        },
        audio: false,
      })

      localStreamRef.current = stream
      setLocalStream(stream)
      setIsSharing(true)
      setError(null)

      console.log('[Mediasoup] Screen share started, stream tracks:', stream.getTracks())

      // Handle when user stops sharing via browser UI
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare()
      }

      // Create send transport if not exists
      if (!sendTransportRef.current) {
        socket?.emit('createTransport', { roomId, direction: 'send' })
      } else {
        // Transport already exists, produce immediately
        await produceMedia(stream)
      }
    } catch (err) {
      console.error('[Mediasoup] Error starting screen share:', err)
      setError('Failed to start screen sharing')
      setIsSharing(false)
    }
  }

  const stopScreenShare = () => {
    console.log('[Mediasoup] Stopping screen share')

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
      setLocalStream(null)
    }

    // Close all producers and notify backend
    producersRef.current.forEach((producer) => {
      console.log('[Mediasoup] Closing producer:', producer.id)
      // Notify backend to close producer
      if (socket && roomId) {
        socket.emit('closeProducer', { roomId, producerId: producer.id })
      }
      producer.close()
    })
    producersRef.current.clear()

    setIsSharing(false)

    // Notify viewers that screen sharing has stopped
    if (socket && roomId) {
      socket.emit('stop-sharing', { roomId })
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('[Mediasoup] Cleaning up...')

      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      const producers = producersRef.current
      const consumers = consumersRef.current
      const sendTransport = sendTransportRef.current
      const recvTransport = recvTransportRef.current

      producers.forEach((producer) => producer.close())
      producers.clear()

      consumers.forEach((consumer) => consumer.close())
      consumers.clear()

      sendTransport?.close()
      recvTransport?.close()

      consumingProducersRef.current.clear()
    }
  }, [])

  return {
    localStream,
    remoteStream,
    isSharing,
    error,
    connectionState,
    startScreenShare,
    stopScreenShare,
  }
}
