import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    // Also reload the page to reset the application state
    window.location.href = '/';
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-900 text-center">
          <div className="max-w-md w-full p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-4 text-red-600 dark:text-red-400">
              Something went wrong
            </h2>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              <p className="mb-2">
                We encountered an unexpected error. The error has been logged.
              </p>
              <details className="mt-4 bg-gray-100 dark:bg-gray-700 p-2 rounded-md text-left">
                <summary className="cursor-pointer select-none">Technical details</summary>
                <p className="mt-2 font-mono text-xs overflow-auto whitespace-pre-wrap">
                  {this.state.error?.toString() || 'Unknown error'}
                </p>
              </details>
            </div>
            <Button onClick={this.handleReset} className="mt-4">
              Reset Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;