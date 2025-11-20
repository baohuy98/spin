export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
      <h1 className="text-6xl font-bold text-white mb-4">Welcome to Spin</h1>
      <p className="text-xl text-white/90 mb-8">A React + Vite + TypeScript + Tailwind CSS starter</p>
      <div className="flex gap-4">
        <a
          href="https://react.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
        >
          Learn React
        </a>
        <a
          href="https://tailwindcss.com"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-white/10 text-white rounded-lg font-semibold hover:bg-white/20 transition-colors backdrop-blur-sm"
        >
          Learn Tailwind
        </a>
      </div>
    </div>
  )
}
