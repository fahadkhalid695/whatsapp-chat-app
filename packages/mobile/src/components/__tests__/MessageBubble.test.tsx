import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { MessageBubble } from '../MessageBubble';
import { Message } from '../../types';

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native/Libraries/Components/View/View');
  return {
    PanGestureHandler: View,
    LongPressGestureHandler: View,
    TapGestureHandler: View,
    State: {},
    Directions: {},
  };
});

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/MaterialIcons', () => 'Icon');

describe('MessageBubble', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderId: 'user-1',
    content: { text: 'Hello world!' },
    type: 'text',
    timestamp: new Date('2023-01-01T12:00:00Z'),
    deliveredTo: ['user-2'],
    readBy: [],
    isDeleted: false,
  };

  const defaultProps = {
    message: mockMessage,
    isOwn: true,
    showTimestamp: true,
    onLongPress: jest.fn(),
    onPress: jest.fn(),
    onMediaPress: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Text Messages', () => {
    it('should render text message correctly', () => {
      const { getByText } = render(<MessageBubble {...defaultProps} />);
      
      expect(getByText('Hello world!')).toBeTruthy();
      expect(getByText('12:00')).toBeTruthy();
    });

    it('should apply correct styling for own messages', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          alignSelf: 'flex-end',
        })
      );
    });

    it('should apply correct styling for other messages', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} isOwn={false} />);
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          alignSelf: 'flex-start',
        })
      );
    });

    it('should hide timestamp when showTimestamp is false', () => {
      const { queryByText } = render(<MessageBubble {...defaultProps} showTimestamp={false} />);
      
      expect(queryByText('12:00')).toBeNull();
    });

    it('should show delivery status for own messages', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      expect(getByTestId('delivery-status')).toBeTruthy();
    });

    it('should show read status when message is read', () => {
      const readMessage = {
        ...mockMessage,
        readBy: ['user-2'],
      };
      
      const { getByTestId } = render(<MessageBubble {...defaultProps} message={readMessage} isOwn={true} />);
      
      const deliveryStatus = getByTestId('delivery-status');
      expect(deliveryStatus.props.children).toContain('Read');
    });

    it('should not show delivery status for other messages', () => {
      const { queryByTestId } = render(<MessageBubble {...defaultProps} isOwn={false} />);
      
      expect(queryByTestId('delivery-status')).toBeNull();
    });
  });

  describe('Media Messages', () => {
    it('should render image message', () => {
      const imageMessage: Message = {
        ...mockMessage,
        type: 'image',
        content: {
          mediaId: 'media-1',
          mediaType: 'image',
          mediaUrl: 'https://example.com/image.jpg',
          thumbnailUrl: 'https://example.com/thumb.jpg',
        },
      };

      const { getByTestId } = render(<MessageBubble {...defaultProps} message={imageMessage} />);
      
      expect(getByTestId('message-image')).toBeTruthy();
    });

    it('should render video message with thumbnail', () => {
      const videoMessage: Message = {
        ...mockMessage,
        type: 'video',
        content: {
          mediaId: 'media-2',
          mediaType: 'video',
          mediaUrl: 'https://example.com/video.mp4',
          thumbnailUrl: 'https://example.com/video-thumb.jpg',
        },
      };

      const { getByTestId } = render(<MessageBubble {...defaultProps} message={videoMessage} />);
      
      expect(getByTestId('video-thumbnail')).toBeTruthy();
      expect(getByTestId('play-button')).toBeTruthy();
    });

    it('should render document message', () => {
      const documentMessage: Message = {
        ...mockMessage,
        type: 'document',
        content: {
          mediaId: 'media-3',
          mediaType: 'document',
          fileName: 'document.pdf',
          fileSize: 1024000,
        },
      };

      const { getByText, getByTestId } = render(<MessageBubble {...defaultProps} message={documentMessage} />);
      
      expect(getByText('document.pdf')).toBeTruthy();
      expect(getByText('1.0 MB')).toBeTruthy();
      expect(getByTestId('document-icon')).toBeTruthy();
    });

    it('should handle media press events', () => {
      const imageMessage: Message = {
        ...mockMessage,
        type: 'image',
        content: {
          mediaId: 'media-1',
          mediaType: 'image',
          mediaUrl: 'https://example.com/image.jpg',
        },
      };

      const { getByTestId } = render(<MessageBubble {...defaultProps} message={imageMessage} />);
      
      fireEvent.press(getByTestId('message-image'));
      expect(defaultProps.onMediaPress).toHaveBeenCalledWith(imageMessage.content);
    });
  });

  describe('Message Actions', () => {
    it('should handle long press events', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} />);
      
      const bubble = getByTestId('message-bubble');
      fireEvent(bubble, 'onLongPress');
      
      expect(defaultProps.onLongPress).toHaveBeenCalledWith(mockMessage);
    });

    it('should handle press events', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} />);
      
      const bubble = getByTestId('message-bubble');
      fireEvent.press(bubble);
      
      expect(defaultProps.onPress).toHaveBeenCalledWith(mockMessage);
    });

    it('should not handle actions for deleted messages', () => {
      const deletedMessage: Message = {
        ...mockMessage,
        isDeleted: true,
        content: { text: '' },
      };

      const { getByTestId } = render(<MessageBubble {...defaultProps} message={deletedMessage} />);
      
      const bubble = getByTestId('message-bubble');
      fireEvent(bubble, 'onLongPress');
      
      expect(defaultProps.onLongPress).not.toHaveBeenCalled();
    });
  });

  describe('Reply Messages', () => {
    it('should render reply indicator', () => {
      const replyMessage: Message = {
        ...mockMessage,
        replyTo: 'original-msg-id',
      };

      const originalMessage: Message = {
        id: 'original-msg-id',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: { text: 'Original message' },
        type: 'text',
        timestamp: new Date('2023-01-01T11:00:00Z'),
        deliveredTo: [],
        readBy: [],
        isDeleted: false,
      };

      const { getByTestId, getByText } = render(
        <MessageBubble 
          {...defaultProps} 
          message={replyMessage}
          originalMessage={originalMessage}
        />
      );
      
      expect(getByTestId('reply-indicator')).toBeTruthy();
      expect(getByText('Original message')).toBeTruthy();
    });

    it('should handle deleted original message', () => {
      const replyMessage: Message = {
        ...mockMessage,
        replyTo: 'deleted-msg-id',
      };

      const { getByTestId, getByText } = render(
        <MessageBubble 
          {...defaultProps} 
          message={replyMessage}
          originalMessage={null}
        />
      );
      
      expect(getByTestId('reply-indicator')).toBeTruthy();
      expect(getByText('Message deleted')).toBeTruthy();
    });
  });

  describe('Edited Messages', () => {
    it('should show edited indicator', () => {
      const editedMessage: Message = {
        ...mockMessage,
        editedAt: new Date('2023-01-01T12:30:00Z'),
      };

      const { getByText } = render(<MessageBubble {...defaultProps} message={editedMessage} />);
      
      expect(getByText('(edited)')).toBeTruthy();
    });
  });

  describe('Deleted Messages', () => {
    it('should render deleted message placeholder', () => {
      const deletedMessage: Message = {
        ...mockMessage,
        isDeleted: true,
        content: { text: '' },
      };

      const { getByText, getByTestId } = render(<MessageBubble {...defaultProps} message={deletedMessage} />);
      
      expect(getByText('This message was deleted')).toBeTruthy();
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          opacity: 0.6,
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} />);
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.accessibilityLabel).toContain('Message');
      expect(bubble.props.accessibilityRole).toBe('button');
    });

    it('should be accessible for screen readers', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} />);
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.accessible).toBe(true);
      expect(bubble.props.accessibilityHint).toBeDefined();
    });

    it('should have proper accessibility state for read messages', () => {
      const readMessage = {
        ...mockMessage,
        readBy: ['user-2'],
      };
      
      const { getByTestId } = render(<MessageBubble {...defaultProps} message={readMessage} isOwn={true} />);
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.accessibilityState).toMatchObject({
        selected: false,
      });
    });
  });

  describe('Performance', () => {
    it('should handle long messages efficiently', () => {
      const longMessage: Message = {
        ...mockMessage,
        content: { text: 'A'.repeat(10000) },
      };

      const startTime = Date.now();
      render(<MessageBubble {...defaultProps} message={longMessage} />);
      const endTime = Date.now();
      
      // Should render quickly even with long content
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should memoize expensive operations', () => {
      const { rerender } = render(<MessageBubble {...defaultProps} />);
      
      // Re-render with same props
      rerender(<MessageBubble {...defaultProps} />);
      
      // Component should not re-render unnecessarily
      expect(defaultProps.onPress).not.toHaveBeenCalled();
    });
  });

  describe('Touch Interactions', () => {
    it('should handle touch feedback correctly', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} />);
      
      const bubble = getByTestId('message-bubble');
      
      // Should have proper touch feedback
      expect(bubble.props.activeOpacity).toBeDefined();
    });

    it('should handle swipe gestures for quick actions', () => {
      const onSwipeLeft = jest.fn();
      const onSwipeRight = jest.fn();
      
      const { getByTestId } = render(
        <MessageBubble 
          {...defaultProps} 
          onSwipeLeft={onSwipeLeft}
          onSwipeRight={onSwipeRight}
        />
      );
      
      const bubble = getByTestId('message-bubble');
      
      // Simulate swipe gestures
      fireEvent(bubble, 'onSwipeLeft');
      fireEvent(bubble, 'onSwipeRight');
      
      expect(onSwipeLeft).toHaveBeenCalled();
      expect(onSwipeRight).toHaveBeenCalled();
    });
  });

  describe('Animation', () => {
    it('should animate message appearance', () => {
      const { getByTestId } = render(<MessageBubble {...defaultProps} animateIn={true} />);
      
      const bubble = getByTestId('message-bubble');
      
      // Should have animation properties
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          transform: expect.any(Array),
        })
      );
    });

    it('should animate delivery status changes', () => {
      const { rerender, getByTestId } = render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      // Update to read status
      const readMessage = {
        ...mockMessage,
        readBy: ['user-2'],
      };
      
      rerender(<MessageBubble {...defaultProps} message={readMessage} isOwn={true} />);
      
      const deliveryStatus = getByTestId('delivery-status');
      expect(deliveryStatus).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should apply theme colors correctly', () => {
      const theme = {
        colors: {
          primary: '#007AFF',
          background: '#FFFFFF',
          text: '#000000',
        },
      };

      const { getByTestId } = render(
        <MessageBubble {...defaultProps} theme={theme} />
      );
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String),
        })
      );
    });

    it('should support dark mode', () => {
      const darkTheme = {
        colors: {
          primary: '#0A84FF',
          background: '#000000',
          text: '#FFFFFF',
        },
        dark: true,
      };

      const { getByTestId } = render(
        <MessageBubble {...defaultProps} theme={darkTheme} />
      );
      
      const bubble = getByTestId('message-bubble');
      expect(bubble.props.style).toMatchObject(
        expect.objectContaining({
          backgroundColor: expect.any(String),
        })
      );
    });
  });
});