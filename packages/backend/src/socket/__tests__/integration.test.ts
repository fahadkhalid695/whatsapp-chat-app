import { redisClient } from '../redis';

describe('Socket Integration', () => {
  beforeAll(async () => {
    // Skip Redis connection for now since we don't have Redis running in test
    console.log('Socket integration tests - Redis connection skipped for CI');
  });

  afterAll(async () => {
    // Cleanup if needed
  });

  test('should export socket server components', () => {
    // Test that all the main components are properly exported
    expect(typeof redisClient).toBe('object');
    expect(typeof redisClient.connect).toBe('function');
    expect(typeof redisClient.disconnect).toBe('function');
  });

  test('should have message handlers', () => {
    const { messageHandlers } = require('../handlers/messageHandlers');
    expect(typeof messageHandlers).toBe('function');
  });

  test('should have presence handlers', () => {
    const { presenceHandlers } = require('../handlers/presenceHandlers');
    expect(typeof presenceHandlers).toBe('function');
  });

  test('should have typing handlers', () => {
    const { typingHandlers } = require('../handlers/typingHandlers');
    expect(typeof typingHandlers).toBe('function');
  });

  test('should have socket server class', () => {
    const { SocketServer } = require('../index');
    expect(typeof SocketServer).toBe('function');
  });
});