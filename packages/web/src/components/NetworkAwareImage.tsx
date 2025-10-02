import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Button, Chip } from '@mui/material';
import { WifiOff, SignalWifi1Bar, Wifi } from '@mui/icons-material';
import LazyImage from './LazyImage';
import useNetworkStatus from '../hooks/useNetworkStatus';

interface NetworkAwareImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  lowQualitySrc?: string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  style?: React.CSSProperties;
  autoOptimize?: boolean;
}

const NetworkAwareImage: React.FC<NetworkAwareImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 'auto',
  lowQualitySrc,
  placeholder,
  onLoad,
  onError,
  className,
  style,
  autoOptimize = true,
}) => {
  const { isOnline, isSlowConnection, effectiveType, downlink } = useNetworkStatus();
  const [userChoice, setUserChoice] = useState<'auto' | 'high' | 'low'>('auto');
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  const shouldUseHighQuality = useCallback(() => {
    if (userChoice === 'high') return true;
    if (userChoice === 'low') return false;
    
    // Auto mode
    if (!autoOptimize) return true;
    if (!isOnline) return false;
    if (isSlowConnection) return false;
    if (effectiveType === 'slow-2g' || effectiveType === '2g') return false;
    if (downlink < 1.5) return false;
    
    return true;
  }, [userChoice, autoOptimize, isOnline, isSlowConnection, effectiveType, downlink]);

  const getImageSrc = useCallback(() => {
    if (shouldUseHighQuality()) {
      return src;
    }
    return lowQualitySrc || src;
  }, [src, lowQualitySrc, shouldUseHighQuality]);

  const getNetworkIcon = () => {
    if (!isOnline) return <WifiOff color="error" />;
    if (isSlowConnection) return <SignalWifi1Bar color="warning" />;
    return <Wifi color="success" />;
  };

  const getQualityLabel = () => {
    if (userChoice !== 'auto') return userChoice.toUpperCase();
    return shouldUseHighQuality() ? 'HIGH' : 'LOW';
  };

  const getConnectionLabel = () => {
    if (!isOnline) return 'Offline';
    if (isSlowConnection) return `Slow (${effectiveType})`;
    return `Fast (${effectiveType})`;
  };

  if (!isOnline) {
    return (
      <Box
        sx={{
          width,
          height,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'grey.100',
          border: '1px dashed',
          borderColor: 'grey.300',
          borderRadius: 1,
          p: 2,
        }}
        className={className}
        style={style}
      >
        <WifiOff sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        <Typography variant="body2" color="text.secondary" textAlign="center">
          Image unavailable offline
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width, height }} className={className} style={style}>
      <LazyImage
        src={getImageSrc()}
        alt={alt}
        width={width}
        height={height}
        placeholder={placeholder}
        onLoad={onLoad}
        onError={onError}
        enableCache={true}
      />
      
      {/* Network status indicator */}
      <Box
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          gap: 1,
          opacity: showQualityOptions ? 1 : 0.7,
          transition: 'opacity 0.2s',
        }}
      >
        <Chip
          icon={getNetworkIcon()}
          label={getConnectionLabel()}
          size="small"
          variant="filled"
          sx={{
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '0.75rem',
          }}
          onClick={() => setShowQualityOptions(!showQualityOptions)}
        />
        
        <Chip
          label={getQualityLabel()}
          size="small"
          variant="filled"
          color={shouldUseHighQuality() ? 'success' : 'warning'}
          sx={{ fontSize: '0.75rem' }}
          onClick={() => setShowQualityOptions(!showQualityOptions)}
        />
      </Box>

      {/* Quality selection options */}
      {showQualityOptions && lowQualitySrc && (
        <Box
          sx={{
            position: 'absolute',
            top: 48,
            right: 8,
            backgroundColor: 'background.paper',
            borderRadius: 1,
            boxShadow: 2,
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5,
            minWidth: 120,
          }}
        >
          <Button
            size="small"
            variant={userChoice === 'auto' ? 'contained' : 'text'}
            onClick={() => {
              setUserChoice('auto');
              setShowQualityOptions(false);
            }}
          >
            Auto
          </Button>
          <Button
            size="small"
            variant={userChoice === 'high' ? 'contained' : 'text'}
            onClick={() => {
              setUserChoice('high');
              setShowQualityOptions(false);
            }}
          >
            High Quality
          </Button>
          <Button
            size="small"
            variant={userChoice === 'low' ? 'contained' : 'text'}
            onClick={() => {
              setUserChoice('low');
              setShowQualityOptions(false);
            }}
          >
            Low Quality
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default NetworkAwareImage;