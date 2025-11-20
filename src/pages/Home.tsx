export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold bg-linear-to-r from-blue-500 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-4">
          Welcome to Spin
        </h1>
        <p className="text-xl text-foreground/70 mb-8">
          A React + Vite + TypeScript + Tailwind CSS starter
        </p>

      </div>
    </div>
  )
}
