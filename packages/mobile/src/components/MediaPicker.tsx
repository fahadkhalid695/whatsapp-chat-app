import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import {
  launchImageLibrary,
  launchCamera,
  ImagePickerResponse,
  MediaType,
} from 'react-native-image-picker';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface MediaPickerProps {
  visible: boolean;
  onClose: () => void;
  onMediaSelected: (uri: string, type: 'image' | 'video', fileName?: string) => void;
}

const MediaPicker: React.FC<MediaPickerProps> = ({
  visible,
  onClose,
  onMediaSelected,
}) => {
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const permission = Platform.OS === 'ios' 
        ? PERMISSIONS.IOS.CAMERA 
        : PERMISSIONS.ANDROID.CAMERA;
      
      const result = await request(permission);
      return result === RESULTS.GRANTED;
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  };

  const handleMediaResponse = (response: ImagePickerResponse, type: 'image' | 'video') => {
    if (response.didCancel || response.errorMessage) {
      return;
    }

    if (response.assets && response.assets[0]) {
      const asset = response.assets[0];
      if (asset.uri) {
        onMediaSelected(asset.uri, type, asset.fileName);
        onClose();
      }
    }
  };

  const openCamera = async (mediaType: MediaType = 'photo') => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) {
      Alert.alert(
        'Camera Permission',
        'Camera permission is required to take photos and videos.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Settings', onPress: () => {/* Open settings */} },
        ]
      );
      return;
    }

    launchCamera(
      {
        mediaType,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        videoQuality: 'medium',
        durationLimit: 60, // 60 seconds max for video
      },
      (response) => handleMediaResponse(response, mediaType === 'photo' ? 'image' : 'video')
    );
  };

  const openImageLibrary = (mediaType: MediaType = 'photo') => {
    launchImageLibrary(
      {
        mediaType,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        videoQuality: 'medium',
      },
      (response) => handleMediaResponse(response, mediaType === 'photo' ? 'image' : 'video')
    );
  };

  const options = [
    {
      title: 'Take Photo',
      icon: 'camera-alt',
      onPress: () => openCamera('photo'),
    },
    {
      title: 'Take Video',
      icon: 'videocam',
      onPress: () => openCamera('video'),
    },
    {
      title: 'Choose Photo',
      icon: 'photo-library',
      onPress: () => openImageLibrary('photo'),
    },
    {
      title: 'Choose Video',
      icon: 'video-library',
      onPress: () => openImageLibrary('video'),
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Media</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.option}
                onPress={option.onPress}
              >
                <Icon name={option.icon} size={32} color="#25D366" />
                <Text style={styles.optionText}>{option.title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area padding
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  closeButton: {
    padding: 4,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  option: {
    width: '50%',
    alignItems: 'center',
    paddingVertical: 20,
  },
  optionText: {
    fontSize: 14,
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  cancelButton: {
    marginHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});

export default MediaPicker;