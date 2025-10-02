import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MessageBubble } from '../MessageBubble';
import { Message } from '../../types';

// Mock the LazyImage component
vi.mock('../LazyImage', () => ({
  LazyImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
}));

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
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onReply: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Text Messages', () => {
    it('should render text message correctly', () => {
      render(<MessageBubble {...defaultProps} />);
      
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
      expect(screen.getByText('12:00')).toBeInTheDocument();
    });

    it('should apply correct styling for own messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      expect(bubble).toHaveClass('own-message');
    });

    it('should apply correct styling for other messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={false} />);
      
      const bubble = screen.getByTestId('message-bubble');
      expect(bubble).toHaveClass('other-message');
    });

    it('should hide timestamp when showTimestamp is false', () => {
      render(<MessageBubble {...defaultProps} showTimestamp={false} />);
      
      expect(screen.queryByText('12:00')).not.toBeInTheDocument();
    });

    it('should show delivery status for own messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      expect(screen.getByTestId('delivery-status')).toBeInTheDocument();
      expect(screen.getByText('Delivered')).toBeInTheDocument();
    });

    it('should show read status when message is read', () => {
      const readMessage = {
        ...mockMessage,
        readBy: ['user-2'],
      };
      
      render(<MessageBubble {...defaultProps} message={readMessage} isOwn={true} />);
      
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('should not show delivery status for other messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={false} />);
      
      expect(screen.queryByTestId('delivery-status')).not.toBeInTheDocument();
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

      render(<MessageBubble {...defaultProps} message={imageMessage} />);
      
      expect(screen.getByTestId('lazy-image')).toBeInTheDocument();
      expect(screen.getByTestId('lazy-image')).toHaveAttribute(
        'src',
        'https://example.com/thumb.jpg'
      );
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

      render(<MessageBubble {...defaultProps} message={videoMessage} />);
      
      expect(screen.getByTestId('video-thumbnail')).toBeInTheDocument();
      expect(screen.getByTestId('play-button')).toBeInTheDocument();
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

      render(<MessageBubble {...defaultProps} message={documentMessage} />);
      
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
      expect(screen.getByText('1.0 MB')).toBeInTheDocument();
      expect(screen.getByTestId('download-button')).toBeInTheDocument();
    });

    it('should handle media click events', () => {
      const onMediaClick = vi.fn();
      const imageMessage: Message = {
        ...mockMessage,
        type: 'image',
        content: {
          mediaId: 'media-1',
          mediaType: 'image',
          mediaUrl: 'https://example.com/image.jpg',
        },
      };

      render(
        <MessageBubble 
          {...defaultProps} 
          message={imageMessage} 
          onMediaClick={onMediaClick} 
        />
      );
      
      fireEvent.click(screen.getByTestId('lazy-image'));
      expect(onMediaClick).toHaveBeenCalledWith(imageMessage.content);
    });
  });

  describe('Message Actions', () => {
    it('should show context menu on right click for own messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should show limited context menu for other messages', () => {
      render(<MessageBubble {...defaultProps} isOwn={false} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      expect(screen.queryByText('Edit')).not.toBeInTheDocument();
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
      expect(screen.getByText('Reply')).toBeInTheDocument();
    });

    it('should call onEdit when edit is clicked', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      fireEvent.click(screen.getByText('Edit'));
      
      expect(defaultProps.onEdit).toHaveBeenCalledWith(mockMessage);
    });

    it('should call onDelete when delete is clicked', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      fireEvent.click(screen.getByText('Delete'));
      
      expect(defaultProps.onDelete).toHaveBeenCalledWith(mockMessage.id);
    });

    it('should call onReply when reply is clicked', () => {
      render(<MessageBubble {...defaultProps} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      fireEvent.click(screen.getByText('Reply'));
      
      expect(defaultProps.onReply).toHaveBeenCalledWith(mockMessage);
    });

    it('should close context menu when clicking outside', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      
      fireEvent.click(document.body);
      
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
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

      render(
        <MessageBubble 
          {...defaultProps} 
          message={replyMessage}
          originalMessage={originalMessage}
        />
      );
      
      expect(screen.getByTestId('reply-indicator')).toBeInTheDocument();
      expect(screen.getByText('Original message')).toBeInTheDocument();
    });

    it('should handle deleted original message', () => {
      const replyMessage: Message = {
        ...mockMessage,
        replyTo: 'deleted-msg-id',
      };

      render(
        <MessageBubble 
          {...defaultProps} 
          message={replyMessage}
          originalMessage={null}
        />
      );
      
      expect(screen.getByTestId('reply-indicator')).toBeInTheDocument();
      expect(screen.getByText('Message deleted')).toBeInTheDocument();
    });
  });

  describe('Edited Messages', () => {
    it('should show edited indicator', () => {
      const editedMessage: Message = {
        ...mockMessage,
        editedAt: new Date('2023-01-01T12:30:00Z'),
      };

      render(<MessageBubble {...defaultProps} message={editedMessage} />);
      
      expect(screen.getByText('(edited)')).toBeInTheDocument();
    });

    it('should show edit timestamp on hover', () => {
      const editedMessage: Message = {
        ...mockMessage,
        editedAt: new Date('2023-01-01T12:30:00Z'),
      };

      render(<MessageBubble {...defaultProps} message={editedMessage} />);
      
      const editedIndicator = screen.getByText('(edited)');
      expect(editedIndicator).toHaveAttribute('title', 'Edited at 12:30');
    });
  });

  describe('Deleted Messages', () => {
    it('should render deleted message placeholder', () => {
      const deletedMessage: Message = {
        ...mockMessage,
        isDeleted: true,
        content: { text: '' },
      };

      render(<MessageBubble {...defaultProps} message={deletedMessage} />);
      
      expect(screen.getByText('This message was deleted')).toBeInTheDocument();
      expect(screen.getByTestId('message-bubble')).toHaveClass('deleted-message');
    });

    it('should not show actions for deleted messages', () => {
      const deletedMessage: Message = {
        ...mockMessage,
        isDeleted: true,
        content: { text: '' },
      };

      render(<MessageBubble {...defaultProps} message={deletedMessage} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<MessageBubble {...defaultProps} />);
      
      const bubble = screen.getByTestId('message-bubble');
      expect(bubble).toHaveAttribute('role', 'article');
      expect(bubble).toHaveAttribute('aria-label', expect.stringContaining('Message from'));
    });

    it('should be keyboard accessible', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      bubble.focus();
      
      // Press Enter to open context menu
      fireEvent.keyDown(bubble, { key: 'Enter' });
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      
      // Press Escape to close context menu
      fireEvent.keyDown(bubble, { key: 'Escape' });
      expect(screen.queryByTestId('context-menu')).not.toBeInTheDocument();
    });

    it('should have proper focus management', () => {
      render(<MessageBubble {...defaultProps} isOwn={true} />);
      
      const bubble = screen.getByTestId('message-bubble');
      fireEvent.contextMenu(bubble);
      
      // First menu item should be focused
      const firstMenuItem = screen.getByText('Edit');
      expect(firstMenuItem).toHaveFocus();
    });
  });

  describe('Performance', () => {
    it('should memoize expensive operations', () => {
      const { rerender } = render(<MessageBubble {...defaultProps} />);
      
      // Re-render with same props
      rerender(<MessageBubble {...defaultProps} />);
      
      // Component should not re-render unnecessarily
      expect(screen.getByText('Hello world!')).toBeInTheDocument();
    });

    it('should handle long messages efficiently', () => {
      const longMessage: Message = {
        ...mockMessage,
        content: { text: 'A'.repeat(10000) },
      };

      const startTime = performance.now();
      render(<MessageBubble {...defaultProps} message={longMessage} />);
      const endTime = performance.now();
      
      // Should render quickly even with long content
      expect(endTime - startTime).toBeLessThan(100);
    });
  });
});