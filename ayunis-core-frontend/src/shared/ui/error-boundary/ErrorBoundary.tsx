import { Component, type ReactNode } from 'react';
import { ErrorFallback } from './ErrorFallback';
import { Sentry } from '@/shared/lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  // eslint-disable-next-line sonarjs/function-return-type -- Both branches return ReactNode
  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? <ErrorFallback onReset={this.handleReset} />
      );
    }
    return this.props.children;
  }
}
