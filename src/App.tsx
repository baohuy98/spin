import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './components/Header'
import Home from './pages/Home'
import HostPage from './pages/host/HostPage'
import ViewerPage from './pages/viewer/ViewerPage'

interface RoomDataEvent extends Event {
  detail: {
    roomId?: string
    getRoomLink?: () => string
    onLeave?: () => void
  }
}

function AppContent() {

  // Initialize room data from sessionStorage if on host page (for page reload)
  const [roomData, setRoomData] = useState<{
    roomId?: string
    getRoomLink?: () => string
  }>(() => {
    // Only restore if we're on the host page
    if (window.location.pathname === '/host') {
      const savedRoomData = sessionStorage.getItem('roomData')
      if (savedRoomData) {
        try {
          const parsed = JSON.parse(savedRoomData)
          if (parsed.roomId) {
            return {
              roomId: parsed.roomId,
              getRoomLink: () => `${window.location.origin}/viewer?roomId=${parsed.roomId}`
            }
          }
        } catch {
          // Invalid data, ignore
        }
      }
    }
    return {}
  })

  // Listen for custom events from HostPage to update room data
  useEffect(() => {
    console.log("✅ App: Setting up roomDataUpdate listener")

    const handleRoomDataUpdate = (event: Event) => {
      const customEvent = event as RoomDataEvent
      console.log("🚀 App received roomDataUpdate event:", customEvent.detail)
      setRoomData(customEvent.detail)
    }

    window.addEventListener('roomDataUpdate', handleRoomDataUpdate)

    return () => {
      console.log("❌ App: Removing roomDataUpdate listener")
      window.removeEventListener('roomDataUpdate', handleRoomDataUpdate)
    }
  }, [])


  return (
    <>
      <Toaster position="top-right" richColors />
      <Header
        roomId={roomData.roomId}
        getRoomLink={roomData.getRoomLink}
        onLeave={roomData.onLeave}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}

export default App
