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
  const [roomData, setRoomData] = useState<{
    roomId?: string
    getRoomLink?: () => string
    onLeave?: () => void
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
