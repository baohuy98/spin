import { AlertCircle, CheckCircle2, Eye, Loader2, Maximize, Minimize, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import ChatView from '../../components/ChatView'
import LivestreamReactions from '../../components/LivestreamReactions'
import { LunarNewYearEffect } from '../../components/LunarNewYearEffect'
import { SantaImage } from '../../components/SantaImage'
import { Snowfall } from '../../components/Snowfall'
import { useTheme } from '../../components/ThemeProvider'
import { useViewTheme } from '../../components/ViewThemeProvider'
import { Alert, AlertDescription } from '../../components/ui/alert'
import { useMediasoupWebRTC } from '../../hooks/useMediasoupWebRTC'
import { useSocket } from '../../hooks/useSocket'
import type { Member } from '../../utils/interface/MemberInterface'
import { generateUserId } from '../../utils/generateUserId'

import {
    Dialog,
    DialogContent
} from "@/components/ui/dialog"

export default function ViewerPage() {
    const navigate = useNavigate()
    const location = useLocation()
    const { viewTheme, setViewTheme } = useViewTheme()
    const { theme } = useTheme()
    const [searchParams] = useSearchParams()


    const [roomId, setRoomId] = useState<string>(() => {
        return searchParams.get('roomId') || '';
    })

    const viewerMember = (location.state as { member?: Member })?.member;

    // Generate unique memberId for this viewer (persisted in sessionStorage for reconnection)
    const [memberId] = useState<string>(() => {
        const stored = sessionStorage.getItem('viewerMemberId')
        if (stored) {
            console.log('[ViewerPage] Using existing memberId from sessionStorage:', stored)
            return stored
        }
        const newId = generateUserId()
        sessionStorage.setItem('viewerMemberId', newId)
        console.log('[ViewerPage] Generated new memberId:', newId)
        return newId
    })

    const [hasJoined, setHasJoined] = useState(false)
    const [spinResult, setSpinResult] = useState<string | null>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const videoRef = useRef<HTMLVideoElement>(null)
    const videoContainerRef = useRef<HTMLDivElement>(null)

    // Redirect to home if not logged in, preserving roomId for after login
    useEffect(() => {
        if (!viewerMember) {
            toast.error('Please login first to join a room')
            // Preserve the roomId so user can auto-join after login
            if (roomId) {
                sessionStorage.setItem('pendingRoomId', roomId)
            }
            setTimeout(() => navigate('/'), 1000)
        }
    }, [viewerMember, navigate, roomId])

    // Socket.io for room management
    const { socket, isConnected, roomData, error, joinRoom, leaveRoom, onSpinResult, isRoomDeleted, isHostDisconnected, messages, sendChatMessage, reactToMessage, livestreamReactions, sendLivestreamReaction } = useSocket()

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
        }
    }, [isHostDisconnected])

    // WebRTC for receiving screen share
    const { remoteStream, connectionState } = useMediasoupWebRTC({
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

    useEffect(() => {
        if (isConnected && roomId && viewerMember && !hasJoined) {
            console.log('[ViewerPage] Auto-joining room:', roomId, 'with memberId:', memberId, 'name:', viewerMember.name)
            joinRoom(roomId, memberId, viewerMember.name)
            setHasJoined(true)
        }
    }, [isConnected, roomId, viewerMember, hasJoined, joinRoom])

    // Listen for spin results - only show popup if this viewer was picked
    useEffect(() => {
        let timer;
        if (socket && viewerMember) {
            onSpinResult((result: string) => {
                // Only show the result popup if this viewer was picked
                if (result === viewerMember.name) {
                    setSpinResult(result);
                    timer = setTimeout(() => { setSpinResult(null) }, 5000)
                }
            })
        }
        return clearTimeout(timer);
    }, [socket, onSpinResult, viewerMember]) // Added viewerMember to dependency array

    // Listen for host reconnection (when host reloads page)
    useEffect(() => {
        if (socket) {
            socket.on('host-reconnected', () => {
                console.log('[ViewerPage] Host reconnected, WebRTC will be reset')
                toast.success('Host reconnected!')
            })
        }
    }, [socket])

    // Listen for theme updates from the host
    useEffect(() => {
        if (socket) {
            socket.on('theme-updated', (data: { theme: string }) => {
                console.log('[ViewerPage] Theme updated by host to:', data.theme)
                setViewTheme(data.theme as 'none' | 'christmas' | 'lunar-new-year')
            })
        }

    }, [socket, setViewTheme])

    // Handle room deletion - redirect to homepage
    useEffect(() => {
        if (isRoomDeleted) {
            console.log('[ViewerPage] Room deleted, redirecting to home page')
            toast.error('The host has left and the room has been deleted. Redirecting to home...', {
                duration: 3000
            })
            // Clear all session storage
            sessionStorage.removeItem('roomData')
            sessionStorage.removeItem('roomDataTimestamp')
            // Redirect to home after a short delay
            setTimeout(() => navigate('/'), 2000)
        }
    }, [isRoomDeleted, navigate])

    // Emit room data to App component for Header
    useEffect(() => {
        if (roomId && viewerMember) {
            const event = new CustomEvent('roomDataUpdate', {
                detail: {
                    roomId: roomId,
                    getRoomLink: () => {
                        return `${window.location.origin}/viewer?roomId=${roomId}`
                    },
                    onLeave: () => {
                        // Leave the room via socket
                        leaveRoom(roomId, memberId)

                        // Clear session storage
                        sessionStorage.removeItem('roomData')
                        sessionStorage.removeItem('viewerMember')
                        sessionStorage.removeItem('viewerMemberId')

                        navigate('/')
                    },
                    isHost: false
                }
            })
            window.dispatchEvent(event)
        }

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomData?.roomId, roomId, viewerMember])

    // Cleanup: clear room data when component unmounts
    useEffect(() => {
        return () => {
            const clearEvent = new CustomEvent('roomDataUpdate', {
                detail: {}
            })
            window.dispatchEvent(clearEvent)
        }
    }, [])

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


    // Handle errors
    useEffect(() => {
        if (error) {
            if (error.includes('not found') || error.includes('does not exist')) {
                toast.error('Room not found. Please check the Room ID.')
                sessionStorage.removeItem('roomData')
                setHasJoined(false)
                setRoomId('')
            } else if (error.includes('already taken')) {
                // Handle duplicate name error
                toast.error(error, { duration: 5000 })
                console.log('[ViewerPage] Duplicate name detected, redirecting to home')
                // Clear session data
                sessionStorage.removeItem('roomData')
                sessionStorage.removeItem('roomDataTimestamp')
                sessionStorage.removeItem('viewerMemberId')
                // Redirect to home page after showing error
                setTimeout(() => {
                    navigate('/', {
                        state: {
                            error: 'Name already taken. Please choose a different name.',
                            roomId: roomId // Pass roomId so user can try again with different name
                        }
                    })
                }, 2000)
            }
        }
    }, [error, navigate, roomId])

    // Main viewer interface
    return (
        <div
            className="min-h-screen"
            style={
                viewTheme === 'christmas' && theme === 'light' ? { backgroundColor: 'lightcoral' } :
                    viewTheme === 'lunar-new-year' && theme === 'light' ? { backgroundColor: '#ffebee' } : {}
            }
        >
            {/* Christmas decorations */}
            {viewTheme === 'christmas' && (
                <>
                    <Snowfall />
                    <SantaImage />
                </>
            )}

            {/* Lunar New Year decorations */}
            {viewTheme === 'lunar-new-year' && (
                <>
                    <LunarNewYearEffect />
                </>
            )}

            <div className="container mx-auto px-4 py-10">
                <div className="flex flex-col lg:flex-row gap-6">
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
                                ) : isConnected ? (
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
                        <div className="bg-card border rounded-lg p-6 flex flex-col">
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
                                className="relative rounded-lg overflow-hidden bg-black group lg:h-[680px] md:h-[400px] h-[300px]"

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
                                        {/* Livestream Reactions */}
                                        <LivestreamReactions
                                            onSendReaction={(emoji) => {
                                                if (roomId && viewerMember) {
                                                    sendLivestreamReaction(roomId, memberId, viewerMember.name, emoji)
                                                }
                                            }}
                                            incomingReactions={livestreamReactions}
                                        />
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
                            <div className="space-y-2 overflow-y-auto h-[200px]" >
                                {roomData?.members && roomData.members.length > 0 ? (
                                    roomData.membersWithDetails?.map((member) => (
                                        <div
                                            key={member.name}
                                            className="flex items-center gap-3 bg-accent rounded-lg p-3"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-sm truncate">
                                                    {member.name === roomData.hostId ? `👑 ${member.name}` : member.name}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center py-4">No participants yet</p>
                                )}
                            </div>
                        </div>

                        {/* Chat & Comments */}
                        <ChatView
                            roomId={roomId}
                            currentUserId={memberId}
                            currentUserName={viewerMember?.name || ''}
                            messages={messages}
                            onSendMessage={(message) => {
                                if (roomId) {
                                    sendChatMessage(roomId, memberId, viewerMember?.name || '', message)
                                }
                            }}
                            onReactToMessage={(messageId, emoji) => {
                                if (roomId) {
                                    reactToMessage(roomId, messageId, memberId, emoji)
                                }
                            }}
                            isConnected={isConnected}
                        />
                    </div>
                </div>
            </div>

            <Dialog open={!!spinResult} onOpenChange={() => {
                setSpinResult(null)
            }}>
                <DialogContent className="sm:max-w-md p-4 sm:p-6">
                    <div className="text-center space-y-3 sm:space-y-4">
                        <div className="text-4xl sm:text-5xl md:text-6xl">🎊</div>
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-gray-100">Winner Announced!</h2>
                        <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-purple-600 dark:text-purple-400 py-4 sm:py-5 md:py-6 bg-purple-100 dark:bg-purple-900/30 rounded-xl px-4 sm:px-6 md:px-8 break-words">
                            {spinResult}
                        </div>
                        <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">This message will disappear in 5 seconds</p>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}