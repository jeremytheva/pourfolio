import React from 'react'
import * as FiIcons from 'react-icons/fi'
import SafeIcon from '../common/SafeIcon'

const { FiAlertTriangle, FiRefreshCw, FiHome } = FiIcons

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
    this.errorRegionRef = React.createRef()
    this.handleRetry = this.handleRetry.bind(this)
    this.handleGoHome = this.handleGoHome.bind(this)
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo }, () => {
      this.errorRegionRef.current?.focus()
    })

    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }
  }

  handleRetry() {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))
  }

  handleGoHome() {
    window.location.assign('/home')
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
          <div
            ref={this.errorRegionRef}
            role="alert"
            aria-labelledby="unexpected-error-heading"
            tabIndex={-1}
            className="w-full max-w-md rounded-xl bg-white p-8 text-center shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100" aria-hidden="true">
              <SafeIcon icon={FiAlertTriangle} className="h-8 w-8 text-red-600" />
            </div>

            <h1 id="unexpected-error-heading" className="mb-4 text-2xl font-bold text-gray-800">
              Something went wrong
            </h1>

            <p className="mb-6 text-gray-600">
              {this.props.fallbackMessage || 'Pourfolio encountered an unexpected error. Try again, or return home.'}
            </p>

            {import.meta.env.DEV && this.state.error && (
              <div className="mb-6 rounded-lg bg-gray-100 p-4 text-left">
                <h2 className="mb-2 text-sm font-semibold text-gray-700">Error details</h2>
                <pre className="overflow-auto text-xs text-gray-600">
                  {this.state.error.toString()}
                </pre>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={this.handleRetry} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-white transition-colors hover:bg-amber-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-700">
                <SafeIcon icon={FiRefreshCw} className="h-4 w-4" />
                <span>Try again</span>
              </button>
              <button type="button" onClick={this.handleGoHome} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white transition-colors hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-700">
                <SafeIcon icon={FiHome} className="h-4 w-4" />
                <span>Go home</span>
              </button>
            </div>

            {this.state.retryCount > 2 && (
              <p className="mt-4 text-sm text-gray-500">If the problem persists, use the support information available from Pourfolio's public pages.</p>
            )}
          </div>
        </main>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
