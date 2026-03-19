import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-display font-bold text-ink mb-4">
        Dungeons & Dragons
      </h1>
      <p className="text-lg text-ink/80 mb-8">
        AI-Powered Tabletop Adventure
      </p>
      <Link
        to="/game"
        className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
      >
        Start Adventure
      </Link>
    </div>
  )
}

export default HomePage
