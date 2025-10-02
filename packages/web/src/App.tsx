import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import TestComponent from './TestComponent';
import { theme } from './theme';
import { socketService } from './services/socket';



const App: React.FC = () => {
  console.log('🎯 App component rendering...');
  
  const { isAuthenticated, token, user } = useAuthStore();
  
  console.log('🔐 Auth state:', { isAuthenticated, hasToken: !!token, hasUser: !!user });

  // Socket connection management
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('🔌 Connecting to socket server...');
      socketService.connect();
    } else {
      console.log('🔌 Disconnecting from socket server...');
      socketService.disconnect();
    }
    
    return () => {
      socketService.disconnect();
    };
  }, [isAuthenticated, token]);

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
            path="/test" 
            element={<TestComponent />} 
          />
          <Route 
            path="/" 
            element={<Navigate to="/test" replace />} 
          />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;