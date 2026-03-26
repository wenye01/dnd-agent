import { Link } from 'react-router-dom'
import { Button } from '../components/ui'

function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-parchment">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-display font-bold text-ink mb-4">
          Dungeons & Dragons
        </h1>
        <p className="text-lg text-ink/80 mb-8">
          AI-Powered Tabletop Adventure
        </p>
        <Link to="/game">
          <Button variant="primary" size="lg">
            Start Adventure
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default HomePage
