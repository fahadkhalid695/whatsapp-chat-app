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
  IconButton,
} from '@mui/material';
import { PhotoCamera } from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { authService } from '../services/auth';
import { useAuthStore } from '../store/authStore';

interface ProfileForm {
  displayName: string;
}

const ProfileSetupPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser, setLoading, isLoading } = useAuthStore();
  const [error, setError] = useState<string>('');
  const [profilePicture, setProfilePicture] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileForm>();

  const handleProfilePictureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePicture(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ProfileForm) => {
    try {
      setError('');
      setLoading(true);
      
      const updatedUser = await authService.setupProfile({
        displayName: data.displayName,
        profilePicture,
      });
      
      setUser(updatedUser);
      navigate('/chat');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set up profile');
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
              Set Up Your Profile
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Add your name and photo to complete your profile
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit)}>
            <Box textAlign="center" mb={3}>
              <Box position="relative" display="inline-block">
                <Avatar
                  src={profilePicture}
                  sx={{ width: 100, height: 100, mb: 1 }}
                >
                  {!profilePicture && user?.displayName?.[0]?.toUpperCase()}
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    backgroundColor: 'primary.main',
                    color: 'white',
                    '&:hover': {
                      backgroundColor: 'primary.dark',
                    },
                  }}
                >
                  <PhotoCamera />
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleProfilePictureChange}
                  />
                </IconButton>
              </Box>
              <Typography variant="body2" color="text.secondary">
                Add a profile photo
              </Typography>
            </Box>

            <TextField
              fullWidth
              label="Display Name"
              placeholder="Enter your name"
              {...register('displayName', {
                required: 'Display name is required',
                minLength: {
                  value: 2,
                  message: 'Name must be at least 2 characters',
                },
                maxLength: {
                  value: 50,
                  message: 'Name must be less than 50 characters',
                },
              })}
              error={!!errors.displayName}
              helperText={errors.displayName?.message}
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
                'Complete Setup'
              )}
            </Button>
          </form>

          <Typography variant="body2" color="text.secondary" textAlign="center">
            You can change these details later in settings
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
};

export default ProfileSetupPage;