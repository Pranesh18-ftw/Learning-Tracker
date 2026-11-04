import React, { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { sanitizeErrorMessage } from '../utils/securityUtils';

/**
 * ErrorBoundary
 *
 * Truthful, resilient error boundary preventing a single component or route failure
 * from blanking the entire application or corrupting user data.
 *
 * Features:
 * - Traps uncaught render errors
 * - Logs diagnostic details for production triage
 * - Displays a helpful, non-fatal fallback UI with retry capability
 * - Preserves navigation and all other application surfaces
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled rendering error:', error, errorInfo);
    this.setState({ errorInfo });
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      const title = this.props.fallbackTitle || (this.props.componentName
        ? `Something went wrong in ${this.props.componentName}`
        : 'This section encountered an unexpected error');

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="p-6 sm:p-8 rounded-3xl bg-rose-50/80 dark:bg-rose-950/30 border-2 border-rose-200 dark:border-rose-900/60 text-slate-800 dark:text-slate-100 space-y-4 my-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-rose-950 dark:text-rose-200">
                {title}
              </h3>
              <p className="text-xs text-rose-700 dark:text-rose-300 font-sans">
                Your saved learning progress and session records remain completely safe.
              </p>
            </div>
          </div>

          {this.state.error && (
            <div className="p-3 rounded-xl bg-white/70 dark:bg-slate-900/80 border border-rose-200 dark:border-rose-900 text-xs font-mono text-rose-900 dark:text-rose-300 overflow-x-auto">
              <code>{sanitizeErrorMessage(this.state.error)}</code>
            </div>
          )}

          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again</span>
            </button>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Other application surfaces remain functional.
            </span>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
