/**
 * Error boundary and data validation HOC for components using enriched data
 */

import React, { Component, ErrorInfo, ReactNode } from "react";
import { toSafeString } from "./utils";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Error Boundary for catching React rendering errors
 */
export class DataErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("DataErrorBoundary caught an error:", error, errorInfo);
    
    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // Here you could send to Sentry, LogRocket, etc.
    }
    
    this.props.onError?.(error, errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-2">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Erreur d'affichage des données</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Une erreur s'est produite lors du rendu des données enrichies.</p>
                {process.env.NODE_ENV === "development" && this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer font-medium">Détails techniques</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components that handle enriched data
 */
export function withDataValidation<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: {
    fallback?: ReactNode;
    validateProps?: (props: P) => P;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
  } = {}
) {
  const WithDataValidation = (props: P) => {
    // Validate and clean props if needed
    const validatedProps = options.validateProps ? options.validateProps(props) : props;
    
    return (
      <DataErrorBoundary fallback={options.fallback} onError={options.onError}>
        <WrappedComponent {...validatedProps} />
      </DataErrorBoundary>
    );
  };
  
  WithDataValidation.displayName = `withDataValidation(${WrappedComponent.displayName || WrappedComponent.name})`;
  
  return WithDataValidation;
}

/**
 * Helper hook for safe data access in components
 */
export function useSafeData<T>(data: T | undefined | null, fallback: T): T {
  try {
    return data ?? fallback;
  } catch (error) {
    console.warn("useSafeData: Error accessing data", error);
    return fallback;
  }
}

/**
 * Validate component props that contain enriched data
 */
export function validateEnrichedProps<T extends Record<string, any>>(props: T): T {
  const validated = { ...props };
  
  // Common enriched array fields
  const arrayFields = [
    'competences', 'competences_transversales', 'formations', 'certifications',
    'conditions_travail', 'environnements', 'secteurs_activite', 
    'traits_personnalite', 'autres_appellations', 'statuts_professionnels'
  ];
  
  arrayFields.forEach(field => {
    if (validated[field] !== undefined) {
      if (!Array.isArray(validated[field])) {
        console.warn(`validateEnrichedProps: ${field} should be an array, got:`, typeof validated[field]);
        (validated as any)[field] = [];
      }
    }
  });
  
  return validated;
}