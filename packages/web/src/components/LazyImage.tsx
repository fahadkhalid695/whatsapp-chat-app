import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Skeleton, IconButton } from '@mui/material';
import { Refresh } from '@mui/icons-material';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  placeholder?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  style?: React.CSSProperties;
  threshold?: number;
  enableCache?: boolean;
}

import { loadImageWithCache } from '../utils/imageCache';

const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width = '100%',
  height = 'auto',
  placeholder,
  onLoad,
  onError,
  className,
  style,
  threshold = 0.1,
  enableCache = true,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [cachedSrc, setCachedSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  // Load image with caching when in view
  useEffect(() => {
    if (!isInView || hasError) return;

    const loadImage = async () => {
      try {
        if (enableCache) {
          const cachedUrl = await loadImageWithCache(src);
          setCachedSrc(cachedUrl);
        } else {
          setCachedSrc(src);
        }
      } catch (error) {
        setHasError(true);
        onError?.();
      }
    };

    loadImage();
  }, [isInView, src, enableCache, hasError, onError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    setHasError(false);
    setIsRetrying(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    setIsRetrying(false);
    onError?.();
  }, [onError]);

  const handleRetry = useCallback(async () => {
    setHasError(false);
    setIsRetrying(true);
    setIsLoaded(false);
    
    try {
      // Force reload by changing src
      const newSrc = src.includes('?') ? `${src}&retry=${Date.now()}` : `${src}?retry=${Date.now()}`;
      
      if (enableCache) {
        const cachedUrl = await loadImageWithCache(newSrc);
        setCachedSrc(cachedUrl);
      } else {
        setCachedSrc(newSrc);
      }
    } catch (error) {
      setHasError(true);
      setIsRetrying(false);
    }
  }, [src, enableCache]);

  const defaultPlaceholder = (
    <Skeleton
      variant="rectangular"
      width={width}
      height={height}
      animation="wave"
    />
  );

  const errorPlaceholder = (
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
      }}
    >
      <IconButton onClick={handleRetry} disabled={isRetrying}>
        <Refresh />
      </IconButton>
      <Box sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 1 }}>
        Failed to load
      </Box>
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        width,
        height,
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
      className={className}
    >
      {!isInView && (placeholder || defaultPlaceholder)}
      
      {isInView && !hasError && cachedSrc && (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          <img
            ref={imgRef}
            src={cachedSrc}
            alt={alt}
            onLoad={handleLoad}
            onError={handleError}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: isLoaded ? 'block' : 'none',
            }}
          />
        </>
      )}
      
      {hasError && errorPlaceholder}
    </Box>
  );
};

export default LazyImage;