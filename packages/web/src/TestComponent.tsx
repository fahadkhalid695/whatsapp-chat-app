import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { useAuthStore } from './store/authStore';

const TestComponent: React.FC = () => {
  const { user, setUser, setToken } = useAuthStore();

  const handleLogin = () => {
    setToken('test-token');
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
    <Box sx={{ p: 4, textAlign: 'center' }}>
      <Typography variant="h4" gutterBottom>
        WhatsApp Chat App - Test Mode
      </Typography>
      
      {user ? (
        <Box>
          <Typography variant="h6">Welcome, {user.displayName}!</Typography>
          <Typography>Phone: {user.phoneNumber}</Typography>
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            href="/chat"
          >
            Go to Chat
          </Button>
        </Box>
      ) : (
        <Box>
          <Typography variant="body1" gutterBottom>
            Click below to test login
          </Typography>
          <Button 
            variant="contained" 
            onClick={handleLogin}
            sx={{ mt: 2 }}
          >
            Test Login
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default TestComponent;