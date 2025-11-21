import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import HostPage from './pages/host/HostPage'
import ViewerPage from './pages/viewer/ViewerPage'
import { Header } from './components/Header'
import { useState, useEffect } from 'react'
import { Toaster } from 'sonner'

interface RoomDataEvent extends Event {
  detail: {
    roomId?: string
    getRoomLink?: () => string
  }
}

function AppContent() {
  const location = useLocation()
  const [roomData, setRoomData] = useState<{
    roomId?: string
    getRoomLink?: () => string
  }>({})

  // Listen for custom events from HostPage to update room data
  useEffect(() => {
    const handleRoomDataUpdate = (event: Event) => {
      const customEvent = event as RoomDataEvent
      setRoomData(customEvent.detail)
    }

    window.addEventListener('roomDataUpdate', handleRoomDataUpdate)

    return () => {
      window.removeEventListener('roomDataUpdate', handleRoomDataUpdate)
    }
  }, [])

  // Clear room data when leaving host page
  const isHostPage = location.pathname === '/host'
  const shouldShowRoomData = isHostPage ? roomData : {}

  return (
    <>
      <Toaster position="top-right" richColors />
      <Header
        roomId={shouldShowRoomData.roomId}
        getRoomLink={shouldShowRoomData.getRoomLink}
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
