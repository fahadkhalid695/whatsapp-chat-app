import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Dimensions,
  View,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface TouchOptimizedButtonProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'text';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

const { width: screenWidth } = Dimensions.get('window');
const isTablet = screenWidth >= 768;

const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      ...styles.baseButton,
      ...styles[`${size}Button`],
      ...(fullWidth && styles.fullWidth),
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primaryButton };
      case 'secondary':
        return { ...baseStyle, ...styles.secondaryButton };
      case 'outline':
        return { ...baseStyle, ...styles.outlineButton };
      case 'text':
        return { ...baseStyle, ...styles.textButton };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseStyle: TextStyle = {
      ...styles.baseText,
      ...styles[`${size}Text`],
    };

    switch (variant) {
      case 'primary':
        return { ...baseStyle, ...styles.primaryText };
      case 'secondary':
        return { ...baseStyle, ...styles.secondaryText };
      case 'outline':
        return { ...baseStyle, ...styles.outlineText };
      case 'text':
        return { ...baseStyle, ...styles.textButtonText };
      default:
        return baseStyle;
    }
  };

  const getIconSize = (): number => {
    switch (size) {
      case 'small':
        return isTablet ? 18 : 16;
      case 'large':
        return isTablet ? 28 : 24;
      default:
        return isTablet ? 22 : 20;
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <ActivityIndicator
          size={size === 'small' ? 'small' : 'small'}
          color={variant === 'primary' ? '#fff' : '#25D366'}
        />
      );
    }

    const iconComponent = icon && (
      <Icon
        name={icon}
        size={getIconSize()}
        color={variant === 'primary' ? '#fff' : '#25D366'}
        style={title ? (iconPosition === 'left' ? styles.iconLeft : styles.iconRight) : undefined}
      />
    );

    const textComponent = title && (
      <Text style={[getTextStyle(), textStyle, disabled && styles.disabledText]}>
        {title}
      </Text>
    );

    if (iconPosition === 'left') {
      return (
        <View style={styles.contentContainer}>
          {iconComponent}
          {textComponent}
        </View>
      );
    } else {
      return (
        <View style={styles.contentContainer}>
          {textComponent}
          {iconComponent}
        </View>
      );
    }
  };

  return (
    <TouchableOpacity
      style={[
        getButtonStyle(),
        style,
        disabled && styles.disabledButton,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      delayPressIn={50}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {renderContent()}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseButton: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  
  // Size variants
  smallButton: {
    paddingHorizontal: isTablet ? 16 : 12,
    paddingVertical: isTablet ? 8 : 6,
    minHeight: isTablet ? 36 : 32,
  },
  mediumButton: {
    paddingHorizontal: isTablet ? 20 : 16,
    paddingVertical: isTablet ? 12 : 10,
    minHeight: isTablet ? 48 : 44,
  },
  largeButton: {
    paddingHorizontal: isTablet ? 24 : 20,
    paddingVertical: isTablet ? 16 : 14,
    minHeight: isTablet ? 56 : 52,
  },

  // Color variants
  primaryButton: {
    backgroundColor: '#25D366',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  secondaryButton: {
    backgroundColor: '#128C7E',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#25D366',
  },
  textButton: {
    backgroundColor: 'transparent',
  },

  // Text styles
  baseText: {
    fontWeight: '600',
    textAlign: 'center',
  },
  smallText: {
    fontSize: isTablet ? 14 : 12,
  },
  mediumText: {
    fontSize: isTablet ? 16 : 14,
  },
  largeText: {
    fontSize: isTablet ? 18 : 16,
  },
  primaryText: {
    color: '#fff',
  },
  secondaryText: {
    color: '#fff',
  },
  outlineText: {
    color: '#25D366',
  },
  textButtonText: {
    color: '#25D366',
  },

  // Icon styles
  iconLeft: {
    marginRight: isTablet ? 8 : 6,
  },
  iconRight: {
    marginLeft: isTablet ? 8 : 6,
  },

  // Disabled styles
  disabledButton: {
    opacity: 0.5,
    elevation: 0,
    shadowOpacity: 0,
  },
  disabledText: {
    opacity: 0.5,
  },
});

export default TouchOptimizedButton;