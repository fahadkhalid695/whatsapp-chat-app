import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Snackbar,
  Alert,
  LinearProgress,
  Chip,
  Fade,
  Slide,
} from '@mui/material';
import {
  Wifi,
  WifiOff,
  CloudOff,
  Sync,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { apiClient } from '../services/api';

interface ConnectionStatusProps {
  socketConnected: boolean;
  onlineStatus: boolean;
}

type ConnectionState = 'online' | 'offline' | 'reconnecting' | 'degraded';

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  socketConnected,
  onlineStatus,
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('online');
  const [showStatus, setShowStatus] = useState(false);
  const [lastConnected, setLastConnected] = useState<Date>(new Date());
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const determineConnectionState = () => {
      if (!onlineStatus) {
        return 'offline';
      }
      if (!socketConnected) {
        return 'reconnecting';
      }
      return 'online';
    };

    const newState = determineConnectionState();
    
    if (newState !== connectionState) {
      setConnectionState(newState);
      
      if (newState === 'online' && connectionState !== 'online') {
        setLastConnected(new Date());
        setRetryCount(0);
      }
      
      if (newState !== 'online') {
        setRetryCount(prev => prev + 1);
      }
      
      // Show status for important changes
      if (newState === 'offline' || newState === 'reconnecting' || 
          (newState === 'online' && connectionState !== 'online')) {
        setShowStatus(true);
        
        // Auto-hide after 3 seconds for online status
        if (newState === 'online') {
          setTimeout(() => setShowStatus(false), 3000);
        }
      }
    }
  }, [socketConnected, onlineStatus, connectionState]);

  const getStatusConfig = () => {
    switch (connectionState) {
      case 'online':
        return {
          color: 'success' as const,
          icon: <CheckCircle fontSize="small" />,
          message: 'Connected',
          description: 'All systems operational',
          showProgress: false,
        };
      case 'offline':
        return {
          color: 'error' as const,
          icon: <WifiOff fontSize="small" />,
          message: 'No Internet Connection',
          description: 'Check your network connection',
          showProgress: false,
        };
      case 'reconnecting':
        return {
          color: 'warning' as const,
          icon: <Sync fontSize="small" sx={{ animation: 'spin 1s linear infinite' }} />,
          message: 'Reconnecting...',
          description: `Attempt ${retryCount}`,
          showProgress: true,
        };
      case 'degraded':
        return {
          color: 'warning' as const,
          icon: <Warning fontSize="small" />,
          message: 'Limited Connectivity',
          description: 'Some features may be unavailable',
          showProgress: false,
        };
      default:
        return {
          color: 'info' as const,
          icon: <Wifi fontSize="small" />,
          message: 'Connecting...',
          description: 'Establishing connection',
          showProgress: true,
        };
    }
  };

  const statusConfig = getStatusConfig();

  // Persistent status bar for non-online states
  const showPersistentBar = connectionState !== 'online';

  return (
    <>
      {/* Persistent Status Bar */}
      <Slide direction="down" in={showPersistentBar} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1300,
            bgcolor: statusConfig.color === 'error' ? 'error.main' : 
                     statusConfig.color === 'warning' ? 'warning.main' : 'info.main',
            color: 'white',
            py: 1,
            px: 2,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 1,
            }}
          >
            {statusConfig.icon}
            <Typography variant="body2" fontWeight="medium">
              {statusConfig.message}
            </Typography>
            {statusConfig.description && (
              <Typography variant="caption" sx={{ opacity: 0.9 }}>
                • {statusConfig.description}
              </Typography>
            )}
          </Box>
          
          {statusConfig.showProgress && (
            <LinearProgress
              sx={{
                mt: 0.5,
                height: 2,
                bgcolor: 'rgba(255,255,255,0.2)',
                '& .MuiLinearProgress-bar': {
                  bgcolor: 'rgba(255,255,255,0.8)',
                },
              }}
            />
          )}
        </Box>
      </Slide>

      {/* Toast Notifications */}
      <Snackbar
        open={showStatus && connectionState === 'online'}
        autoHideDuration={3000}
        onClose={() => setShowStatus(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          variant="filled"
          icon={<CheckCircle />}
          sx={{
            borderRadius: 2,
            '& .MuiAlert-message': {
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            },
          }}
        >
          <Box>
            <Typography variant="body2" fontWeight="medium">
              Connection Restored
            </Typography>
            <Typography variant="caption">
              Connected at {lastConnected.toLocaleTimeString()}
            </Typography>
          </Box>
        </Alert>
      </Snackbar>

      {/* Connection Quality Indicator (for chat header) */}
      <Fade in={true}>
        <Chip
          size="small"
          icon={statusConfig.icon}
          label={connectionState === 'online' ? 'Online' : statusConfig.message}
          color={statusConfig.color}
          variant={connectionState === 'online' ? 'outlined' : 'filled'}
          sx={{
            height: 24,
            fontSize: '0.75rem',
            '& .MuiChip-icon': {
              fontSize: '0.875rem',
            },
          }}
        />
      </Fade>

      {/* CSS for spin animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default ConnectionStatus;