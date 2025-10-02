import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  IconButton,
  Collapse,
  Grid,
} from '@mui/material';
import {
  Speed,
  Memory,
  NetworkCheck,
  ExpandMore,
  ExpandLess,
  Warning,
} from '@mui/icons-material';
import usePerformanceMonitor from '../hooks/usePerformanceMonitor';
import useNetworkStatus from '../hooks/useNetworkStatus';
import { imageCache } from '../utils/imageCache';

interface PerformanceMonitorProps {
  enabled?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  enabled = process.env.NODE_ENV === 'development',
  position = 'bottom-right',
}) => {
  const [expanded, setExpanded] = useState(false);
  const [metrics, setMetrics] = useState({
    renderTime: 0,
    fps: 60,
    memoryUsage: 0,
  });
  const [cacheStats, setCacheStats] = useState({
    size: 0,
    count: 0,
    maxSize: 0,
  });

  const { isOnline, isSlowConnection, effectiveType, downlink, rtt } = useNetworkStatus();

  usePerformanceMonitor({
    enabled,
    onMetrics: (newMetrics) => {
      setMetrics({
        renderTime: newMetrics.renderTime,
        fps: newMetrics.fps,
        memoryUsage: newMetrics.memoryUsage || 0,
      });
    },
  });

  useEffect(() => {
    if (enabled) {
      const updateCacheStats = () => {
        setCacheStats(imageCache.getStats());
      };

      updateCacheStats();
      const interval = setInterval(updateCacheStats, 2000);
      return () => clearInterval(interval);
    }
  }, [enabled]);

  const getPositionStyles = () => {
    const baseStyles = {
      position: 'fixed' as const,
      zIndex: 9999,
      maxWidth: expanded ? 400 : 200,
    };

    switch (position) {
      case 'top-left':
        return { ...baseStyles, top: 16, left: 16 };
      case 'top-right':
        return { ...baseStyles, top: 16, right: 16 };
      case 'bottom-left':
        return { ...baseStyles, bottom: 16, left: 16 };
      case 'bottom-right':
      default:
        return { ...baseStyles, bottom: 16, right: 16 };
    }
  };

  const getPerformanceColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return 'success';
    if (value <= thresholds.warning) return 'warning';
    return 'error';
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!enabled) return null;

  return (
    <Card sx={getPositionStyles()}>
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <Speed fontSize="small" />
            <Typography variant="caption" fontWeight="bold">
              Performance
            </Typography>
            {(metrics.fps < 30 || metrics.renderTime > 100 || isSlowConnection) && (
              <Warning color="warning" fontSize="small" />
            )}
          </Box>
          <IconButton
            size="small"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box mt={1}>
            <Grid container spacing={1}>
              {/* FPS */}
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption">FPS:</Typography>
                  <Chip
                    label={`${metrics.fps}`}
                    size="small"
                    color={getPerformanceColor(60 - metrics.fps, { good: 10, warning: 30 })}
                  />
                </Box>
              </Grid>

              {/* Render Time */}
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="caption">Render:</Typography>
                  <Chip
                    label={`${metrics.renderTime.toFixed(1)}ms`}
                    size="small"
                    color={getPerformanceColor(metrics.renderTime, { good: 16, warning: 50 })}
                  />
                </Box>
              </Grid>

              {/* Memory Usage */}
              {metrics.memoryUsage > 0 && (
                <Grid item xs={12}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Memory fontSize="small" />
                    <Typography variant="caption">Memory:</Typography>
                    <Chip
                      label={`${metrics.memoryUsage.toFixed(1)}MB`}
                      size="small"
                      color={getPerformanceColor(metrics.memoryUsage, { good: 50, warning: 100 })}
                    />
                  </Box>
                </Grid>
              )}

              {/* Network Status */}
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={1}>
                  <NetworkCheck fontSize="small" />
                  <Typography variant="caption">Network:</Typography>
                  <Chip
                    label={isOnline ? effectiveType : 'Offline'}
                    size="small"
                    color={!isOnline ? 'error' : isSlowConnection ? 'warning' : 'success'}
                  />
                </Box>
              </Grid>

              {/* Network Details */}
              {isOnline && (
                <>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      Speed: {downlink}Mbps
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="caption" color="text.secondary">
                      RTT: {rtt}ms
                    </Typography>
                  </Grid>
                </>
              )}

              {/* Image Cache Stats */}
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  Cache: {cacheStats.count} images ({formatBytes(cacheStats.size)})
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={(cacheStats.size / cacheStats.maxSize) * 100}
                  sx={{ mt: 0.5, height: 4 }}
                  color={cacheStats.size / cacheStats.maxSize > 0.8 ? 'warning' : 'primary'}
                />
              </Grid>
            </Grid>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;