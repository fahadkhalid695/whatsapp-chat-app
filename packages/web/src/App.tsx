import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';

// Simple placeholder components for now
const SimplePage = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div style={{ padding: '20px', textAlign: 'center' }}>
    <h1 style={{ color: '#25D366' }}>{title}</h1>
    {children}
  </div>
);

const LoginPage = () => {
  const { setUser, setToken } = useAuthStore();
  
  const handleLogin = () => {
    // Mock login
    setToken('mock-token');
    setUser({
      id: '1',
      phoneNumber: '+1234567890',
      displayName: 'Test User',
      status: 'Available',
      lastSeen: new Date(),
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };
  
  return (
    <SimplePage title="Login">
      <p>✅ Login page working!</p>
      <button 
        onClick={handleLogin}
        style={{
          padding: '12px 24px',
          backgroundColor: '#25D366',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Mock Login
      </button>
    </SimplePage>
  );
};

const ChatPage = () => {
  const { user, logout } = useAuthStore();
  
  return (
    <SimplePage title="Chat">
      <p>✅ Welcome, {user?.displayName}!</p>
      <p>✅ Chat page working!</p>
      <button 
        onClick={logout}
        style={{
          padding: '8px 16px',
          backgroundColor: '#dc3545',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Logout
      </button>
    </SimplePage>
  );
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#25D366', // WhatsApp green
    },
    secondary: {
      main: '#128C7E', // Darker WhatsApp green
    },
    background: {
      default: '#f0f0f0',
      paper: '#ffffff',
    },
  },
});

const App: React.FC = () => {
  console.log('🎯 App component rendering...');
  
  const { isAuthenticated, token, user } = useAuthStore();
  
  console.log('🔐 Auth state:', { isAuthenticated, hasToken: !!token, hasUser: !!user });

  // Commented out socket connection for now
  // useEffect(() => {
  //   if (isAuthenticated && token) {
  //     socketService.connect();
  //   }
  //   return () => {
  //     socketService.disconnect();
  //   };
  // }, [isAuthenticated, token]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/chat" replace />} 
          />
          <Route 
            path="/chat" 
            element={isAuthenticated ? <ChatPage /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="/" 
            element={<Navigate to={isAuthenticated ? "/chat" : "/login"} replace />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;