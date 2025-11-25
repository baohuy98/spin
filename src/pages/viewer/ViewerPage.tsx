import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, Eye, Loader2, Maximize, Minimize, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import ChatView from '../../components/ChatView'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useSocket } from '../../hooks/useSocket'
import { useWebRTC } from '../../hooks/useWebRTC'
import type { Member } from '../../utils/interface/MemberInterface'

export default function ViewerPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams] = useSearchParams()

    // Get member from location state (logged-in user data from Home.tsx)
    const preSelectedMember = (location.state as { member?: Member })?.member

    // Get roomId from URL query parameter, state, or sessionStorage
    const [roomId, setRoomId] = useState<string>(() => {
        const urlRoomId = searchParams.get('roomId')
        const stateRoomId = (location.state as { roomId?: string })?.roomId
        const savedRoomData = sessionStorage.getItem('roomData')
        let sessionRoomId = ''

        if (savedRoomData) {
            try {
                const parsed = JSON.parse(savedRoomData)
                sessionRoomId = parsed.roomId
            } catch {
                // Invalid data
            }
        }

        // If we have a URL room ID and it's different from the session room ID,
        // we should prioritize the URL and clear the stale session data
        // to prevent useSocket from auto-joining the old room
        if (urlRoomId && sessionRoomId && urlRoomId !== sessionRoomId) {
            console.log('[ViewerPage] URL roomId differs from session roomId, clearing stale session data')
            sessionStorage.removeItem('roomData')
            sessionStorage.removeItem('roomDataTimestamp')
            sessionRoomId = ''
        }

        return urlRoomId || stateRoomId || sessionRoomId || ''
    })


    // Use the logged-in member data directly - no lookup in memberList
    const [viewerMember, setViewerMember] = useState<Member | null>(() => {
        // Priority: 1. Current login data (preSelectedMember), 2. sessionStorage (for page reload)
        if (preSelectedMember) {
            // Clear old sessionStorage if we have fresh login data
            sessionStorage.setItem('viewerMember', JSON.stringify(preSelectedMember))
            return preSelectedMember
        }

        // Fallback to sessionStorage for page reload scenario
        const savedMember = sessionStorage.getItem('viewerMember')
        if (savedMember) {
            try {
                return JSON.parse(savedMember)
            } catch {
                return null
            }
        }
        return null
    })

    const [hasJoined, setHasJoined] = useState(false)

    // Save viewer member to sessionStorage when it changes
    useEffect(() => {
        if (viewerMember) {
            sessionStorage.setItem('viewerMember', JSON.stringify(viewerMember))
        } else {
            sessionStorage.removeItem('viewerMember')
        }
    }, [viewerMember])

    // Redirect to home if not logged in
    useEffect(() => {
        if (!viewerMember) {
            toast.error('Please login first to join a room')
            setTimeout(() => navigate('/'), 1000)
        }
    }, [viewerMember, navigate])

    const [spinResult, setSpinResult] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const videoContainerRef = useRef<HTMLDivElement>(null)

    // Socket.io for room management
    const { socket, isConnected, roomData, error, joinRoom, onSpinResult, isRoomClosed, isHostDisconnected, messages, sendChatMessage, reactToMessage } = useSocket()

    // Handle host disconnection/reconnection toasts
    useEffect(() => {
        if (isHostDisconnected) {
            toast.warning('Host disconnected. Waiting for reconnection...', {
                duration: Infinity, // Keep showing until reconnected
                id: 'host-disconnect-toast'
            })
        } else {
            // Dismiss the warning toast if it exists
            toast.dismiss('host-disconnect-toast')

            // If we were previously disconnected (implied by this running when isHostDisconnected becomes false),
            // we could show a success message, but we need to be careful not to show it on initial load.
            // For now, the dismissal of the warning is good enough, or we can rely on 'host-reconnected' event.
        }
    }, [isHostDisconnected])

    // WebRTC for receiving screen share
    const { remoteStream, connectionState } = useWebRTC({
        socket,
        roomId: roomData?.roomId || null,
        isHost: false,
        isConnected
    })

    // Monitor WebRTC connection state for host disconnection
    useEffect(() => {
        if (connectionState === 'disconnected' || connectionState === 'failed') {
            toast.warning('Host disconnected. Waiting for reconnection...', {
                duration: Infinity,
                id: 'host-disconnect-toast'
            })
        } else if (connectionState === 'connected') {
            toast.dismiss('host-disconnect-toast')
        }
    }, [connectionState])

    const connectedRoomID = roomData?.roomId;
    useEffect(() => {
        if (isConnected && roomId && viewerMember && !hasJoined) {
            console.log('[ViewerPage] Auto-joining room:', roomId, 'with member:', viewerMember.genID, viewerMember.name)
            joinRoom(roomId, viewerMember.genID, viewerMember.name)
            setHasJoined(true)
        }
    }, [isConnected, roomId, viewerMember, hasJoined, joinRoom])

    // Listen for spin results
    useEffect(() => {
        if (socket) {
            onSpinResult((result: string) => {
                setSpinResult(result)
            })
        }
    }, [socket, onSpinResult]) // Added onSpinResult to dependency array for correctness

    // Listen for host reconnection (when host reloads page)
    useEffect(() => {
        if (socket) {
            socket.on('host-reconnected', () => {
                console.log('[ViewerPage] Host reconnected, WebRTC will be reset')
                toast.success('Host reconnected!')
                // WebRTC reset is handled in useWebRTC hook
            })

            return () => {
                socket.off('host-reconnected')
            }
        }
    }, [socket])

    // Handle room closed - show modal instead of auto-redirect
    const handleRoomClosedConfirm = () => {
        sessionStorage.removeItem('roomData')
        sessionStorage.removeItem('viewerMember')
        navigate('/')
    }

    // Attach remote stream to video element
    useEffect(() => {
        if (videoRef.current && remoteStream) {
            videoRef.current.srcObject = remoteStream
        }
    }, [remoteStream])

    // Toggle fullscreen mode
    const toggleFullscreen = async () => {
        if (!videoContainerRef.current) return

        if (!document.fullscreenElement) {
            await videoContainerRef.current.requestFullscreen()
        } else {
            await document.exitFullscreen()
        }
    }

    // Listen for fullscreen change events
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement)
        }

        document.addEventListener('fullscreenchange', handleFullscreenChange)
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange)
        }
    }, [])


    // Handle errors - reset join state when room not found
    useEffect(() => {
        if (error) {
            setHasJoined(false)
            // If room not found, clear sessionStorage
            if (error.includes('not found') || error.includes('does not exist')) {
                toast.error('Room not found. Please check the Room ID.')
                sessionStorage.removeItem('roomData')
                sessionStorage.removeItem('viewerMemberId')
            }
        }
    }, [error])



    // Main viewer interface
    return (
        <div className="min-h-screen bg-background pt-10 pb-10">
            <div className="container mx-auto px-4 h-[calc(100vh-120px)]">
                <div className="flex flex-col lg:flex-row gap-6 h-full">
                    {/* Left Panel - Screen Share */}
                    <div className="flex-1 flex flex-col gap-4">
                        {/* Room Info */}
                        <div className="bg-card border rounded-lg p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Viewer Mode</h3>
                                    <p className="text-sm text-muted-foreground">Room: {roomId || 'Not connected'}</p>
                                </div>
                                {/* Connection Status Badge */}
                                {error ? (
                                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-destructive text-white text-destructive-foreground flex items-center gap-1.5">
                                        <XCircle className="w-3 h-3" />
                                        Failed
                                    </div>
                                ) : connectedRoomID ? (
                                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white flex items-center gap-1.5">
                                        <CheckCircle2 className="w-3 h-3" />
                                        Connected
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-500 text-white flex items-center gap-1.5">
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                        Connecting...
                                    </div>
                                )}
                            </div>

                            {/* Error Alert */}
                            {error && (
                                <Alert variant="destructive" className='border-none p-0'>
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription className="ml-2">
                                        {error}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>


                        {/* Screen Share Display */}
                        <div className="flex-1 bg-card border rounded-lg p-6 flex flex-col">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-semibold">Host's Screen</h3>
                                {remoteStream && (
                                    <div className="flex items-center gap-2">
                                        <div className="px-3 py-1 bg-black/70 rounded-full text-white text-xs font-semibold flex items-center gap-2">
                                            <Eye className="w-3.5 h-3.5" />
                                            {roomData?.members?.length || 0}
                                        </div>
                                        <div className="px-3 py-1 bg-red-500 rounded-full text-white text-xs font-semibold flex items-center gap-2">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                            LIVE
                                        </div>
                                    </div>
                                )}
                            </div>


                            <div
                                ref={videoContainerRef}
                                className="flex-1 relative rounded-lg overflow-hidden min-h-50 bg-black group"
                            >
                                {remoteStream ? (
                                    <>
                                        <video
                                            ref={videoRef}
                                            autoPlay
                                            playsInline
                                            muted
                                            className="w-full h-full object-contain"
                                        />
                                        <button
                                            onClick={toggleFullscreen}
                                            className="absolute bottom-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white md:opacity-0 group-hover:opacity-100 transition-opacity"
                                            title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                        >
                                            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                                        </button>
                                    </>
                                ) : (
                                    <div className="absolute inset-0 flex  items-center justify-center">
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
                                    roomData.membersWithDetails?.map((member, index) => (
                                        <div
                                            key={member.genID}
                                            className="flex items-center gap-3 bg-accent rounded-lg p-3"
                                        >
                                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm truncate">
                                                    {member.genID === roomData.hostId ? `👑 ${member.name}` : member.name}
                                                </p>
                                                <p className="text-muted-foreground text-xs truncate">ID: {member.genID}</p>
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

                        {/* Chat & Comments */}
                        <div className="flex-1 min-h-[400px]">
                            <ChatView
                                roomId={roomId}
                                currentUserId={viewerMember?.genID || ''}
                                currentUserName={viewerMember?.name || ''}
                                messages={messages}
                                onSendMessage={(message) => {
                                    if (roomId) {
                                        sendChatMessage(roomId, viewerMember?.genID || '', viewerMember?.name || '', message)
                                    }
                                }}
                                onReactToMessage={(messageId, emoji) => {
                                    if (roomId) {
                                        reactToMessage(roomId, messageId, viewerMember?.genID || '', emoji)
                                    }
                                }}
                                isConnected={isConnected}
                            />
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

            {/* Room Closed Modal */}
            <AnimatePresence>
                {isRoomClosed && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl p-8 shadow-2xl max-w-md mx-4"
                        >
                            <div className="text-center space-y-6">
                                <div className="text-6xl">👋</div>
                                <h2 className="text-2xl font-bold text-gray-800">Room Closed</h2>
                                <p className="text-gray-600">
                                    The host has left and the room has been closed.
                                </p>
                                <button
                                    onClick={handleRoomClosedConfirm}
                                    className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                                >
                                    OK
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}