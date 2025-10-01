import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  Dimensions,
  StatusBar,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Message } from '../types';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  message: Message;
}

interface MediaGalleryProps {
  visible: boolean;
  mediaItems: MediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

const MediaGallery: React.FC<MediaGalleryProps> = ({
  visible,
  mediaItems,
  initialIndex = 0,
  onClose,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showControls, setShowControls] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  React.useEffect(() => {
    if (visible && initialIndex !== currentIndex) {
      setCurrentIndex(initialIndex);
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: initialIndex,
          animated: false,
        });
      }, 100);
    }
  }, [visible, initialIndex]);

  const hideControlsAfterDelay = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const toggleControls = () => {
    setShowControls(!showControls);
    if (!showControls) {
      hideControlsAfterDelay();
    }
  };

  const handleScroll = (event: any) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const viewSize = event.nativeEvent.layoutMeasurement;
    const pageNum = Math.floor(contentOffset.x / viewSize.width);
    setCurrentIndex(pageNum);
  };

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  const renderMediaItem = ({ item, index }: { item: MediaItem; index: number }) => {
    return (
      <View style={styles.mediaContainer}>
        <TouchableOpacity
          style={styles.mediaWrapper}
          activeOpacity={1}
          onPress={toggleControls}
        >
          {item.type === 'image' ? (
            <Image
              source={{ uri: item.uri }}
              style={styles.media}
              resizeMode="contain"
            />
          ) : (
            <Video
              source={{ uri: item.uri }}
              style={styles.media}
              controls={showControls}
              resizeMode="contain"
              paused={index !== currentIndex}
              onError={(error) => {
                console.error('Video playback error:', error);
                Alert.alert('Error', 'Failed to play video');
              }}
            />
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const currentItem = mediaItems[currentIndex];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Header */}
        {showControls && (
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle}>
                {currentItem?.message.senderId === 'currentUser' ? 'You' : 'Contact Name'}
              </Text>
              <Text style={styles.headerSubtitle}>
                {currentItem ? formatDate(currentItem.message.timestamp) : ''}
              </Text>
            </View>
            <View style={styles.headerActions}>
              <Text style={styles.counter}>
                {currentIndex + 1} of {mediaItems.length}
              </Text>
            </View>
          </View>
        )}

        {/* Media Gallery */}
        <FlatList
          ref={flatListRef}
          data={mediaItems}
          renderItem={renderMediaItem}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialScrollIndex={initialIndex}
          getItemLayout={(data, index) => ({
            length: screenWidth,
            offset: screenWidth * index,
            index,
          })}
        />

        {/* Bottom Controls */}
        {showControls && (
          <View style={styles.bottomControls}>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="share" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="download" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <Icon name="delete" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 44, // Status bar height
    paddingBottom: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  closeButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  headerSubtitle: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 2,
  },
  headerActions: {
    alignItems: 'flex-end',
  },
  counter: {
    color: '#fff',
    fontSize: 14,
  },
  mediaContainer: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaWrapper: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  media: {
    width: screenWidth,
    height: screenHeight,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 34, // Safe area bottom
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1,
  },
  actionButton: {
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});

export default MediaGallery;