import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import SpinWheel from '../../components/SpinWheel'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../../hooks/useSocket'
import { useWebRTC } from '../../hooks/useWebRTC'
import { QRCodeSVG } from 'qrcode.react'
import type { Member } from '../../utils/interface/MemberInterface'
import { memberList } from '../../utils/mock/member-list/memberList'

interface WheelItem {
  id: string
  text: string
  color: string
  visible: boolean
}

const defaultColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788'
]

export default function HostPage() {
  const location = useLocation()
  const hostMember = (location.state as { member?: Member })?.member

  // Generate local room ID immediately
  const [localRoomId] = useState(() => `room-${Date.now()}`)
  const [roomMembers, setRoomMembers] = useState<Member[]>(() =>
    hostMember ? [{ ...hostMember, isHost: true }] : []
  )

  // Initialize wheel items from memberList
  const [items, setItems] = useState<WheelItem[]>(() =>
    memberList.map((member, index) => ({
      id: member.genID,
      text: member.name,
      color: defaultColors[index % defaultColors.length],
      visible: true
    }))
  )
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [spinDuration, setSpinDuration] = useState(4)
  const [rotation, setRotation] = useState(0)
  const [showShareModal, setShowShareModal] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)

  // Generate shareable room link
  const getRoomLink = () => {
    const currentRoomId = roomData?.roomId || localRoomId
    return `${window.location.origin}/viewer?roomId=${currentRoomId}`
  }

  // Get current room ID (socket room ID or local fallback)
  const getCurrentRoomId = () => {
    return roomData?.roomId || localRoomId
  }

  // Socket.io for room management
  const { socket, isConnected, roomData, createRoom, emitSpinResult } = useSocket()

  // WebRTC for screen sharing
  const { localStream, isSharing, error, startScreenShare, stopScreenShare } = useWebRTC({
    socket,
    roomId: roomData?.roomId || null,
    isHost: true
  })

  // Create room on mount
  useEffect(() => {
    if (isConnected && hostMember) {
      createRoom(hostMember.genID)
    }
  }, [isConnected, hostMember])

  // Update room members when socket room data changes
  useEffect(() => {
    if (roomData && roomData.members) {
      // Map socket member IDs to Member objects
      const updatedMembers = roomData.members.map(memberId => {
        const member = memberList.find(m => m.genID === memberId)
        if (member) {
          return {
            ...member,
            isHost: memberId === hostMember?.genID
          }
        }
        return { genID: memberId, name: `User ${memberId}`, isHost: false }
      })
      setRoomMembers(updatedMembers)
    }
  }, [roomData, hostMember])

  // Attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])

  const toggleVisibility = (id: string) => {
    setItems(items.map(item =>
      item.id === id ? { ...item, visible: !item.visible } : item
    ))
  }

  const showAll = () => {
    setItems(items.map(item => ({ ...item, visible: true })))
  }

  const hideAll = () => {
    setItems(items.map(item => ({ ...item, visible: false })))
  }

  const shuffleItems = () => {
    const shuffled = [...items].sort(() => Math.random() - 0.5)
    setItems(shuffled)
  }

  const resetMembers = () => {
    setItems(memberList.map((member, index) => ({
      id: member.genID,
      text: member.name,
      color: defaultColors[index % defaultColors.length],
      visible: true
    })))
  }

  const handleSpin = () => {
    if (isSpinning || items.filter(i => i.visible).length === 0) return

    setIsSpinning(true)
    setResult(null)

    const visibleItems = items.filter(item => item.visible)
    const randomIndex = Math.floor(Math.random() * visibleItems.length)
    const selectedItem = visibleItems[randomIndex]

    // Calculate rotation to land on selected item
    const segmentAngle = 360 / visibleItems.length
    const targetAngle = randomIndex * segmentAngle
    const spins = 360 * 5 // 5 full rotations
    const newRotation = rotation + spins + (360 - targetAngle) + segmentAngle / 2

    setRotation(newRotation)

    setTimeout(() => {
      setIsSpinning(false)
      setResult(selectedItem.text)

      // Emit spin result to all viewers in the room
      if (roomData?.roomId) {
        emitSpinResult(roomData.roomId, selectedItem.text)
      }
    }, spinDuration * 1000)
  }

  const copyRoomId = () => {
    const currentRoomId = getCurrentRoomId()
    navigator.clipboard.writeText(currentRoomId)
    alert('Room ID copied to clipboard!')
  }

  const copyRoomLink = () => {
    const link = getRoomLink()
    if (link) {
      navigator.clipboard.writeText(link)
      alert('Room link copied to clipboard!')
    }
  }

  const hideWinner = () => {
    if (result) {
      const itemToHide = items.find(item => item.text === result)
      if (itemToHide) {
        toggleVisibility(itemToHide.id)
      }
      setResult(null)
    }
  }

  const spinAgain = () => {
    setResult(null)
    handleSpin()
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 via-pink-600 to-red-600 pt-20 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Panel - Wheel */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div
              className="cursor-pointer"
              onClick={handleSpin}
            >
              <SpinWheel
                items={items}
                isSpinning={isSpinning}
                spinDuration={spinDuration}
                rotation={rotation}
              />
            </div>
            <button
              onClick={handleSpin}
              disabled={isSpinning || items.filter(i => i.visible).length === 0}
              className="mt-8 px-12 py-4 bg-white text-purple-600 font-bold text-2xl rounded-full shadow-xl hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
            >
              {isSpinning ? 'SPINNING...' : 'SPIN NOW'}
            </button>
          </div>

          {/* Right Panel - Controls */}
          <div className="lg:w-96 space-y-4">
            {/* Room Info Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold text-white">Room Info</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                  {isConnected ? 'Connected' : 'Local Mode'}
                </div>
              </div>

              <div className="space-y-3">
                {/* Host Info */}
                {hostMember && (
                  <div className="bg-purple-500/20 rounded-lg p-3 border border-purple-400">
                    <p className="text-white/70 text-xs mb-1">Host</p>
                    <p className="text-white font-bold">{hostMember.name}</p>
                    <p className="text-white/70 text-xs">ID: {hostMember.genID}</p>
                  </div>
                )}

                {/* Room ID */}
                <div className="bg-white/10 rounded-lg p-3">
                  <p className="text-white/70 text-xs mb-1">Room ID</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white font-mono font-bold text-sm truncate">{getCurrentRoomId()}</p>
                    <button
                      onClick={copyRoomId}
                      className="px-3 py-1 bg-purple-500 text-white text-xs font-semibold rounded hover:bg-purple-600 transition-colors shrink-0"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Share Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={copyRoomLink}
                    className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Link
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                    QR Code
                  </button>
                </div>

                {/* Members List */}
                <div className="bg-white/10 rounded-lg p-3">

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {roomMembers.map((member) => (
                      <div
                        key={member.genID}
                        className="flex items-center justify-between bg-white/10 rounded p-2"
                      >
                        <div>
                          <p className="text-white font-semibold text-sm">{member.name}</p>
                          <p className="text-white/60 text-xs">ID: {member.genID}</p>
                        </div>
                        {member.isHost && (
                          <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                            Host
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Share Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-4">
              <h3 className="text-xl font-bold text-white">Screen Share</h3>

              {error && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-3">
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              )}

              {isSharing && localStream && (
                <div className="relative rounded-lg overflow-hidden bg-black">
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    className="w-full h-40 object-contain"
                  />
                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 rounded text-white text-xs font-semibold flex items-center gap-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    LIVE
                  </div>
                </div>
              )}

              <button
                onClick={isSharing ? stopScreenShare : startScreenShare}
                className={`w-full px-4 py-3 font-semibold rounded-lg transition-colors ${isSharing
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
              >
                {isSharing ? 'Stop Sharing' : 'Start Screen Share'}
              </button>
            </div>

            {/* Controls Card */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Controls</h2>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="bg-white/10 rounded-lg p-4 space-y-4"
                  >
                    <div>
                      <label className="text-white text-sm font-medium block mb-2">
                        Spin Duration: {spinDuration}s
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="10"
                        step="0.5"
                        value={spinDuration}
                        onChange={(e) => setSpinDuration(parseFloat(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bulk Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={showAll}
                  className="px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Show All
                </button>
                <button
                  onClick={hideAll}
                  className="px-4 py-2 bg-gray-500 text-white text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Hide All
                </button>
                <button
                  onClick={shuffleItems}
                  className="px-4 py-2 bg-purple-500 text-white text-sm font-semibold rounded-lg hover:bg-purple-600 transition-colors"
                >
                  Shuffle
                </button>
                <button
                  onClick={resetMembers}
                  className="px-4 py-2 bg-orange-500 text-white text-sm font-semibold rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Reset All
                </button>
              </div>

              {/* Members List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                <h3 className="text-white text-sm font-medium">
                  Members for Spinning ({items.filter(i => i.visible).length}/{items.length} visible)
                </h3>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${item.visible ? 'bg-white/20' : 'bg-white/5 opacity-50'
                      }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="flex-1 text-white font-medium truncate">{item.text}</span>
                    <span className="text-white/60 text-xs">ID: {item.id}</span>
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-1 hover:bg-white/10 rounded transition-colors"
                      title={item.visible ? 'Hide from spin' : 'Show in spin'}
                    >
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {item.visible ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        )}
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setResult(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold text-gray-800">Winner!</h2>
                <div className="text-4xl font-bold text-purple-600 py-6 bg-purple-100 rounded-xl">
                  {result}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={hideWinner}
                    className="flex-1 px-6 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-colors"
                  >
                    Hide from Next Spin
                  </button>
                  <button
                    onClick={spinAgain}
                    className="flex-1 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    Spin Again
                  </button>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowShareModal(false)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <h2 className="text-3xl font-bold text-gray-800">Share Room</h2>

                {/* QR Code */}
                <div className="bg-white p-6 rounded-xl border-4 border-purple-500 inline-block">
                  <QRCodeSVG
                    value={getRoomLink()}
                    size={200}
                    level="H"
                    includeMargin={true}
                  />
                </div>

                {/* Room ID Display */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-semibold">Room ID</p>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg">
                    <p className="font-mono font-bold text-lg text-purple-600">{getCurrentRoomId()}</p>
                  </div>
                </div>

                {/* Room Link Display */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 font-semibold">Room Link</p>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg break-all">
                    <p className="text-sm text-gray-700">{getRoomLink()}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={copyRoomId}
                    className="flex-1 px-6 py-3 bg-purple-500 text-white font-semibold rounded-xl hover:bg-purple-600 transition-colors"
                  >
                    Copy ID
                  </button>
                  <button
                    onClick={copyRoomLink}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors"
                  >
                    Copy Link
                  </button>
                </div>

                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-sm"
                >
                  Close
                </button>

                <p className="text-xs text-gray-500">
                  Scan the QR code or share the link/ID with viewers to join this room
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
