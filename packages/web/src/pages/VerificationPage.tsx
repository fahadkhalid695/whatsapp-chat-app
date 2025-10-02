import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

interface VerificationForm {
  code: string;
  displayName: string;
}

const VerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser, setToken, setLoading, isLoading } = useAuthStore();
  const [error, setError] = useState<string>('');

  const phoneNumber = location.state?.phoneNumber;
  const verificationId = location.state?.verificationId;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VerificationForm>();

  React.useEffect(() => {
    if (!phoneNumber || !verificationId) {
      navigate('/login');
    }
  }, [phoneNumber, verificationId, navigate]);

  const onSubmit = async (data: VerificationForm) => {
    try {
      setError('');
      setLoading(true);
      
      const response = await authService.verify({
        verificationId,
        code: data.code,
        displayName: data.displayName,
      });
      
      setToken(response.token);
      setUser(response.user);
      
      // Check if user needs to set up profile
      if (!response.user.displayName) {
        navigate('/profile-setup');
      } else {
        navigate('/chat');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setError('');
      await authService.login({ phoneNumber });
      // Show success message or update UI
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code');
    }
  };

  if (!phoneNumber || !verificationId) {
    return null;
  }

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
              Verify Your Phone
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We sent a verification code to
            </Typography>
            <Typography variant="body1" fontWeight="bold">
              {phoneNumber}
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
              label="Display Name"
              placeholder="Enter your name"
              {...register('displayName', {
                required: 'Display name is required',
                minLength: {
                  value: 1,
                  message: 'Display name cannot be empty',
                },
              })}
              error={!!errors.displayName}
              helperText={errors.displayName?.message}
              sx={{ mb: 2 }}
              disabled={isLoading}
            />

            <TextField
              fullWidth
              label="Verification Code"
              placeholder="Enter 6-digit code"
              {...register('code', {
                required: 'Verification code is required',
                pattern: {
                  value: /^\d{6}$/,
                  message: 'Please enter a valid 6-digit code',
                },
              })}
              error={!!errors.code}
              helperText={errors.code?.message}
              sx={{ mb: 3 }}
              disabled={isLoading}
              inputProps={{ maxLength: 6 }}
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
                'Verify Code'
              )}
            </Button>

            <Button
              fullWidth
              variant="text"
              onClick={handleResendCode}
              disabled={isLoading}
            >
              Resend Code
            </Button>
          </form>

          <Box textAlign="center" mt={2}>
            <Button
              variant="text"
              onClick={() => navigate('/login')}
              disabled={isLoading}
            >
              Change Phone Number
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VerificationPage;