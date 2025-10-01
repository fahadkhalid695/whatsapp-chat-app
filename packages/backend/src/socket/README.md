# Real-time Communication Layer

This directory contains the implementation of the real-time communication layer for the WhatsApp chat application using Socket.io and Redis.

## Components

### 1. Socket Server (`index.ts`)
- Main Socket.io server setup with HTTP server integration
- Authentication middleware for JWT token validation
- Connection management and user tracking
- Event handler registration

### 2. Redis Client (`redis.ts`)
- Redis connection management with separate clients for pub/sub
- Message queuing for offline users
- Presence status tracking (online/offline)
- Typing indicators with TTL
- Message delivery and read status tracking
- Pub/Sub functionality for real-time events

### 3. Event Handlers

#### Message Handlers (`handlers/messageHandlers.ts`)
- `join-conversation` - Join conversation room
- `leave-conversation` - Leave conversation room
- `send-message` - Send new message with real-time delivery
- `mark-read` - Mark messages as read with read receipts
- `delete-message` - Delete messages with authorization
- `edit-message` - Edit message content
- `get-message-status` - Get delivery/read status

#### Presence Handlers (`handlers/presenceHandlers.ts`)
- `user-online` - Handle user coming online
- `user-offline` - Handle user going offline
- `get-presence` - Get presence status for multiple users
- `subscribe-presence` - Subscribe to presence updates
- `heartbeat` - Maintain presence with periodic heartbeats

#### Typing Handlers (`handlers/typingHandlers.ts`)
- `typing-start` - Start typing indicator
- `typing-stop` - Stop typing indicator
- `get-typing-users` - Get currently typing users
- Auto-cleanup on disconnect/leave conversation

## Features Implemented

### ✅ Socket.io Server with Authentication Middleware
- JWT token validation on connection
- User session management
- Connection tracking per user

### ✅ WebSocket Event Handlers
- Complete message sending and receiving
- Real-time message delivery to connected clients
- Message status tracking (sent, delivered, read)
- Message editing and deletion

### ✅ Real-time Message Delivery
- Instant delivery to online users
- Message queuing for offline users
- Delivery confirmation and read receipts
- Cross-device synchronization

### ✅ Typing Indicators
- Real-time typing status broadcasting
- Automatic cleanup on disconnect
- Per-conversation typing tracking
- TTL-based expiration

### ✅ Presence Status Broadcasting
- Online/offline status tracking
- Last seen timestamps
- Contact-based presence notifications
- Heartbeat mechanism for presence maintenance

### ✅ Message Queuing System using Redis
- Offline message queuing with expiration
- Message delivery tracking
- Read status synchronization
- Pub/Sub for real-time events

## Integration

The socket server is integrated into the main Express application in `src/index.ts`:

```typescript
import { initializeSocketServer } from './socket';
import { redisClient } from './socket/redis';

// Initialize Redis connection
await redisClient.connect();

// Initialize Socket.io server
const socketServer = initializeSocketServer(httpServer);
```

## Client Events

### Outgoing Events (Server → Client)
- `new-message` - New message received
- `message-delivered` - Message delivery confirmation
- `messages-read` - Read receipt notification
- `message-deleted` - Message deletion notification
- `message-edited` - Message edit notification
- `user-online` - User came online
- `user-offline` - User went offline
- `user-typing` - Typing status change
- `presence-status` - Presence status update
- `heartbeat-ack` - Heartbeat acknowledgment

### Incoming Events (Client → Server)
- `join-conversation` - Join conversation room
- `leave-conversation` - Leave conversation room
- `send-message` - Send new message
- `mark-read` - Mark messages as read
- `delete-message` - Delete message
- `edit-message` - Edit message
- `typing-start` - Start typing
- `typing-stop` - Stop typing
- `get-presence` - Get user presence
- `heartbeat` - Send heartbeat

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **2.1**: Real-time message delivery ✅
- **2.3**: Message delivery without refresh ✅
- **2.4**: Typing indicators ✅
- **2.6**: Offline message queuing ✅
- **6.1**: Cross-platform synchronization ✅
- **6.2**: Read receipt synchronization ✅
- **6.3**: Multi-device message sync ✅

## Usage

The socket server automatically starts when the main application starts. Clients can connect using Socket.io client libraries with JWT authentication:

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// Join a conversation
socket.emit('join-conversation', 'conversation-id');

// Send a message
socket.emit('send-message', {
  conversationId: 'conversation-id',
  content: { text: 'Hello!' },
  type: 'text'
});

// Listen for new messages
socket.on('new-message', (message) => {
  console.log('New message:', message);
});
```

## Error Handling

All event handlers include comprehensive error handling:
- Authentication errors
- Authorization checks
- Database operation failures
- Redis connection issues
- Invalid data validation

Errors are emitted back to the client with descriptive messages.

## Performance Considerations

- Connection pooling for Redis
- Message queuing with TTL to prevent memory leaks
- Efficient room-based message broadcasting
- Automatic cleanup of expired typing indicators
- Graceful shutdown handling

## Testing

Basic integration tests are provided in `__tests__/` directory. For full testing, ensure Redis is running and database connections are available.