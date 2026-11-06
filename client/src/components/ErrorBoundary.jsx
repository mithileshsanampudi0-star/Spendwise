import { Component } from 'react';

/** Catches render errors so one broken widget never leaves the user with a blank white screen. */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fullscreen-center" role="alert">
        <div className="card error-card">
          <h2>Something went wrong</h2>
          <p className="muted">The page hit an unexpected error. Your data is safe; reloading usually fixes it.</p>
          <div className="form-actions">
            <button type="button" className="btn btn--ghost" onClick={() => this.setState({ error: null })}>Try again</button>
            <button type="button" className="btn btn--primary" onClick={() => window.location.assign('/dashboard')}>Back to dashboard</button>
          </div>
        </div>
      </div>
    );
  }
}
