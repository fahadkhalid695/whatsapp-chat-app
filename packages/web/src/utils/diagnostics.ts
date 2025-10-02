// Diagnostic utilities for debugging startup issues
import React from 'react';

export const runStartupDiagnostics = () => {
  console.log('🔍 Running startup diagnostics...');
  
  // Check environment
  console.log('🌍 Environment:', {
    NODE_ENV: import.meta.env.NODE_ENV,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    VITE_WS_URL: import.meta.env.VITE_WS_URL,
  });
  
  // Check DOM
  console.log('📄 DOM ready state:', document.readyState);
  console.log('📄 Root element exists:', !!document.getElementById('root'));
  
  // Check browser capabilities
  console.log('🌐 Browser capabilities:', {
    localStorage: typeof localStorage !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    WebSocket: typeof WebSocket !== 'undefined',
    fetch: typeof fetch !== 'undefined',
  });
  
  // Check React
  console.log('⚛️ React version:', React.version);
  
  // Check dependencies
  try {
    console.log('📦 Dependencies check:');
    console.log('  - React Router:', typeof import('react-router-dom'));
    console.log('  - Material-UI:', typeof import('@mui/material'));
    console.log('  - Zustand:', typeof import('zustand'));
    console.log('  - Axios:', typeof import('axios'));
  } catch (error) {
    console.error('❌ Dependency check failed:', error);
  }
  
  console.log('✅ Startup diagnostics complete');
};

// Add to window for manual debugging
(window as any).runDiagnostics = runStartupDiagnostics;