import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-purple-500 to-pink-600">
      <h1 className="text-6xl font-bold text-white mb-4">About</h1>
      <p className="text-xl text-white/90 mb-8 max-w-2xl text-center px-4">
        This is a modern React application built with Vite, TypeScript, and Tailwind CSS.
        It includes React Router for navigation.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  )
}
