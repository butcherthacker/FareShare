import React from 'react';

interface State {
  hasError: boolean;
  error?: Error | null;
}

export default class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, State> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console for debugging
    // In production you might send this to a logging service
    // eslint-disable-next-line no-console
    console.error('Uncaught error in component:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 max-w-4xl mx-auto">
          <div className="bg-white p-6 rounded shadow" style={{ border: '1px solid var(--color-secondary)' }}>
            <h2 style={{ color: 'var(--color-primary)' }} className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-gray-700 mt-3">An unexpected error occurred while rendering this page.</p>
            <pre className="mt-4 text-xs text-red-700" style={{ whiteSpace: 'pre-wrap' }}>
              {(() => {
                const msg = this.state.error?.message;
                if (msg && typeof msg === 'object') return JSON.stringify(msg, null, 2);
                return String(msg ?? '');
              })()}
            </pre>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
