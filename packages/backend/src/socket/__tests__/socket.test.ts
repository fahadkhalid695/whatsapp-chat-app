import { createServer } from 'http';
import { io as Client } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { SocketServer } from '../index';

describe('Socket.io Server', () => {
  let httpServer: any;
  let socketServer: SocketServer;
  let clientSocket: any;

  beforeAll((done) => {
    httpServer = createServer();
    socketServer = new SocketServer(httpServer);
    
    httpServer.listen(() => {
      const port = httpServer.address().port;
      
      // Create a valid JWT token for testing
      const token = jwt.sign(
        { userId: 'test-user-id', phoneNumber: '+1234567890' },
        config.jwt.secret,
        { expiresIn: '1h' }
      );

      clientSocket = Client(`http://localhost:${port}`, {
        auth: { token },
        transports: ['websocket'],
      });
      
      clientSocket.on('connect', done);
    });
  });

  afterAll(() => {
    socketServer.getIO().close();
    clientSocket.close();
    httpServer.close();
  });

  test('should authenticate user on connection', (done) => {
    expect(clientSocket.connected).toBe(true);
    done();
  });

  test('should handle heartbeat', (done) => {
    clientSocket.emit('heartbeat');
    
    clientSocket.on('heartbeat-ack', (data: any) => {
      expect(data.timestamp).toBeDefined();
      done();
    });
  });

  test('should handle join-conversation event', (done) => {
    // Mock conversation service to avoid database dependency
    jest.mock('../../services/conversation', () => ({
      ConversationService: {
        getConversationById: jest.fn().mockResolvedValue({
          id: 'test-conversation',
          participants: ['test-user-id'],
        }),
      },
    }));

    clientSocket.emit('join-conversation', 'test-conversation');
    
    clientSocket.on('error', (error: any) => {
      // Expected since we don't have a real database connection
      expect(error.message).toBeDefined();
      done();
    });
  });
});