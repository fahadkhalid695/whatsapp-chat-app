import { useEffect, useRef, useCallback, useState } from 'react';
import { InteractionManager, Dimensions } from 'react-native';

interface PerformanceMetrics {
  renderTime: number;
  memoryWarning: boolean;
  isLowEndDevice: boolean;
}

interface PerformanceOptimizationOptions {
  enabled?: boolean;
  onMetrics?: (metrics: PerformanceMetrics) => void;
  onMemoryWarning?: () => void;
}

const usePerformanceOptimization = (options: PerformanceOptimizationOptions = {}) => {
  const {
    enabled = true,
    onMetrics,
    onMemoryWarning,
  } = options;

  const renderStartTime = useRef(0);
  const [isLowEndDevice, setIsLowEndDevice] = useState(false);
  const [memoryWarning, setMemoryWarning] = useState(false);

  // Detect low-end device based on screen dimensions and pixel density
  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    const screenSize = width * height;
    const isLowEnd = screenSize < 1000000; // Less than ~1MP screen
    setIsLowEndDevice(isLowEnd);
  }, []);

  const startRenderMeasurement = useCallback(() => {
    if (enabled) {
      renderStartTime.current = Date.now();
    }
  }, [enabled]);

  const endRenderMeasurement = useCallback(() => {
    if (enabled) {
      const renderTime = Date.now() - renderStartTime.current;
      
      const metrics: PerformanceMetrics = {
        renderTime,
        memoryWarning,
        isLowEndDevice,
      };

      onMetrics?.(metrics);
      
      // Log performance warnings
      if (renderTime > 100) { // More than 100ms render time
        console.warn(`Slow render detected: ${renderTime}ms`);
      }
    }
  }, [enabled, memoryWarning, isLowEndDevice, onMetrics]);

  const runAfterInteractions = useCallback((callback: () => void) => {
    InteractionManager.runAfterInteractions(callback);
  }, []);

  const optimizeForLowEndDevice = useCallback(() => {
    return {
      shouldReduceAnimations: isLowEndDevice,
      shouldLimitConcurrentOperations: isLowEndDevice || memoryWarning,
      maxConcurrentImages: isLowEndDevice ? 3 : 10,
      shouldUseNativeDriver: !isLowEndDevice,
      shouldPreloadImages: !isLowEndDevice && !memoryWarning,
    };
  }, [isLowEndDevice, memoryWarning]);

  // Memory warning simulation (in a real app, you'd listen to actual memory warnings)
  useEffect(() => {
    const checkMemory = () => {
      // This is a simplified check - in a real app you'd use native modules
      // to get actual memory usage
      const shouldWarn = Math.random() < 0.01; // 1% chance for demo
      if (shouldWarn && !memoryWarning) {
        setMemoryWarning(true);
        onMemoryWarning?.();
        
        // Reset after 30 seconds
        setTimeout(() => setMemoryWarning(false), 30000);
      }
    };

    if (enabled) {
      const interval = setInterval(checkMemory, 5000);
      return () => clearInterval(interval);
    }
  }, [enabled, memoryWarning, onMemoryWarning]);

  return {
    startRenderMeasurement,
    endRenderMeasurement,
    runAfterInteractions,
    optimizeForLowEndDevice,
    isLowEndDevice,
    memoryWarning,
  };
};

export default usePerformanceOptimization;