import * as React from 'react';

type Props = {
  children: React.ReactNode;
  fallback?: (error: Error) => React.ReactNode;
};

type State = {
  error: Error | null;
};

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown): void {
    console.error(error, info);
  }

  render() {
    if (this.state.error != null) {
      return (
        this.props.fallback?.(this.state.error) ?? (
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
            {this.state.error.stack ?? this.state.error.toString()}
          </pre>
        )
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
