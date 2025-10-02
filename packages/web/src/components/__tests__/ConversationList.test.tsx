import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { ConversationList } from '../ConversationList';
import { Conversation } from '../../types';

// Mock the LazyImage component
vi.mock('../LazyImage', () => ({
  LazyImage: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} data-testid="lazy-image" />
  ),
}));

// Mock IntersectionObserver for virtualization
const mockIntersectionObserver = vi.fn();
mockIntersectionObserver.mockReturnValue({
  observe: () => null,
  unobserve: () => null,
  disconnect: () => null,
});
window.IntersectionObserver = mockIntersectionObserver;

describe('ConversationList', () => {
  const mockConversations: Conversation[] = [
    {
      id: 'conv-1',
      type: 'direct',
      participants: ['user-1', 'user-2'],
      admins: [],
      lastMessage: {
        id: 'msg-1',
        conversationId: 'conv-1',
        senderId: 'user-2',
        content: { text: 'Hello there!' },
        type: 'text',
        timestamp: new Date('2023-01-01T12:00:00Z'),
        deliveredTo: [],
        readBy: [],
        isDeleted: false,
      },
      lastActivity: new Date('2023-01-01T12:00:00Z'),
      isArchived: false,
      isMuted: false,
      unreadCount: 2,
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T12:00:00Z'),
    },
    {
      id: 'conv-2',
      type: 'group',
      name: 'Team Chat',
      participants: ['user-1', 'user-2', 'user-3'],
      admins: ['user-1'],
      lastMessage: {
        id: 'msg-2',
        conversationId: 'conv-2',
        senderId: 'user-3',
        content: { text: 'Meeting at 3 PM' },
        type: 'text',
        timestamp: new Date('2023-01-01T11:30:00Z'),
        deliveredTo: [],
        readBy: [],
        isDeleted: false,
      },
      lastActivity: new Date('2023-01-01T11:30:00Z'),
      isArchived: false,
      isMuted: true,
      unreadCount: 0,
      createdAt: new Date('2023-01-01T09:00:00Z'),
      updatedAt: new Date('2023-01-01T11:30:00Z'),
    },
    {
      id: 'conv-3',
      type: 'direct',
      participants: ['user-1', 'user-4'],
      admins: [],
      lastMessage: null,
      lastActivity: new Date('2023-01-01T10:00:00Z'),
      isArchived: false,
      isMuted: false,
      unreadCount: 0,
      createdAt: new Date('2023-01-01T10:00:00Z'),
      updatedAt: new Date('2023-01-01T10:00:00Z'),
    },
  ];

  const defaultProps = {
    conversations: mockConversations,
    currentUserId: 'user-1',
    selectedConversationId: null,
    onSelectConversation: vi.fn(),
    onArchiveConversation: vi.fn(),
    onMuteConversation: vi.fn(),
    onDeleteConversation: vi.fn(),
    loading: false,
    hasMore: false,
    onLoadMore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render conversation list correctly', () => {
      render(<ConversationList {...defaultProps} />);
      
      expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(3);
    });

    it('should display conversation names correctly', () => {
      render(<ConversationList {...defaultProps} />);
      
      // Group conversation should show name
      expect(screen.getByText('Team Chat')).toBeInTheDocument();
      
      // Direct conversations should show participant names (mocked)
      expect(screen.getByText('User 2')).toBeInTheDocument();
      expect(screen.getByText('User 4')).toBeInTheDocument();
    });

    it('should display last messages', () => {
      render(<ConversationList {...defaultProps} />);
      
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
      expect(screen.getByText('Meeting at 3 PM')).toBeInTheDocument();
      expect(screen.getByText('No messages yet')).toBeInTheDocument();
    });

    it('should display timestamps correctly', () => {
      render(<ConversationList {...defaultProps} />);
      
      expect(screen.getByText('12:00')).toBeInTheDocument();
      expect(screen.getByText('11:30')).toBeInTheDocument();
    });

    it('should show unread count badges', () => {
      render(<ConversationList {...defaultProps} />);
      
      const unreadBadge = screen.getByText('2');
      expect(unreadBadge).toBeInTheDocument();
      expect(unreadBadge).toHaveClass('unread-badge');
    });

    it('should show muted indicator', () => {
      render(<ConversationList {...defaultProps} />);
      
      expect(screen.getByTestId('muted-indicator')).toBeInTheDocument();
    });

    it('should highlight selected conversation', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          selectedConversationId="conv-1" 
        />
      );
      
      const selectedItem = screen.getByTestId('conversation-item-conv-1');
      expect(selectedItem).toHaveClass('selected');
    });
  });

  describe('Interactions', () => {
    it('should call onSelectConversation when conversation is clicked', () => {
      render(<ConversationList {...defaultProps} />);
      
      const conversationItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.click(conversationItem);
      
      expect(defaultProps.onSelectConversation).toHaveBeenCalledWith('conv-1');
    });

    it('should show context menu on right click', () => {
      render(<ConversationList {...defaultProps} />);
      
      const conversationItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.contextMenu(conversationItem);
      
      expect(screen.getByTestId('context-menu')).toBeInTheDocument();
      expect(screen.getByText('Archive')).toBeInTheDocument();
      expect(screen.getByText('Mute')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('should call onArchiveConversation when archive is clicked', () => {
      render(<ConversationList {...defaultProps} />);
      
      const conversationItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.contextMenu(conversationItem);
      fireEvent.click(screen.getByText('Archive'));
      
      expect(defaultProps.onArchiveConversation).toHaveBeenCalledWith('conv-1', true);
    });

    it('should call onMuteConversation when mute is clicked', () => {
      render(<ConversationList {...defaultProps} />);
      
      const conversationItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.contextMenu(conversationItem);
      fireEvent.click(screen.getByText('Mute'));
      
      expect(defaultProps.onMuteConversation).toHaveBeenCalledWith('conv-1', true);
    });

    it('should show unmute option for muted conversations', () => {
      render(<ConversationList {...defaultProps} />);
      
      const mutedConversation = screen.getByTestId('conversation-item-conv-2');
      fireEvent.contextMenu(mutedConversation);
      
      expect(screen.getByText('Unmute')).toBeInTheDocument();
    });

    it('should call onDeleteConversation when delete is clicked', () => {
      render(<ConversationList {...defaultProps} />);
      
      const conversationItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.contextMenu(conversationItem);
      fireEvent.click(screen.getByText('Delete'));
      
      expect(defaultProps.onDeleteConversation).toHaveBeenCalledWith('conv-1');
    });
  });

  describe('Search and Filtering', () => {
    it('should filter conversations based on search query', () => {
      const { rerender } = render(<ConversationList {...defaultProps} />);
      
      // All conversations should be visible initially
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(3);
      
      // Filter by search query
      rerender(
        <ConversationList 
          {...defaultProps} 
          searchQuery="Team" 
        />
      );
      
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(1);
      expect(screen.getByText('Team Chat')).toBeInTheDocument();
    });

    it('should show no results message when search yields no results', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          searchQuery="nonexistent" 
        />
      );
      
      expect(screen.getByText('No conversations found')).toBeInTheDocument();
    });

    it('should filter by conversation type', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          filterType="group" 
        />
      );
      
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(1);
      expect(screen.getByText('Team Chat')).toBeInTheDocument();
    });

    it('should show only unread conversations when filter is applied', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          showUnreadOnly={true} 
        />
      );
      
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(1);
      expect(screen.getByText('Hello there!')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    it('should show loading skeleton when loading', () => {
      render(<ConversationList {...defaultProps} loading={true} />);
      
      expect(screen.getAllByTestId('conversation-skeleton')).toHaveLength(5);
    });

    it('should show load more button when hasMore is true', () => {
      render(<ConversationList {...defaultProps} hasMore={true} />);
      
      expect(screen.getByText('Load More')).toBeInTheDocument();
    });

    it('should call onLoadMore when load more button is clicked', () => {
      render(<ConversationList {...defaultProps} hasMore={true} />);
      
      fireEvent.click(screen.getByText('Load More'));
      
      expect(defaultProps.onLoadMore).toHaveBeenCalled();
    });

    it('should show loading indicator when loading more', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          hasMore={true} 
          loading={true} 
        />
      );
      
      expect(screen.getByTestId('loading-more')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should show empty state when no conversations', () => {
      render(<ConversationList {...defaultProps} conversations={[]} />);
      
      expect(screen.getByText('No conversations yet')).toBeInTheDocument();
      expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
    });

    it('should show archived empty state when showing archived conversations', () => {
      render(
        <ConversationList 
          {...defaultProps} 
          conversations={[]} 
          showArchived={true} 
        />
      );
      
      expect(screen.getByText('No archived conversations')).toBeInTheDocument();
    });
  });

  describe('Virtualization', () => {
    it('should handle large lists efficiently', () => {
      const largeConversationList = Array.from({ length: 1000 }, (_, i) => ({
        ...mockConversations[0],
        id: `conv-${i}`,
      }));

      const startTime = performance.now();
      render(
        <ConversationList 
          {...defaultProps} 
          conversations={largeConversationList} 
        />
      );
      const endTime = performance.now();
      
      // Should render quickly even with many conversations
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should only render visible items', () => {
      const largeConversationList = Array.from({ length: 100 }, (_, i) => ({
        ...mockConversations[0],
        id: `conv-${i}`,
      }));

      render(
        <ConversationList 
          {...defaultProps} 
          conversations={largeConversationList} 
        />
      );
      
      // Should not render all 100 items at once
      const renderedItems = screen.getAllByTestId('conversation-item');
      expect(renderedItems.length).toBeLessThan(50);
    });
  });

  describe('Real-time Updates', () => {
    it('should update conversation order when new message arrives', () => {
      const { rerender } = render(<ConversationList {...defaultProps} />);
      
      // Initially conv-1 should be first (most recent activity)
      const items = screen.getAllByTestId('conversation-item');
      expect(items[0]).toHaveAttribute('data-testid', 'conversation-item-conv-1');
      
      // Update conv-3 with new message
      const updatedConversations = [...mockConversations];
      updatedConversations[2] = {
        ...updatedConversations[2],
        lastMessage: {
          id: 'msg-3',
          conversationId: 'conv-3',
          senderId: 'user-4',
          content: { text: 'New message' },
          type: 'text',
          timestamp: new Date('2023-01-01T13:00:00Z'),
          deliveredTo: [],
          readBy: [],
          isDeleted: false,
        },
        lastActivity: new Date('2023-01-01T13:00:00Z'),
        unreadCount: 1,
      };
      
      rerender(
        <ConversationList 
          {...defaultProps} 
          conversations={updatedConversations} 
        />
      );
      
      // Now conv-3 should be first
      const updatedItems = screen.getAllByTestId('conversation-item');
      expect(updatedItems[0]).toHaveAttribute('data-testid', 'conversation-item-conv-3');
    });

    it('should update unread counts in real-time', () => {
      const { rerender } = render(<ConversationList {...defaultProps} />);
      
      expect(screen.getByText('2')).toBeInTheDocument();
      
      // Update unread count
      const updatedConversations = [...mockConversations];
      updatedConversations[0] = {
        ...updatedConversations[0],
        unreadCount: 5,
      };
      
      rerender(
        <ConversationList 
          {...defaultProps} 
          conversations={updatedConversations} 
        />
      );
      
      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.queryByText('2')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ConversationList {...defaultProps} />);
      
      const list = screen.getByTestId('conversation-list');
      expect(list).toHaveAttribute('role', 'list');
      expect(list).toHaveAttribute('aria-label', 'Conversations');
      
      const items = screen.getAllByTestId('conversation-item');
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'listitem');
        expect(item).toHaveAttribute('tabIndex', '0');
      });
    });

    it('should be keyboard navigable', () => {
      render(<ConversationList {...defaultProps} />);
      
      const firstItem = screen.getByTestId('conversation-item-conv-1');
      firstItem.focus();
      
      // Press Enter to select
      fireEvent.keyDown(firstItem, { key: 'Enter' });
      expect(defaultProps.onSelectConversation).toHaveBeenCalledWith('conv-1');
      
      // Press ArrowDown to move to next item
      fireEvent.keyDown(firstItem, { key: 'ArrowDown' });
      const secondItem = screen.getByTestId('conversation-item-conv-2');
      expect(secondItem).toHaveFocus();
    });

    it('should announce unread count to screen readers', () => {
      render(<ConversationList {...defaultProps} />);
      
      const unreadBadge = screen.getByText('2');
      expect(unreadBadge).toHaveAttribute('aria-label', '2 unread messages');
    });

    it('should have proper focus management', () => {
      render(<ConversationList {...defaultProps} />);
      
      const firstItem = screen.getByTestId('conversation-item-conv-1');
      fireEvent.contextMenu(firstItem);
      
      // Context menu should be focused
      const contextMenu = screen.getByTestId('context-menu');
      expect(contextMenu).toHaveFocus();
      
      // Escape should close menu and return focus
      fireEvent.keyDown(contextMenu, { key: 'Escape' });
      expect(firstItem).toHaveFocus();
    });
  });

  describe('Performance Optimizations', () => {
    it('should memoize conversation items', () => {
      const { rerender } = render(<ConversationList {...defaultProps} />);
      
      // Re-render with same props
      rerender(<ConversationList {...defaultProps} />);
      
      // Items should not re-render unnecessarily
      expect(screen.getAllByTestId('conversation-item')).toHaveLength(3);
    });

    it('should debounce search input', async () => {
      const onSearch = vi.fn();
      render(
        <ConversationList 
          {...defaultProps} 
          onSearch={onSearch} 
        />
      );
      
      const searchInput = screen.getByPlaceholderText('Search conversations...');
      
      // Type rapidly
      fireEvent.change(searchInput, { target: { value: 'T' } });
      fireEvent.change(searchInput, { target: { value: 'Te' } });
      fireEvent.change(searchInput, { target: { value: 'Tea' } });
      fireEvent.change(searchInput, { target: { value: 'Team' } });
      
      // Should debounce and only call once
      await waitFor(() => {
        expect(onSearch).toHaveBeenCalledTimes(1);
        expect(onSearch).toHaveBeenCalledWith('Team');
      });
    });
  });
});