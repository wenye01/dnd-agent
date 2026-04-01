import { Routes, Route } from 'react-router-dom'
import { WebSocketProvider } from './contexts/WebSocketContext'
import GamePage from './pages/GamePage'
import HomePage from './pages/HomePage'

function App() {
  return (
    <WebSocketProvider>
      <div className="min-h-screen bg-abyss text-parchment font-body">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game" element={<GamePage />} />
        </Routes>
      </div>
    </WebSocketProvider>
  )
}

export default App
