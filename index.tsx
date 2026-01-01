
import React, { Component, ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';

console.log("🚀 BarberPro: Entry point reached. Initializing React 19...");

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("❌ React App Crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', fontFamily: 'Inter, sans-serif', backgroundColor: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '24px', borderRadius: '16px', maxWidth: '500px', width: '100%', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '12px' }}>System Boot Error</h1>
            <p style={{ color: '#991b1b', marginBottom: '20px' }}>The application failed to start correctly. This is usually due to conflicting React versions in the module cache.</p>
            <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.05)', padding: '12px', borderRadius: '8px', fontSize: '12px', overflow: 'auto', maxHeight: '150px', marginBottom: '20px' }}>
              <code style={{ whiteSpace: 'pre-wrap' }}>{this.state.error?.toString()}</code>
            </div>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }} 
              style={{ padding: '12px 24px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Reset Cache & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("❌ Root element not found!");
} else {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (err) {
    console.error("❌ Fatal React Init Error:", err);
  }
}
