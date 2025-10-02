import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-netinfo/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LazyImage from './LazyImage';

interface NetworkAwareImageProps {
  source: { uri: string };
  lowQualitySource?: { uri: string };
  style?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  onPress?: () => void;
  placeholder?: React.ReactNode;
  autoOptimize?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const NetworkAwareImage: React.FC<NetworkAwareImageProps> = ({
  source,
  lowQualitySource,
  style,
  resizeMode = 'cover',
  onPress,
  placeholder,
  autoOptimize = true,
}) => {
  const netInfo = useNetInfo();
  const [userChoice, setUserChoice] = useState<'auto' | 'high' | 'low'>('auto');
  const [showQualityOptions, setShowQualityOptions] = useState(false);

  const isSlowConnection = useCallback(() => {
    if (!netInfo.isConnected) return true;
    
    // Check connection type
    if (netInfo.type === 'cellular') {
      const effectiveType = (netInfo.details as any)?.effectiveType;
      return effectiveType === 'slow-2g' || effectiveType === '2g';
    }
    
    return false;
  }, [netInfo]);

  const shouldUseHighQuality = useCallback(() => {
    if (userChoice === 'high') return true;
    if (userChoice === 'low') return false;
    
    // Auto mode
    if (!autoOptimize) return true;
    if (!netInfo.isConnected) return false;
    if (isSlowConnection()) return false;
    
    return true;
  }, [userChoice, autoOptimize, netInfo.isConnected, isSlowConnection]);

  const getImageSource = useCallback(() => {
    if (shouldUseHighQuality()) {
      return source;
    }
    return lowQualitySource || source;
  }, [source, lowQualitySource, shouldUseHighQuality]);

  const getNetworkIcon = () => {
    if (!netInfo.isConnected) return 'wifi-off';
    if (isSlowConnection()) return 'signal-wifi-1-bar';
    return 'wifi';
  };

  const getNetworkColor = () => {
    if (!netInfo.isConnected) return '#f44336';
    if (isSlowConnection()) return '#ff9800';
    return '#4caf50';
  };

  const getQualityLabel = () => {
    if (userChoice !== 'auto') return userChoice.toUpperCase();
    return shouldUseHighQuality() ? 'HIGH' : 'LOW';
  };

  const getConnectionLabel = () => {
    if (!netInfo.isConnected) return 'Offline';
    if (isSlowConnection()) return 'Slow';
    return 'Fast';
  };

  const handleQualityPress = () => {
    if (!lowQualitySource) return;
    
    Alert.alert(
      'Image Quality',
      'Choose image quality based on your connection',
      [
        {
          text: 'Auto',
          onPress: () => setUserChoice('auto'),
        },
        {
          text: 'High Quality',
          onPress: () => setUserChoice('high'),
        },
        {
          text: 'Low Quality',
          onPress: () => setUserChoice('low'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  if (!netInfo.isConnected) {
    return (
      <View style={[styles.offlineContainer, style]}>
        <Icon name="wifi-off" size={isTablet ? 48 : 32} color="#999" />
        <Text style={styles.offlineText}>Image unavailable offline</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <LazyImage
        source={getImageSource()}
        style={style}
        resizeMode={resizeMode}
        onPress={onPress}
        placeholder={placeholder}
        cachePolicy="memory"
      />
      
      {/* Network status indicator */}
      <View style={styles.statusContainer}>
        <TouchableOpacity
          style={[styles.statusChip, { backgroundColor: getNetworkColor() }]}
          onPress={handleQualityPress}
          activeOpacity={0.8}
        >
          <Icon 
            name={getNetworkIcon()} 
            size={isTablet ? 16 : 12} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {getConnectionLabel()}
          </Text>
        </TouchableOpacity>
        
        {lowQualitySource && (
          <TouchableOpacity
            style={[
              styles.qualityChip,
              {
                backgroundColor: shouldUseHighQuality() ? '#4caf50' : '#ff9800',
              },
            ]}
            onPress={handleQualityPress}
            activeOpacity={0.8}
          >
            <Text style={styles.statusText}>
              {getQualityLabel()}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  offlineContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    padding: isTablet ? 24 : 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  offlineText: {
    fontSize: isTablet ? 14 : 12,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  statusContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    gap: 4,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: isTablet ? 8 : 6,
    paddingVertical: isTablet ? 4 : 3,
    borderRadius: isTablet ? 12 : 10,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  qualityChip: {
    paddingHorizontal: isTablet ? 8 : 6,
    paddingVertical: isTablet ? 4 : 3,
    borderRadius: isTablet ? 12 : 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    color: '#fff',
    fontSize: isTablet ? 12 : 10,
    fontWeight: '600',
    marginLeft: 4,
  },
});

export default NetworkAwareImage;