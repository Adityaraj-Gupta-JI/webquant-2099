import { Component, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto max-w-2xl px-6 py-32">
        <p className="label text-signal">System fault</p>
        <h1 className="display mt-3 text-4xl">The web collapsed.</h1>
        <p className="mt-4 max-w-[60ch] text-mute">
          An unrecoverable render error occurred. The analysis state was not persisted.
        </p>
        <pre className="mt-6 overflow-x-auto border border-line bg-panel p-4 font-mono text-xs text-mute">
          {this.state.error.message}
        </pre>
        <button className="btn-ghost mt-6" onClick={() => window.location.reload()}>
          Restart system
        </button>
      </div>
    );
  }
}
