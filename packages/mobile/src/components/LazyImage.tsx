import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  TouchableOpacity,
  Text,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface LazyImageProps {
  source: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  placeholder?: React.ReactNode;
  errorComponent?: React.ReactNode;
  threshold?: number;
  cachePolicy?: 'memory' | 'disk' | 'reload';
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const LazyImage: React.FC<LazyImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  onPress,
  placeholder,
  errorComponent,
  threshold = 100,
  cachePolicy = 'memory',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const viewRef = useRef<View>(null);

  // Simple visibility detection (in a real app, you'd use Intersection Observer equivalent)
  useEffect(() => {
    // For now, assume all images are visible
    // In a production app, you'd implement proper viewport detection
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetry = () => {
    setIsLoading(true);
    setHasError(false);
    // Force reload by adding timestamp
    const newSource = {
      uri: `${source.uri}${source.uri.includes('?') ? '&' : '?'}retry=${Date.now()}`,
    };
    // This would trigger a re-render with new source
  };

  const defaultPlaceholder = (
    <View style={[styles.placeholder, style]}>
      <ActivityIndicator 
        size={isTablet ? 'large' : 'small'} 
        color="#25D366" 
      />
    </View>
  );

  const defaultErrorComponent = (
    <View style={[styles.errorContainer, style]}>
      <Icon 
        name="broken-image" 
        size={isTablet ? 32 : 24} 
        color="#999" 
      />
      <Text style={styles.errorText}>Failed to load</Text>
      <TouchableOpacity 
        style={styles.retryButton} 
        onPress={handleRetry}
      >
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isVisible) {
    return placeholder || defaultPlaceholder;
  }

  if (hasError) {
    return errorComponent || defaultErrorComponent;
  }

  const imageComponent = (
    <View style={style} ref={viewRef}>
      {isLoading && (placeholder || defaultPlaceholder)}
      <Image
        source={source}
        style={[
          style,
          isLoading && styles.hiddenImage,
        ]}
        resizeMode={resizeMode}
        onLoad={handleLoad}
        onError={handleError}
        // Add cache policy for better performance
        cache={cachePolicy}
      />
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity 
        onPress={onPress}
        activeOpacity={0.8}
        delayPressIn={50}
      >
        {imageComponent}
      </TouchableOpacity>
    );
  }

  return imageComponent;
};

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    minHeight: isTablet ? 120 : 80,
  },
  hiddenImage: {
    position: 'absolute',
    opacity: 0,
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: isTablet ? 20 : 16,
    minHeight: isTablet ? 120 : 80,
  },
  errorText: {
    fontSize: isTablet ? 14 : 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 8,
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 8 : 6,
    backgroundColor: '#25D366',
    borderRadius: 4,
    minHeight: isTablet ? 44 : 36, // Touch-friendly minimum size
    minWidth: isTablet ? 80 : 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  retryText: {
    color: '#fff',
    fontSize: isTablet ? 14 : 12,
    fontWeight: '500',
  },
});

export default LazyImage;