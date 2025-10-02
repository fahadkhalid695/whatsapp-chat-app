import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Avatar,
} from '@mui/material';
import { WhatsApp, Phone } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { useAuthStore } from '../store/authStore';

interface LoginForm {
  phoneNumber: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading, isLoading, setUser, setToken } = useAuthStore();
  const [error, setError] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    try {
      setError('');
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful login
      setToken('mock-jwt-token');
      setUser({
        id: '1',
        phoneNumber: data.phoneNumber,
        displayName: 'John Doe',
        profilePicture: 'https://i.pravatar.cc/150?img=1',
        status: 'Hey there! I am using WhatsApp.',
        lastSeen: new Date(),
        isOnline: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      navigate('/chat');
    } catch (err: any) {
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2,
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={8} 
          sx={{ 
            p: 4, 
            borderRadius: 3,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Box textAlign="center" mb={4}>
            <Avatar
              sx={{
                width: 80,
                height: 80,
                bgcolor: '#25D366',
                margin: '0 auto 16px',
              }}
            >
              <WhatsApp sx={{ fontSize: 40 }} />
            </Avatar>
            
            <Typography 
              variant="h4" 
              component="h1" 
              gutterBottom
              sx={{ 
                fontWeight: 'bold',
                color: '#1f1f1f',
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
              Enter your phone number to get started
            </Typography>
            
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.875rem',
                lineHeight: 1.5
              }}
            >
              You'll receive a verification code via SMS
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Phone Number"
              placeholder="+1 (555) 123-4567"
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\+?[1-9]\d{1,14}$/,
                  message: 'Please enter a valid phone number',
                },
              })}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
              sx={{ mb: 3 }}
              disabled={isLoading}
              InputProps={{
                startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ 
                mb: 3,
                py: 1.5,
                fontSize: '1.1rem',
                fontWeight: 'bold',
                borderRadius: 2,
                background: 'linear-gradient(45deg, #25D366 30%, #128C7E 90%)',
                '&:hover': {
                  background: 'linear-gradient(45deg, #128C7E 30%, #25D366 90%)',
                },
              }}
            >
              {isLoading ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CircularProgress size={20} color="inherit" />
                  Sending Code...
                </Box>
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>

          <Box textAlign="center">
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{ fontSize: '0.75rem' }}
            >
              By continuing, you agree to our{' '}
              <Typography 
                component="span" 
                sx={{ 
                  color: '#25D366', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Terms of Service
              </Typography>
              {' '}and{' '}
              <Typography 
                component="span" 
                sx={{ 
                  color: '#25D366', 
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Privacy Policy
              </Typography>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage;