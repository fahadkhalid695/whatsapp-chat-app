import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import { theme } from './theme';



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