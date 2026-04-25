import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ margin: '2rem', padding: '2rem' }}>
          <h2 style={{ color: '#9b2a23' }}>Something went wrong</h2>
          <p className="meta-line">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <p className="meta-line" style={{ fontSize: '0.85rem', marginTop: '1rem', wordBreak: 'break-word' }}>
            {this.state.error?.message}
          </p>
          <button type="button" onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      )
    }

    return this.props.children
  }
}
