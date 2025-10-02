// Performance optimization utilities for web

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

export const requestIdleCallback = (callback: () => void, timeout = 5000) => {
  if ('requestIdleCallback' in window) {
    return window.requestIdleCallback(callback, { timeout });
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    return setTimeout(callback, 1);
  }
};

export const cancelIdleCallback = (id: number) => {
  if ('cancelIdleCallback' in window) {
    window.cancelIdleCallback(id);
  } else {
    clearTimeout(id);
  }
};

export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
};

export const preloadImages = async (urls: string[], maxConcurrent = 3): Promise<void> => {
  const chunks = [];
  for (let i = 0; i < urls.length; i += maxConcurrent) {
    chunks.push(urls.slice(i, i + maxConcurrent));
  }

  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(preloadImage));
  }
};

export const measurePerformance = (name: string, fn: () => void) => {
  if ('performance' in window && 'mark' in performance) {
    performance.mark(`${name}-start`);
    fn();
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name} took ${measure.duration.toFixed(2)}ms`);
    
    // Clean up
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  } else {
    fn();
  }
};

export const optimizeForSlowConnection = () => {
  const connection = (navigator as any).connection;
  if (!connection) return false;
  
  return (
    connection.effectiveType === 'slow-2g' ||
    connection.effectiveType === '2g' ||
    connection.downlink < 1.5
  );
};

export const getOptimalImageQuality = (): 'low' | 'medium' | 'high' => {
  if (optimizeForSlowConnection()) return 'low';
  
  const connection = (navigator as any).connection;
  if (connection && connection.effectiveType === '3g') return 'medium';
  
  return 'high';
};

export const createIntersectionObserver = (
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) => {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options,
  };

  return new IntersectionObserver(callback, defaultOptions);
};

export const createResizeObserver = (callback: ResizeObserverCallback) => {
  if ('ResizeObserver' in window) {
    return new ResizeObserver(callback);
  }
  
  // Fallback for browsers without ResizeObserver
  const fallbackCallback = () => {
    callback([], {} as ResizeObserver);
  };
  
  (window as any).addEventListener('resize', fallbackCallback);
  
  return {
    observe: () => {},
    unobserve: () => {},
    disconnect: () => {
      (window as any).removeEventListener('resize', fallbackCallback);
    },
  };
};