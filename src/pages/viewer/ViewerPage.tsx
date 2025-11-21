import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useSocket } from '../../hooks/useSocket'
import { useWebRTC } from '../../hooks/useWebRTC'

export default function ViewerPage() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const genID = searchParams.get('genId') || ''
    const roomId = searchParams.get('roomId')


    const [hasJoined, setHasJoined] = useState(false)

    const [spinResult, setSpinResult] = useState<string | null>(null)

    const videoRef = useRef<HTMLVideoElement>(null)

    // Socket.io for room management
    const { socket, isConnected, roomData, error, joinRoom, onSpinResult, isRoomClosed } = useSocket()

    // WebRTC for receiving screen share
    const { remoteStream } = useWebRTC({
        socket,
        roomId: roomData?.roomId || null,
        isHost: false
    })

    // Auto-join room if roomId is provided in URL
    useEffect(() => {
        if (isConnected && roomId && genID && !hasJoined) {
            joinRoom(roomId, genID)
            setHasJoined(true)
        }
    }, [isConnected, roomId, genID, hasJoined])

    // Listen for spin results
    useEffect(() => {
        if (socket) {
            onSpinResult((result: string) => {
                setSpinResult(result)
            })
        }
    }, [socket, onSpinResult]) // Added onSpinResult to dependency array for correctness

    // Redirect if room is closed
    useEffect(() => {
        if (isRoomClosed) {
            alert('The host has left, and the room has been closed.')
            navigate('/')
        }
    }, [isRoomClosed, navigate]) // Added navigate to dependency array for correctness

    // Attach remote stream to video element
    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    // Handle errors - reset join state when room not found
    useEffect(() => {
        if (error) {
            setHasJoined(false)
        }
    }, [error])

    // Main viewer interface
    return (
        <div className="min-h-screen bg-background pt-20 pb-10">
            <div className="container mx-auto px-4 h-[calc(100vh-120px)]">
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* Left Panel - Screen Share */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Room Info */}
                        <div className="bg-card border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Viewer Mode</h3>
                                    <p className="text-sm text-muted-foreground">Room: {roomId || 'Not connected'}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-green-500' : 'bg-yellow-500'
                                    } text-white`}>
                                    {isConnected ? 'Connected' : 'Connecting...'}
                                </div>
                            </div>
                        </div>

                        {/* Screen Share Display */}
                        <div className="flex-1 bg-card border rounded-lg p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold">Host's Screen</h3>
                                {remoteStream && (
                                    <div className="px-3 py-1 bg-red-500 rounded-full text-white text-xs font-semibold flex items-center gap-2">
                                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                        LIVE
                                    </div>
                                )}
                            </div>

                            {error && (
                                <div className="bg-destructive/10 border border-destructive rounded-lg p-4 mb-4">
                                    <p className="text-destructive text-sm">{error}</p>
                                </div>
                            )}

                            <div className="flex-1 relative rounded-lg overflow-hidden bg-black">
                                {remoteStream ? (
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        className="w-full h-full object-contain"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center space-y-4">
                                            <div className="text-6xl opacity-30">📺</div>
                                            <p className="text-muted-foreground text-lg font-medium">
                                                Waiting for host to start screen sharing...
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Reserved for Future Features */}
                    <div className="lg:w-96 flex flex-col gap-4">
                        {/* Participants */}
                        <div className="bg-card border rounded-lg p-6">
                            <h3 className="text-xl font-semibold mb-4">Participants</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {roomData?.members && roomData.members.length > 0 ? (
                                    roomData.members.map((memberId, index) => (
                                        <div
                                            key={memberId}
                                            className="flex items-center gap-3 bg-accent rounded-lg p-3"
                                        >
                                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm truncate">
                                                    {memberId === roomData.hostId ? '👑 Host' : `Viewer`}
                                                </p>
                                                <p className="text-muted-foreground text-xs truncate">ID: {memberId}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-4">No participants yet</p>
                                )}
                            </div>
                        </div>

                        {/* Spin Result Display */}
                        {spinResult && (
                            <div className="bg-linear-to-br from-yellow-400 to-orange-500 rounded-lg p-6 shadow-lg">
                                <div className="text-center space-y-3">
                                    <div className="text-5xl">🎉</div>
                                    <h3 className="text-lg font-bold text-white">Winner!</h3>
                                    <div className="text-3xl font-bold text-white bg-white/20 rounded-lg py-3">
                                        {spinResult}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Placeholder for Future Features */}
                        <div className="flex-1 bg-card border rounded-lg p-6 flex flex-col">
                            <h3 className="text-xl font-semibold mb-4">
                                Chat & Comments
                            </h3>
                            <div className="flex-1 flex items-center justify-center">
                                <div className="text-center space-y-3">
                                    <div className="text-5xl opacity-30">💬</div>
                                    <p className="text-muted-foreground text-sm">
                                        Feature coming soon...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spin Result Modal */}
            <AnimatePresence>
                {spinResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50"
                    >
                        <div className="bg-white rounded-2xl p-8 shadow-2xl">
                            <div className="text-center space-y-4">
                                <div className="text-6xl">🎊</div>
                                <h2 className="text-3xl font-bold text-gray-800">Winner Announced!</h2>
                                <div className="text-4xl font-bold text-purple-600 py-6 bg-purple-100 rounded-xl px-8">
                                    {spinResult}
                                </div>
                                <p className="text-gray-500 text-sm">This message will disappear in 5 seconds</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}