import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { runStartupDiagnostics } from './utils/diagnostics';

console.log('🚀 Starting WhatsApp Chat Web App...');

// Run diagnostics
runStartupDiagnostics();

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  throw new Error('Root element not found');
}

console.log('✅ Root element found, creating React root...');

const root = ReactDOM.createRoot(rootElement as HTMLElement);

console.log('✅ React root created, rendering app...');

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

console.log('✅ App rendered successfully!');