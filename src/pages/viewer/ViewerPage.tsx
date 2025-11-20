import { useState, useEffect, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../../hooks/useSocket'
import { useWebRTC } from '../../hooks/useWebRTC'
import type { Member } from '../../utils/interface/MemberInterface'
import { memberList } from '../../utils/mock/member-list/memberList'

export default function ViewerPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Get member from location state
  const preSelectedMember = (location.state as { member?: Member })?.member

  // Get roomId from URL query parameter or state
  const [roomId, setRoomId] = useState<string>(() => {
    const urlRoomId = searchParams.get('roomId')
    const stateRoomId = (location.state as { roomId?: string })?.roomId
    return urlRoomId || stateRoomId || ''
  })

  const [manualRoomId, setManualRoomId] = useState(roomId || '')
  const [genID, setGenID] = useState(preSelectedMember?.genID || '')
  const [viewerMember, setViewerMember] = useState<Member | null>(preSelectedMember || null)
  const [hasJoined, setHasJoined] = useState(false)

  // Auto-map genID to member
  useEffect(() => {
    if (genID.trim()) {
      const member = memberList.find(m => m.genID === genID.trim())
      setViewerMember(member || null)
    } else {
      setViewerMember(null)
    }
  }, [genID])
  const [spinResult, setSpinResult] = useState<string | null>(null)
  const [showResult, setShowResult] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Socket.io for room management
  const { socket, isConnected, roomData, error, clearError, joinRoom, onSpinResult, isRoomClosed } = useSocket()

  // WebRTC for receiving screen share
  const { remoteStream } = useWebRTC({
    socket,
    roomId: roomData?.roomId || null,
    isHost: false
  })

  // Auto-join room if roomId is provided in URL
  useEffect(() => {
    if (isConnected && roomId && viewerMember && !hasJoined) {
      joinRoom(roomId, viewerMember.genID)
      setHasJoined(true)
    }
  }, [isConnected, roomId, viewerMember, hasJoined])

  // Listen for spin results
  useEffect(() => {
    if (socket) {
      onSpinResult((result: string) => {
        setSpinResult(result)
        setShowResult(true)
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

  const handleJoinRoom = () => {
    if (!manualRoomId.trim()) {
      alert('Please enter a Room ID')
      return
    }
    if (!viewerMember) {
      alert('Please enter a valid member ID')
      return
    }
    clearError()
    setRoomId(manualRoomId)
    joinRoom(manualRoomId, viewerMember.genID)
    setHasJoined(true)
  }

  // Handle errors - reset join state when room not found
  useEffect(() => {
    if (error) {
      setHasJoined(false)
    }
  }, [error])

  const handleLeaveRoom = () => {
    navigate('/')
  }

  // If no roomId, show join form
  if (!hasJoined) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center">
              <h1 className="text-4xl font-bold text-white mb-2">Join Room</h1>
              <p className="text-white/80">Enter your ID and Room ID</p>
            </div>

            {/* Member ID Input */}
            <div className="space-y-2">
              <label htmlFor="genID" className="text-white font-semibold text-sm block">
                Your ID
              </label>
              <input
                id="genID"
                type="text"
                value={genID}
                onChange={(e) => setGenID(e.target.value)}
                placeholder="Enter your ID (1-8)..."
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border-2 border-white/30 focus:outline-none focus:border-white transition-colors"
                disabled={!!preSelectedMember}
              />
            </div>

            {/* Member Preview */}
            {viewerMember ? (
              <div className="p-4 bg-green-500/30 rounded-xl border-2 border-green-400">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-bold">{viewerMember.name}</p>
                    <p className="text-white/80 text-sm">ID: {viewerMember.genID}</p>
                  </div>
                  <svg className="w-6 h-6 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            ) : genID.trim() ? (
              <div className="p-3 bg-red-500/30 rounded-xl border-2 border-red-400">
                <p className="text-white text-sm text-center">
                  ❌ No member found with ID: {genID}
                </p>
              </div>
            ) : null}

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-red-500/30 rounded-xl border-2 border-red-400">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-white font-semibold mb-1">Failed to join room</p>
                    <p className="text-white/90 text-sm">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Room ID Input */}
            <div className="space-y-2">
              <label htmlFor="roomId" className="text-white font-semibold text-sm block">
                Room ID
              </label>
              <input
                id="roomId"
                type="text"
                value={manualRoomId}
                onChange={(e) => setManualRoomId(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                placeholder="Enter Room ID..."
                className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border-2 border-white/30 focus:outline-none focus:border-white transition-colors"
              />
            </div>

            <button
              onClick={handleJoinRoom}
              disabled={!isConnected || !viewerMember}
              className="w-full px-6 py-4 bg-purple-600 text-white font-bold text-lg rounded-xl hover:bg-purple-700 transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!isConnected ? 'Connecting...' : !viewerMember ? 'Enter Valid ID' : 'Join Room'}
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full px-6 py-3 bg-white/10 text-white font-semibold rounded-xl hover:bg-white/20 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Main viewer interface
  return (
    <div className="min-h-screen bg-linear-to-br from-blue-500 to-purple-600 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Viewer Mode</h1>
                <p className="text-white/80">Watching room: <span className="font-mono font-bold">{roomData?.roomId}</span></p>
              </div>
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-full text-sm font-semibold ${isConnected ? 'bg-green-500' : 'bg-red-500'} text-white`}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </div>
                <button
                  onClick={handleLeaveRoom}
                  className="px-6 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
                >
                  Leave Room
                </button>
              </div>
            </div>
          </div>

          {/* Video Stream */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Live Stream</h2>
            {remoteStream ? (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  className="w-full h-auto min-h-[400px] object-contain"
                />
                <div className="absolute top-4 right-4 px-3 py-2 bg-red-500 rounded-lg text-white text-sm font-semibold flex items-center gap-2">
                  <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                  LIVE
                </div>
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl p-12 text-center">
                <svg className="w-16 h-16 mx-auto mb-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-white/50 text-lg">Waiting for host to start screen sharing...</p>
              </div>
            )}
          </div>

          {/* Room Info */}
          <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Room Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm mb-1">Room ID</p>
                <p className="text-white font-mono font-bold">{roomData?.roomId}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-4">
                <p className="text-white/70 text-sm mb-1">Members</p>
                <p className="text-white font-bold text-2xl">{roomData?.members.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Spin Result Modal */}
      <AnimatePresence>
        {showResult && spinResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowResult(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 50 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="text-6xl animate-bounce">🎉</div>
                <h2 className="text-3xl font-bold text-gray-800">Winner!</h2>
                <div className="text-4xl font-bold text-purple-600 py-6 bg-purple-100 rounded-xl animate-pulse">
                  {spinResult}
                </div>
                <button
                  onClick={() => setShowResult(false)}
                  className="px-8 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
