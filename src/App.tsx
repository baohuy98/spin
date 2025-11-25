import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Header } from './components/Header'
import Home from './pages/Home'
import HostPage from './pages/host/HostPage'
import ViewerPage from './pages/viewer/ViewerPage'

function AppContent() {
  return (
    <>
      <Toaster position="top-right" richColors />
      <Header
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
