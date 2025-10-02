import { useEffect, useRef, useCallback } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  fps: number;
}

interface PerformanceMonitorOptions {
  enabled?: boolean;
  sampleRate?: number;
  onMetrics?: (metrics: PerformanceMetrics) => void;
}

const usePerformanceMonitor = (options: PerformanceMonitorOptions = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    sampleRate = 1000, // Sample every second
    onMetrics,
  } = options;

  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const renderStartTime = useRef(0);
  const animationFrameId = useRef<number>();

  const measureFPS = useCallback(() => {
    if (!enabled) return;

    frameCount.current++;
    const currentTime = performance.now();
    
    if (currentTime - lastTime.current >= sampleRate) {
      const fps = Math.round((frameCount.current * 1000) / (currentTime - lastTime.current));
      
      const metrics: PerformanceMetrics = {
        renderTime: currentTime - renderStartTime.current,
        fps,
      };

      // Add memory usage if available
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        metrics.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      }

      onMetrics?.(metrics);
      
      // Log performance warnings
      if (fps < 30) {
        console.warn(`Low FPS detected: ${fps}fps`);
      }
      
      if (metrics.memoryUsage && metrics.memoryUsage > 100) {
        console.warn(`High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
      }

      frameCount.current = 0;
      lastTime.current = currentTime;
    }

    animationFrameId.current = requestAnimationFrame(measureFPS);
  }, [enabled, sampleRate, onMetrics]);

  const startRenderMeasurement = useCallback(() => {
    if (enabled) {
      renderStartTime.current = performance.now();
    }
  }, [enabled]);

  const endRenderMeasurement = useCallback(() => {
    if (enabled) {
      const renderTime = performance.now() - renderStartTime.current;
      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`Slow render detected: ${renderTime.toFixed(2)}ms`);
      }
    }
  }, [enabled]);

  useEffect(() => {
    if (enabled) {
      animationFrameId.current = requestAnimationFrame(measureFPS);
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [enabled, measureFPS]);

  return {
    startRenderMeasurement,
    endRenderMeasurement,
  };
};

export default usePerformanceMonitor;