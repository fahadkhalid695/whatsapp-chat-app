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
} from '@mui/material';
import { useForm } from 'react-hook-form';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';

interface LoginForm {
  phoneNumber: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setLoading, isLoading } = useAuthStore();
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
      
      const response = await authService.login(data);
      
      // Navigate to verification page with phone number and verification ID
      navigate('/verify', { 
        state: { 
          phoneNumber: data.phoneNumber, 
          verificationId: response.verificationId 
        } 
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" component="h1" gutterBottom>
              Welcome to Chat
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Enter your phone number to get started
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <TextField
              fullWidth
              label="Phone Number"
              placeholder="+1234567890"
              {...register('phoneNumber', {
                required: 'Phone number is required',
                pattern: {
                  value: /^\+[1-9]\d{1,14}$/,
                  message: 'Please enter a valid phone number with country code',
                },
              })}
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
              sx={{ mb: 3 }}
              disabled={isLoading}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={isLoading}
              sx={{ mb: 2 }}
            >
              {isLoading ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                'Send Verification Code'
              )}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default LoginPage;