import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  Card, 
  CardContent, 
  Avatar, 
  Chip,
  Grid,
  Paper,
  Fade,
  Grow,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  WhatsApp, 
  Chat, 
  Person, 
  Phone, 
  Settings,
  Logout,
  DarkMode,
  LightMode
} from '@mui/icons-material';
import { useAuthStore } from './store/authStore';
import { useNavigate } from 'react-router-dom';

const TestComponent: React.FC = () => {
  const { user, setUser, setToken, logout } = useAuthStore();
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  const handleLogin = () => {
    setToken('test-token');
    setUser({
      id: '1',
      phoneNumber: '+1234567890',
      displayName: 'John Doe',
      profilePicture: 'https://i.pravatar.cc/150?img=1',
      status: 'Hey there! I am using WhatsApp.',
      lastSeen: new Date(),
      isOnline: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const handleLogout = () => {
    logout();
  };

  const goToChat = () => {
    navigate('/chat');
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 50%, #075E54 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 2,
      }}
    >
      <Fade in={true} timeout={800}>
        <Card
          sx={{
            maxWidth: 500,
            width: '100%',
            borderRadius: 4,
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <CardContent sx={{ p: 4 }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Grow in={true} timeout={1000}>
                <Avatar
                  sx={{
                    width: 80,
                    height: 80,
                    bgcolor: '#25D366',
                    margin: '0 auto 16px',
                    boxShadow: '0 8px 16px rgba(37, 211, 102, 0.3)',
                  }}
                >
                  <WhatsApp sx={{ fontSize: 40 }} />
                </Avatar>
              </Grow>
              
              <Typography 
                variant="h4" 
                component="h1" 
                gutterBottom
                sx={{ 
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #25D366, #128C7E)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                WhatsApp Web
              </Typography>
              
              <Typography 
                variant="body1" 
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Enterprise-Grade Messaging Platform
              </Typography>

              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                <Chip 
                  label="Real-time" 
                  size="small" 
                  color="success" 
                  variant="outlined" 
                />
                <Chip 
                  label="Secure" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                />
                <Chip 
                  label="Fast" 
                  size="small" 
                  color="info" 
                  variant="outlined" 
                />
              </Box>
            </Box>

            {/* User Section */}
            {user ? (
              <Fade in={true} timeout={600}>
                <Box>
                  <Paper 
                    sx={{ 
                      p: 3, 
                      mb: 3, 
                      borderRadius: 3,
                      background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.1) 0%, rgba(18, 140, 126, 0.1) 100%)',
                      border: '1px solid rgba(37, 211, 102, 0.2)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar 
                        src={user.profilePicture} 
                        sx={{ width: 60, height: 60 }}
                      >
                        {user.displayName.charAt(0)}
                      </Avatar>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" fontWeight="bold">
                          {user.displayName}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">
                            {user.phoneNumber}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              bgcolor: user.isOnline ? 'success.main' : 'grey.400',
                            }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {user.isOnline ? 'Online' : 'Last seen recently'}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                    
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontStyle: 'italic',
                        color: 'text.secondary',
                        mb: 2,
                        p: 1,
                        bgcolor: 'rgba(255,255,255,0.5)',
                        borderRadius: 2,
                      }}
                    >
                      "{user.status}"
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Button 
                          fullWidth
                          variant="contained" 
                          startIcon={<Chat />}
                          onClick={goToChat}
                          sx={{ 
                            borderRadius: 2,
                            py: 1.5,
                            background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
                            '&:hover': {
                              background: 'linear-gradient(45deg, #128C7E 30%, #25D366 90%)',
                            },
                          }}
                        >
                          Open Chat
                        </Button>
                      </Grid>
                      <Grid item xs={6}>
                        <Button 
                          fullWidth
                          variant="outlined" 
                          startIcon={<Logout />}
                          onClick={handleLogout}
                          sx={{ 
                            borderRadius: 2,
                            py: 1.5,
                            borderColor: 'error.main',
                            color: 'error.main',
                            '&:hover': {
                              borderColor: 'error.dark',
                              bgcolor: 'error.light',
                            },
                          }}
                        >
                          Logout
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>
                </Box>
              </Fade>
            ) : (
              <Fade in={true} timeout={600}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography 
                    variant="body1" 
                    gutterBottom
                    sx={{ mb: 3, color: 'text.secondary' }}
                  >
                    Choose how you'd like to get started
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Button 
                        fullWidth
                        variant="contained" 
                        size="large"
                        startIcon={<Person />}
                        onClick={handleLogin}
                        sx={{ 
                          py: 2,
                          borderRadius: 3,
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
                          '&:hover': {
                            background: 'linear-gradient(45deg, #128C7E 30%, #25D366 90%)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Quick Demo Login
                      </Button>
                    </Grid>
                    <Grid item xs={12}>
                      <Button 
                        fullWidth
                        variant="outlined" 
                        size="large"
                        startIcon={<Phone />}
                        onClick={goToLogin}
                        sx={{ 
                          py: 2,
                          borderRadius: 3,
                          fontSize: '1.1rem',
                          fontWeight: 'bold',
                          borderColor: '#25D366',
                          color: '#25D366',
                          '&:hover': {
                            borderColor: '#128C7E',
                            bgcolor: 'rgba(37, 211, 102, 0.1)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Login with Phone
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </Fade>
            )}

            {/* Footer */}
            <Box sx={{ textAlign: 'center', mt: 4, pt: 3, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 2 }}>
                <Tooltip title="Settings">
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <Settings />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Toggle Theme">
                  <IconButton 
                    size="small" 
                    onClick={() => setDarkMode(!darkMode)}
                    sx={{ color: 'text.secondary' }}
                  >
                    {darkMode ? <LightMode /> : <DarkMode />}
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '0.75rem' }}
              >
                Secure • End-to-End Encrypted • Enterprise Ready
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Fade>
    </Box>
  );
};

export default TestComponent;