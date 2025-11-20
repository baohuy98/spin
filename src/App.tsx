import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import HostPage from './pages/host/HostPage'
import ViewerPage from './pages/viewer/ViewerPage'
import { Header } from './components/Header'

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host" element={<HostPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
