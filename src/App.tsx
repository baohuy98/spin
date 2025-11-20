import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import Home from './pages/Home'

function App() {
  return (
    <BrowserRouter>
      <nav className="fixed top-0 left-0 right-0 bg-white/10 backdrop-blur-md z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-2xl font-bold text-white">
            Spin
          </Link>
          <div className="flex gap-6">
            <Link to="/" className="text-white hover:text-white/80 transition-colors">
              Home
            </Link>
          </div>
        </div>
      </nav>

      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
