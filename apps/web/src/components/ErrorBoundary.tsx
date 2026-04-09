import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Unhandled error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="flex min-h-screen items-center justify-center bg-abyss text-parchment">
          <div className="max-w-md rounded-lg border border-gold/30 bg-shadow p-8 text-center shadow-2xl">
            <h1 className="mb-3 font-heading text-3xl font-bold text-gold">
              Adventure Interrupted
            </h1>
            <p className="mb-6 text-parchment/70">
              Something went wrong in the realm.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded border border-gold/50 bg-gold/10 px-6 py-2 font-heading text-gold transition-colors hover:bg-gold/20"
            >
              Return to Camp
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
