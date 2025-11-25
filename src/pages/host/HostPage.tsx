import ChatView from '@/components/ChatView'
import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import SpinWheel from '../../components/SpinWheel'
import { useSocket } from '../../hooks/useSocket'
import { useWebRTC } from '../../hooks/useWebRTC'
import { useSpinSound } from '../../hooks/useSpinSound'
import type { Member } from '../../utils/interface/MemberInterface'
import { Eye, Volume2, VolumeX, Plus, Trash2 } from 'lucide-react'

interface WheelItem {
  id: string
  text: string
  color: string
  visible: boolean
}

// Base color palette theme
const paletteTheme = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#E74C3C', '#3498DB', '#9B59B6', '#1ABC9C', '#F39C12',
  '#E67E22', '#2ECC71', '#34495E', '#16A085', '#C0392B'
]

// Generate a color from the palette - deterministic based on index
const generateColorForMember = (index: number): string => {
  // For first 20 members, use palette colors directly
  if (index < paletteTheme.length) {
    return paletteTheme[index]
  }

  // For additional members, generate vibrant colors using HSL with deterministic values
  // Use index to generate consistent colors that don't change on re-render
  const offset = index - paletteTheme.length
  const hue = (offset * 137.5) % 360 // Golden angle for good distribution
  const saturation = 70 + (offset % 3) * 10 // Vary between 70-90%
  const lightness = 55 + (offset % 2) * 5 // Vary between 55-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export default function HostPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const hostMember = (location.state as { member?: Member })?.member

  // Initialize wheel items from room members (will be updated when room data loads)
  const [items, setItems] = useState<WheelItem[]>(() =>
    hostMember ? [{
      id: hostMember.genID,
      text: hostMember.name,
      color: generateColorForMember(0),
      visible: true
    }] : []
  )
  const [isSpinning, setIsSpinning] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [spinDuration, setSpinDuration] = useState(4)
  const [rotation, setRotation] = useState(0)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [recentWinners, setRecentWinners] = useState<string[]>([]) // Track recent winners for fairer selection
  const [manualMembers, setManualMembers] = useState<WheelItem[]>([]) // Manually added members (not in room)
  const [manualMemberName, setManualMemberName] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const roomCreatedRef = useRef(false)

  // Socket.io for room management
  const { socket, isConnected, roomData, createRoom, leaveRoom, emitSpinResult, messages, sendChatMessage, } = useSocket()

  // Sound effects for spinning
  const { startSpinSound, playWinSound, stopSpinSound } = useSpinSound()


  // Get current room ID from the socket state
  const getCurrentRoomId = () => {
    return roomData?.roomId || ''
  }

  // WebRTC for screen sharing
  const { localStream, isSharing, error, startScreenShare, stopScreenShare } = useWebRTC({
    socket,
    roomId: roomData?.roomId || null,
    isHost: true,
    isConnected
  })

  // Create room on mount - reuse existing room if available for stable room ID
  useEffect(() => {
    if (isConnected && hostMember && !roomCreatedRef.current) {
      roomCreatedRef.current = true
      const savedRoomData = sessionStorage.getItem('roomData')
      if (savedRoomData) {
        try {
          const parsedData = JSON.parse(savedRoomData)
          // If we have saved room data for this host, rooms are now persistent
          if (parsedData.hostId === hostMember.genID) {
            console.log('[HostPage] Room persists across reloads, creating/rejoining room:', parsedData.roomId)
            // Creating room with same host will reuse existing room (stable room ID)
            createRoom(hostMember.genID, hostMember.name)
            return
          } else {
            // Different host, clear old data
            console.log('[HostPage] Clearing old room data for different host')
            sessionStorage.removeItem('roomData')
            sessionStorage.removeItem('roomDataTimestamp')
          }
        } catch (e) {
          console.error('[HostPage] Failed to parse saved room data:', e)
          sessionStorage.removeItem('roomData')
          sessionStorage.removeItem('roomDataTimestamp')
        }
      }
      // Create new room if no saved data or different host
      console.log('[HostPage] Creating new room for host:', hostMember.genID, hostMember.name)
      createRoom(hostMember.genID, hostMember.name)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, hostMember])

  // Update wheel items when socket room data or manual members change
  useEffect(() => {
    const roomMembers: WheelItem[] =
      roomData && roomData.membersWithDetails && roomData.membersWithDetails.length > 0
        ? roomData.membersWithDetails.map((member, index) => ({
          id: member.genID,
          text: member.name,
          color: generateColorForMember(index),
          visible: true
        }))
        : hostMember
          ? [{
            id: hostMember.genID,
            text: hostMember.name,
            color: generateColorForMember(0),
            visible: true
          }]
          : []

    // Merge room members with manually added members
    const allMembers = [...roomMembers, ...manualMembers]

    // Reassign colors based on total index
    const coloredMembers = allMembers.map((member, index) => ({
      ...member,
      color: generateColorForMember(index)
    }))

    setItems(coloredMembers)
  }, [roomData, manualMembers, hostMember])

  // Attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream) {
      videoRef.current.srcObject = localStream
    }
  }, [localStream])

  // Emit room data to App component for Header
  useEffect(() => {
    if (roomData?.roomId) {
      const event = new CustomEvent('roomDataUpdate', {
        detail: {
          roomId: roomData.roomId,
          getRoomLink: () => {
            if (!roomData?.roomId) return ''
            return `${window.location.origin}/viewer?roomId=${roomData.roomId}`
          },
          onLeave: handleLeaveRoom
        }
      })
      window.dispatchEvent(event)
    }
  }, [roomData?.roomId])

  // Cleanup: clear room data when component unmounts
  useEffect(() => {
    return () => {
      const clearEvent = new CustomEvent('roomDataUpdate', {
        detail: {}
      })
      window.dispatchEvent(clearEvent)
    }
  }, [])

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
    // Reset to current room members (clears manual members)
    setManualMembers([])
    // Also clear recent winners history
    setRecentWinners([])
  }

  const addManualMember = () => {
    if (!manualMemberName.trim()) {
      toast.error('Please enter a name')
      return
    }

    // Generate a unique ID for manual member
    const manualId = `manual-${Date.now()}`
    const newMember: WheelItem = {
      id: manualId,
      text: manualMemberName.trim(),
      color: generateColorForMember(items.length), // Will be reassigned by useEffect
      visible: true
    }

    setManualMembers(prev => [...prev, newMember])
    setManualMemberName('')
    toast.success(`Added ${manualMemberName.trim()} to spin list`)
  }

  const removeManualMember = (id: string) => {
    setManualMembers(prev => prev.filter(m => m.id !== id))
    toast.success('Removed from spin list')
  }

  const handleLeaveRoom = useCallback(() => {
    if (!roomData || !hostMember) return

    // Stop screen sharing if active
    if (isSharing) {
      stopScreenShare()
    }

    // Leave the room
    leaveRoom(roomData.roomId, hostMember.genID)

    // Clear session storage
    sessionStorage.removeItem('roomData')
    sessionStorage.removeItem('roomDataTimestamp')

    // Navigate back to home
    toast.success('Left room successfully')
    navigate('/')
  }, [roomData, hostMember, isSharing, stopScreenShare, leaveRoom, navigate])

  const handleSpin = () => {
    if (isSpinning || items.filter(i => i.visible).length === 0) return

    setIsSpinning(true)
    setResult(null)

    // Start spinning sound if enabled
    if (soundEnabled) {
      startSpinSound(spinDuration)
    }

    const visibleItems = items.filter(item => item.visible)

    // Implement weighted random selection to avoid picking recent winners
    // Items that were recently selected get lower weights
    const weights = visibleItems.map(item => {
      const timesInRecent = recentWinners.filter(id => id === item.id).length
      // Reduce weight exponentially for recent winners
      // First recent: 0.3x, second recent: 0.1x, third+: 0.05x
      if (timesInRecent === 0) return 1.0
      if (timesInRecent === 1) return 0.3
      if (timesInRecent === 2) return 0.1
      return 0.05
    })

    // Calculate total weight
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0)

    // Select random item based on weights
    let random = Math.random() * totalWeight
    let selectedIndex = 0
    for (let i = 0; i < weights.length; i++) {
      random -= weights[i]
      if (random <= 0) {
        selectedIndex = i
        break
      }
    }

    const selectedItem = visibleItems[selectedIndex]

    // Update recent winners (keep last 3)
    setRecentWinners(prev => {
      const updated = [...prev, selectedItem.id]
      // Keep only last 3 winners, or reset if all items have been picked
      if (updated.length >= visibleItems.length * 2) {
        return [selectedItem.id]
      }
      return updated.slice(-3)
    })

    // Calculate rotation to land on selected item
    // The pointer is at TOP, segments are indexed from top going clockwise
    // Center of segment i is at angle: (i + 0.5) * segmentAngle from top (clockwise)
    // We need final rotation (mod 360) = 360 - (i + 0.5) * segmentAngle
    const segmentAngle = 360 / visibleItems.length
    const segmentCenter = (selectedIndex + 0.5) * segmentAngle
    const targetAngle = 360 - segmentCenter

    // Calculate how much to rotate from current position
    const currentAngle = rotation % 360
    let additionalRotation = targetAngle - currentAngle
    // Always rotate forward (clockwise), add 360 if we'd go backward
    if (additionalRotation <= 0) additionalRotation += 360

    const spins = 360 * 5 // 5 full rotations
    // Add small random offset within segment for natural feel (±30% of segment)
    const randomOffset = (Math.random() - 0.5) * segmentAngle * 0.6
    const newRotation = rotation + spins + additionalRotation + randomOffset

    setRotation(newRotation)

    setTimeout(() => {
      setIsSpinning(false)
      if (soundEnabled) {
        stopSpinSound()
        playWinSound() // Play celebration sound
      }
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
    toast.success('Room ID copied to clipboard!')
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
    <div className="min-h-screen bg-background pt-16 sm:pt-20 pb-6 sm:pb-10">
      <div className="container mx-auto ">
        <div className="flex flex-col lg:flex-row gap-4 sm:gap-8">
          {/* Left Panel - Wheel and Chat */}
          <div className="flex-1 flex flex-col items-center ">
            {/* Wheel with sound toggle */}
            <div className="relative w-full max-w-[280px] sm:max-w-[400px] md:max-w-[500px]">
              {/* Sound toggle - top left corner */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSoundEnabled(!soundEnabled)
                }}
                className={`absolute top-0 left-0 z-10 p-2 sm:p-3 rounded-full shadow-lg transition-all hover:scale-105 ${soundEnabled
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : 'bg-gray-400 hover:bg-gray-500 text-white'
                  }`}
                title={soundEnabled ? 'Sound On' : 'Sound Off'}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
              </button>

              {/* Clickable wheel */}
              <div
                className={`cursor-pointer ${isSpinning || items.filter(i => i.visible).length === 0 ? 'cursor-not-allowed opacity-80' : 'hover:scale-[1.02] transition-transform'}`}
                onClick={handleSpin}
              >
                <SpinWheel
                  items={items}
                  isSpinning={isSpinning}
                  spinDuration={spinDuration}
                  rotation={rotation}
                />
              </div>
            </div>

            {/* Chat below wheel */}
            <div className="w-full  mt-6 sm:mt-8 bg-white/10 backdrop-blur-md rounded-xl overflow-hidden min-h-[400px] flex flex-col">
              <ChatView
                roomId={roomData?.roomId || null}
                currentUserId={hostMember?.genID || ''}
                currentUserName={hostMember?.name || ''}
                messages={messages}
                onSendMessage={(message) => {
                  if (roomData?.roomId && hostMember) {
                    sendChatMessage(roomData.roomId, hostMember.genID, hostMember.name, message)
                  }
                }}
                isConnected={isConnected}
              />
            </div>
          </div>

          {/* Right Panel - Controls */}
          <div className="lg:w-96 space-y-4">
            {/* Room Info Card */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold">Room Info</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isConnected ? 'bg-green-500' : 'bg-yellow-500'} text-white`}>
                  {isConnected ? 'Connected' : 'Local Mode'}
                </div>
              </div>

              <div className="space-y-3">
                {/* Host Info */}
                {hostMember && (
                  <div className="bg-accent rounded-lg p-3 border">
                    <p className="text-muted-foreground text-xs mb-1">Host</p>
                    <p className="font-bold">{hostMember.name}</p>
                    <p className="text-muted-foreground text-xs">ID: {hostMember.genID}</p>
                  </div>
                )}

                {/* Room ID */}
                <div className="bg-accent rounded-lg p-3">
                  <p className="text-muted-foreground text-xs mb-1">Room ID</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono font-bold text-sm truncate">{getCurrentRoomId()}</p>
                    <button
                      onClick={copyRoomId}
                      className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded hover:bg-primary/90 transition-colors shrink-0"
                    >
                      Copy ID
                    </button>
                  </div>
                </div>

                {/* Members List - Only Logged-In Users */}
                <div className="bg-accent rounded-lg p-3">
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {roomData?.membersWithDetails && roomData.membersWithDetails.length > 0 ? (
                      roomData.membersWithDetails.map((member) => (
                        <div
                          key={member.genID}
                          className="flex items-center justify-between bg-accent/50 rounded p-2"
                        >
                          <div>
                            <p className="font-semibold text-sm">{member.name}</p>
                            <p className="text-muted-foreground text-xs">ID: {member.genID}</p>
                          </div>
                          {member.isHost && (
                            <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-bold rounded">
                              Host
                            </span>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm text-center">No members yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Screen Share Card */}
            <div className="bg-card border rounded-lg p-6 space-y-4">
              <h3 className="text-xl font-semibold">Screen Share</h3>

              {error && (
                <div className="bg-destructive/10 border border-destructive rounded-lg p-3">
                  <p className="text-destructive text-sm">{error}</p>
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
                  <div className="absolute top-2 right-2 flex items-center gap-2">
                    <div className="px-2 py-1 bg-black/70 rounded text-white text-xs font-semibold flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {Math.max(0, (roomData?.members?.length || 1) - 1)}
                    </div>
                    <div className="px-2 py-1 bg-red-500 rounded text-white text-xs font-semibold flex items-center gap-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      LIVE
                    </div>
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

              <button
                onClick={handleLeaveRoom}
                className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg transition-colors"
              >
                Leave Room
              </button>
            </div>

            {/* Controls Card */}
            <div className="bg-card border rounded-lg p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Controls</h2>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-2 hover:bg-accent rounded-lg transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>

              {/* Settings Panel */}
              <AnimatePresence mode="wait">
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, scaleY: 0, originY: 0 }}
                    animate={{
                      opacity: 1,
                      scaleY: 1,
                      transition: {
                        duration: 0.5,
                        ease: [0.4, 0, 0.2, 1] // cubic-bezier for smooth easing
                      }
                    }}
                    exit={{
                      opacity: 0,
                      scaleY: 0,
                      transition: {
                        duration: 0.3,
                        ease: [0.4, 0, 1, 1]
                      }
                    }}
                    className="bg-accent rounded-lg p-4 space-y-4 overflow-hidden"
                  >
                    <div>
                      <label className="text-sm font-medium block mb-2">
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

              {/* Add Manual Member Section */}
              <div className="bg-accent rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold">Add Member Manually</h3>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualMemberName}
                    onChange={(e) => setManualMemberName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addManualMember()}
                    placeholder="Enter name..."
                    className="flex-1 px-3 py-2 rounded-lg bg-background border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={addManualMember}
                    className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    title="Add member"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
                {manualMembers.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Manual members ({manualMembers.length}):</p>
                    {manualMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between bg-background rounded p-2"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full shrink-0"
                            style={{ backgroundColor: member.color }}
                          />
                          <span className="text-sm font-medium">{member.text}</span>
                        </div>
                        <button
                          onClick={() => removeManualMember(member.id)}
                          className="p-1 text-destructive hover:text-destructive/80 hover:bg-destructive/10 rounded transition-colors"
                          title="Remove member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                <h3 className="text-sm font-medium">
                  Members for Spinning ({items.filter(i => i.visible).length}/{items.length} visible)
                </h3>
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${item.visible ? 'bg-accent' : 'bg-accent/30 opacity-50'
                      }`}
                  >
                    <div
                      className="w-6 h-6 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium truncate">{item.text}</span>

                    </div>
                    <button
                      onClick={() => toggleVisibility(item.id)}
                      className="p-1 hover:bg-accent rounded transition-colors"
                      title={item.visible ? 'Hide from spin' : 'Show in spin'}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className="bg-card border rounded-2xl p-8 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-6">
                <div className="text-6xl">🎉</div>
                <h2 className="text-3xl font-bold">Winner!</h2>
                <div className="text-4xl font-bold text-primary py-6 bg-accent rounded-xl">
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
                    className="flex-1 px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
                  >
                    Spin Again
                  </button>
                </div>
                <button
                  onClick={() => setResult(null)}
                  className="text-muted-foreground hover:text-foreground text-sm"
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
