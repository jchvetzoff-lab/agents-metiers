"use client";

import React, { Component, type ReactNode } from "react";

/**
 * Error boundary for individual page sections.
 * When a chart or section crashes, only THAT section shows an error —
 * the rest of the page keeps working.
 *
 * Usage:
 *   <SectionErrorBoundary name="RIASEC Chart">
 *     <RiasecChart ... />
 *   </SectionErrorBoundary>
 */

interface Props {
  children: ReactNode;
  /** Human-readable section name (shown in error UI) */
  name?: string;
  /** Optional compact mode for smaller sections */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.name || "Section"} crashed:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const { name, compact } = this.props;

      if (compact) {
        return (
          <div className="rounded-lg border border-red-500/20 bg-red-500/[0.05] p-3 text-center">
            <p className="text-xs text-red-400">
              Erreur dans {name || "cette section"}
            </p>
            <button
              onClick={this.handleRetry}
              className="mt-1 text-[11px] text-red-400 underline hover:text-red-300"
            >
              Reessayer
            </button>
          </div>
        );
      }

      return (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center space-y-3">
          <div className="text-3xl">&#x26A0;&#xFE0F;</div>
          <p className="text-sm text-red-400 font-medium">
            Impossible d&apos;afficher {name ? `la section "${name}"` : "cette section"}
          </p>
          <p className="text-xs text-gray-500">
            {this.state.error?.message || "Une erreur inattendue s'est produite."}
          </p>
          <button
            onClick={this.handleRetry}
            className="px-4 py-2 text-xs font-medium text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/10 transition"
          >
            Reessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
