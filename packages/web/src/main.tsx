import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

console.log('🚀 Starting WhatsApp Chat Web App...');

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = '<h1>Error: Root element not found!</h1>';
} else {
  console.log('✅ Root element found, creating React root...');
  
  try {
    const root = ReactDOM.createRoot(rootElement as HTMLElement);
    console.log('✅ React root created, rendering test component...');
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    console.log('✅ Test component with Error Boundary rendered successfully!');
  } catch (error) {
    console.error('❌ Error rendering component:', error);
    document.body.innerHTML = `<h1>Error rendering React: ${error.message}</h1>`;
  }
}