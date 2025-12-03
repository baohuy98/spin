import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'sonner';
import { useTheme } from '../components/ThemeProvider';
import { SantaImage } from '../components/SantaImage';
import { Snowfall } from '../components/Snowfall';
import { useViewTheme } from '../components/ViewThemeProvider';

export default function Home() {
  const { viewTheme } = useViewTheme();
  const { theme } = useTheme();
  const [name, setName] = useState('');
  const [roomID, setRoomID] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userChoice, setUserChoice] = useState<'host' | 'join' | null>(null);
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Check for error message from viewer redirect (duplicate name)
  useEffect(() => {
    const state = location.state as { error?: string; roomId?: string } | null;
    if (state?.error) {
      toast.error(state.error, { duration: 5000 });
      if (state.roomId) {
        setRoomID(state.roomId); // Pre-fill the room ID for retry
        setPendingRoomId(state.roomId);
      }
      // Clear the state to prevent showing error again on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

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
    setUserChoice(null);
    setRoomID('');
  };

  const handleHostRoom = () => {
    const member = { name: name.trim() };
    navigate('/host', { state: { member } });
  };

  const handleChooseHost = () => {
    setUserChoice('host');
    handleHostRoom();
  };

  const handleChooseJoin = () => {
    setUserChoice('join');
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
    <div
      className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-blue-500 to-purple-600"
      style={viewTheme === 'christmas' && theme === 'light' ? { backgroundColor: 'lightcoral' } : {}}
    >
      {/* Christmas decorations */}
      {viewTheme === 'christmas' && (
        <>
          <Snowfall />
          <SantaImage />
        </>
      )}
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
          ) : userChoice === null ? (
            <>
              <div className="text-center mb-4">
                <p className="text-white text-lg font-semibold">Choose your action</p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={handleChooseHost}
                  className="w-full px-6 py-4 bg-purple-600 text-white font-bold text-lg rounded-xl hover:bg-purple-700 transition-all hover:scale-105 shadow-lg"
                >
                  Host Room
                </button>
                <button
                  onClick={handleChooseJoin}
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
          ) : userChoice === 'join' ? (
            <>
              <div className="space-y-2">
                <label htmlFor="roomID" className="text-white font-semibold text-sm block">
                  Room ID <span className="text-red-400">*</span>
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
                  onClick={handleJoinRoom}
                  className="w-full px-6 py-4 bg-green-500 text-white font-bold text-lg rounded-xl hover:bg-green-600 transition-all hover:scale-105 shadow-lg"
                >
                  Join Room
                </button>
                <button
                  onClick={() => setUserChoice(null)}
                  className="w-full px-6 py-4 bg-gray-500 text-white font-bold text-lg rounded-xl hover:bg-gray-600 transition-all hover:scale-105 shadow-lg"
                >
                  Back
                </button>

              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

