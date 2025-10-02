import React, { useState, useCallback } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';
import LazyImage from './LazyImage';

interface ResponsiveImageProps {
  src: string;
  alt: string;
  maxWidth?: number;
  maxHeight?: number;
  aspectRatio?: number;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

const ResponsiveImage: React.FC<ResponsiveImageProps> = ({
  src,
  alt,
  maxWidth = 400,
  maxHeight = 300,
  aspectRatio,
  onClick,
  className,
  style,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isTablet = useMediaQuery(theme.breakpoints.between('md', 'lg'));
  
  const [imageError, setImageError] = useState(false);

  // Responsive sizing
  const getResponsiveSize = useCallback(() => {
    let width = maxWidth;
    let height = maxHeight;

    if (isMobile) {
      width = Math.min(maxWidth, window.innerWidth * 0.8);
      height = Math.min(maxHeight, window.innerHeight * 0.4);
    } else if (isTablet) {
      width = Math.min(maxWidth, window.innerWidth * 0.6);
      height = Math.min(maxHeight, window.innerHeight * 0.5);
    }

    // Apply aspect ratio if provided
    if (aspectRatio) {
      if (width / height > aspectRatio) {
        width = height * aspectRatio;
      } else {
        height = width / aspectRatio;
      }
    }

    return { width, height };
  }, [maxWidth, maxHeight, aspectRatio, isMobile, isTablet]);

  const { width, height } = getResponsiveSize();

  const handleError = useCallback(() => {
    setImageError(true);
  }, []);

  const handleLoad = useCallback(() => {
    setImageError(false);
  }, []);

  return (
    <Box
      sx={{
        width,
        height,
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 1,
        overflow: 'hidden',
        ...style,
      }}
      className={className}
      onClick={onClick}
    >
      <LazyImage
        src={src}
        alt={alt}
        width={width}
        height={height}
        onLoad={handleLoad}
        onError={handleError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
    </Box>
  );
};

export default ResponsiveImage;