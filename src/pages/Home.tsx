import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Snowfall } from '../components/Snowfall';
import { useViewTheme } from '../components/ViewThemeProvider';

export default function Home() {
  const { viewTheme } = useViewTheme();
  const [name, setName] = useState('');
  const [roomID, setRoomID] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const navigate = useNavigate();

  // Check for pending room ID (from viewer redirect)
  useEffect(() => {
    const pending = sessionStorage.getItem('pendingRoomId');
    if (pending) {
      setPendingRoomId(pending);
      setRoomID(pending); // Pre-fill the room ID input
    }
  }, []);

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'loggedInUser' && e.newValue === null) {
        setIsLoggedIn(false);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const handleLogin = () => {
    if (!name.trim()) {
      alert('Please enter your name');
      return;
    }

    localStorage.setItem('loggedInUser', JSON.stringify({ name: name.trim() }));
    setIsLoggedIn(true);

    // Auto-navigate to room if there's a pending room ID
    if (pendingRoomId) {
      const member = { name: name.trim() };
      sessionStorage.removeItem('pendingRoomId'); // Clear the pending room ID
      navigate(`/viewer?roomId=${pendingRoomId}`, { state: { member } });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('loggedInUser');
    setIsLoggedIn(false);
    setName('');
  };

  const handleHostRoom = () => {
    if (!isLoggedIn) {
      alert('Please login first');
      return;
    }
    const member = { name: name.trim() };
    navigate('/host', { state: { member } });
  };

  const handleJoinRoom = () => {
    if (!isLoggedIn) {
      alert('Please login first');
      return;
    }
    if (!roomID.trim()) {
      alert('Please enter a room ID to join');
      return;
    }
    const member = { name: name.trim() };
    navigate(`/viewer?roomId=${roomID.trim()}`, { state: { member } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-500 to-purple-600">
      {/* Snowfall effect for Christmas theme */}
      {viewTheme === 'christmas' && <Snowfall />}
      <div className="max-w-md w-full px-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-white mb-4">Welcome to Spin</h1>
          <p className="text-xl text-white/90">
            {isLoggedIn ? `Logged in as ${name}` : 'Enter your name to get started'}
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 shadow-2xl space-y-6">
          {!isLoggedIn ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-white font-semibold text-sm block">
                  Your Name <span className="text-red-400">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                  placeholder="Enter your name..."
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border-2 border-white/30 focus:outline-none focus:border-white transition-colors"
                />
              </div>
              <button
                onClick={handleLogin}
                className="w-full px-6 py-4 bg-green-500 text-white font-bold text-lg rounded-xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg"
              >
                Join
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <label htmlFor="roomID" className="text-white font-semibold text-sm block">
                  Room ID <span className="text-white/60 text-xs">(for joining)</span>
                </label>
                <input
                  id="roomID"
                  type="text"
                  value={roomID}
                  onChange={(e) => setRoomID(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="Enter room ID to join..."
                  className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/60 border-2 border-white/30 focus:outline-none focus:border-white transition-colors"
                />
              </div>
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
                <button
                  onClick={handleLogout}
                  className="w-full px-6 py-4 bg-red-500 text-white font-bold text-lg rounded-xl hover:bg-red-600 transition-all hover:scale-105 shadow-lg"
                >
                  Leave
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

