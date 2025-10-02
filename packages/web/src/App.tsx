import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuthStore } from './store/authStore';
import { socketService } from './services/socket';
import LoginPage from './pages/LoginPage';
import VerificationPage from './pages/VerificationPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import ChatPage from './pages/ChatPage';
// import PerformanceMonitor from './components/PerformanceMonitor';

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
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 960,
      lg: 1280,
      xl: 1920,
    },
  },
  components: {
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            paddingLeft: 8,
            paddingRight: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            '& .MuiToolbar-root': {
              minHeight: 56,
              paddingLeft: 8,
              paddingRight: 8,
            },
          },
        },
      },
    },
  },
});

const App: React.FC = () => {
  const { isAuthenticated, token, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && token) {
      socketService.connect();
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
            path="/verify" 
            element={!isAuthenticated ? <VerificationPage /> : <Navigate to="/chat" replace />} 
          />
          <Route 
            path="/profile-setup" 
            element={isAuthenticated && !user?.displayName ? <ProfileSetupPage /> : <Navigate to="/chat" replace />} 
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
        {/* <PerformanceMonitor /> */}
      </Router>
    </ThemeProvider>
  );
};

export default App;