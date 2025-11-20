import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { memberList } from '../utils/mock/member-list/memberList'
import type { Member } from '../utils/interface/MemberInterface'

export default function Home() {
  const [genID, setGenID] = useState('')
  const [matchedMember, setMatchedMember] = useState<Member | null>(null)
  const navigate = useNavigate()

  // Auto-map genID to member
  useEffect(() => {
    if (genID.trim()) {
      const member = memberList.find(m => m.genID === genID.trim())
      setMatchedMember(member || null)
    } else {
      setMatchedMember(null)
    }
  }, [genID])

  const handleHostRoom = () => {
    if (matchedMember) {
      navigate('/host', { state: { member: matchedMember } })
    } else {
      alert('Please enter a valid member ID')
    }
  }

  const handleJoinRoom = () => {
    if (matchedMember) {
      navigate('/viewer', { state: { member: matchedMember } })
    } else {
      alert('Please enter a valid member ID')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
      <div className="max-w-md w-full px-8">
        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">Welcome to Spin</h1>
          <p className="text-xl text-white/90">Enter your ID to get started</p>
        </div>

        {/* Input and Buttons */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl space-y-6">
          {/* GenID Input */}
          <div className="space-y-2">
            <label htmlFor="genID" className="text-white font-semibold text-sm block">
              Your ID
            </label>
            <input
              id="genID"
              type="text"
              value={genID}
              onChange={(e) => setGenID(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleHostRoom()}
              placeholder="Enter your ID (1-8)..."
              className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border-2 border-white/30 focus:outline-none focus:border-white transition-colors"
            />
          </div>

          {/* Matched Member Display */}
          {matchedMember ? (
            <div className="p-4 bg-green-500/30 rounded-xl border-2 border-green-400 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-lg">{matchedMember.name}</p>
                  <p className="text-white/80 text-sm">ID: {matchedMember.genID}</p>
                </div>
                <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
          ) : genID.trim() ? (
            <div className="p-4 bg-red-500/30 rounded-xl border-2 border-red-400">
              <p className="text-white text-sm text-center">
                ❌ No member found with ID: {genID}
              </p>
            </div>
          ) : null}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleHostRoom}
              className="w-full px-6 py-4 bg-purple-600 text-white font-bold text-lg rounded-xl hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
            >
              Host Room
            </button>
            <button
              onClick={handleJoinRoom}
              className="w-full px-6 py-4 bg-white text-purple-600 font-bold text-lg rounded-xl hover:bg-gray-100 transition-all hover:scale-105 shadow-lg"
            >
              Join Room
            </button>
          </div>
        </div>
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold bg-linear-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
          Welcome to Spin
        </h1>
        <p className="text-xl text-foreground/70 mb-8">
          A React + Vite + TypeScript + Tailwind CSS starter
        </p>

      </div>
    </div>
  )
}
