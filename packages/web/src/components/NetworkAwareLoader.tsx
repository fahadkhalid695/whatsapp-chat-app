import React from 'react';
import { Box, CircularProgress, Typography, Alert, Button } from '@mui/material';
import { Wifi, WifiOff, SignalWifi1Bar } from '@mui/icons-material';
import useNetworkStatus from '../hooks/useNetworkStatus';

interface NetworkAwareLoaderProps {
  isLoading: boolean;
  hasError?: boolean;
  onRetry?: () => void;
  children?: React.ReactNode;
  loadingText?: string;
  errorText?: string;
}

const NetworkAwareLoader: React.FC<NetworkAwareLoaderProps> = ({
  isLoading,
  hasError = false,
  onRetry,
  children,
  loadingText = 'Loading...',
  errorText = 'Failed to load',
}) => {
  const { isOnline, isSlowConnection, effectiveType } = useNetworkStatus();

  if (hasError) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={3}
      >
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorText}
        </Alert>
        {onRetry && (
          <Button variant="outlined" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Box>
    );
  }

  if (!isOnline) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={3}
      >
        <WifiOff sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Internet Connection
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Please check your connection and try again
        </Typography>
      </Box>
    );
  }

  if (isLoading) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        p={3}
      >
        <Box display="flex" alignItems="center" mb={2}>
          <CircularProgress size={24} sx={{ mr: 2 }} />
          {isSlowConnection ? (
            <SignalWifi1Bar sx={{ color: 'warning.main' }} />
          ) : (
            <Wifi sx={{ color: 'success.main' }} />
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {loadingText}
        </Typography>
        
        {isSlowConnection && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 1 }}>
            Slow connection detected ({effectiveType})
          </Typography>
        )}
      </Box>
    );
  }

  return <>{children}</>;
};

export default NetworkAwareLoader;