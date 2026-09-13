import React, { Component, ErrorInfo, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import { WalletProvider } from './web3/WalletContext';
import './styles/globals.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled Application Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#07070a',
          color: '#dee9fc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
          fontFamily: 'monospace'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: '#13141f',
            border: '1px solid #ef4444',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h1 style={{ color: '#ef4444', fontSize: '20px', marginBottom: '12px' }}>
              ⚠️ Application Encountered an Error
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
              {this.state.error?.message || 'An unexpected rendering error occurred.'}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              style={{
                backgroundColor: '#a3e635',
                color: '#07070a',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <WalletProvider>
        <App />
      </WalletProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
