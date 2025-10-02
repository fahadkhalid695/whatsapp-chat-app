import { InteractionManager, Dimensions } from 'react-native';

// Performance optimization utilities for React Native

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export const runAfterInteractions = (callback: () => void): Promise<void> => {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      callback();
      resolve();
    });
  });
};

export const isLowEndDevice = (): boolean => {
  const { width, height } = Dimensions.get('window');
  const screenSize = width * height;
  
  // Consider devices with less than 1MP screen as low-end
  return screenSize < 1000000;
};

export const isTabletDevice = (): boolean => {
  const { width } = Dimensions.get('window');
  return width >= 768;
};

export const getOptimalBatchSize = (): number => {
  if (isLowEndDevice()) return 5;
  if (isTabletDevice()) return 15;
  return 10;
};

export const getOptimalWindowSize = (): number => {
  if (isLowEndDevice()) return 3;
  if (isTabletDevice()) return 8;
  return 5;
};

export const measurePerformance = (name: string, fn: () => void) => {
  const start = Date.now();
  fn();
  const end = Date.now();
  console.log(`${name} took ${end - start}ms`);
};

export const batchUpdates = <T>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<void>
): Promise<void> => {
  return new Promise(async (resolve) => {
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      await processor(batch);
      
      // Allow other operations to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    resolve();
  });
};

export const createOptimizedFlatListProps = () => {
  const isLowEnd = isLowEndDevice();
  const isTablet = isTabletDevice();
  
  return {
    initialNumToRender: isTablet ? 15 : isLowEnd ? 5 : 10,
    maxToRenderPerBatch: isTablet ? 10 : isLowEnd ? 3 : 5,
    windowSize: isTablet ? 10 : isLowEnd ? 3 : 5,
    removeClippedSubviews: true,
    updateCellsBatchingPeriod: isLowEnd ? 100 : 50,
    getItemLayout: (data: any, index: number) => ({
      length: isTablet ? 100 : 80,
      offset: (isTablet ? 100 : 80) * index,
      index,
    }),
  };
};

export const optimizeImageProps = () => {
  const isLowEnd = isLowEndDevice();
  
  return {
    resizeMode: 'cover' as const,
    cache: isLowEnd ? 'memory' : 'disk',
    priority: isLowEnd ? 'low' : 'normal',
    fadeDuration: isLowEnd ? 0 : 300,
  };
};

export const shouldUseNativeDriver = (): boolean => {
  // Use native driver for better performance, but not on low-end devices
  // where it might cause issues
  return !isLowEndDevice();
};

export const getOptimalAnimationConfig = () => {
  const isLowEnd = isLowEndDevice();
  
  return {
    useNativeDriver: shouldUseNativeDriver(),
    duration: isLowEnd ? 150 : 300,
    tension: isLowEnd ? 100 : 40,
    friction: isLowEnd ? 8 : 7,
  };
};