import { createClient, RedisClientType } from 'redis';
import { config } from '../config';
import { Message } from '../types';

class RedisClient {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;

  constructor() {
    const redisConfig: any = {
      socket: {
        host: config.redis.host,
        port: config.redis.port,
      },
      database: config.redis.db,
    };

    if (config.redis.password) {
      redisConfig.password = config.redis.password;
    }

    this.client = createClient(redisConfig);
    this.subscriber = createClient(redisConfig);
    this.publisher = createClient(redisConfig);

    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.client.on('error', (err) => console.error('Redis Client Error:', err));
    this.subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
    this.publisher.on('error', (err) => console.error('Redis Publisher Error:', err));
  }

  async connect() {
    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect(),
      ]);
      console.log('✅ Redis clients connected successfully');
    } catch (error) {
      console.error('❌ Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    try {
      await Promise.all([
        this.client.disconnect(),
        this.subscriber.disconnect(),
        this.publisher.disconnect(),
      ]);
      console.log('✅ Redis clients disconnected successfully');
    } catch (error) {
      console.error('❌ Failed to disconnect from Redis:', error);
    }
  }

  // Message queuing for offline users
  async queueMessage(userId: string, message: Message) {
    const key = `offline_messages:${userId}`;
    const messageData = JSON.stringify(message);
    
    await this.client.lPush(key, messageData);
    
    // Set expiration for the queue (7 days)
    await this.client.expire(key, 7 * 24 * 60 * 60);
  }

  async getQueuedMessages(userId: string): Promise<Message[]> {
    const key = `offline_messages:${userId}`;
    const messages = await this.client.lRange(key, 0, -1);
    
    // Clear the queue after retrieving messages
    await this.client.del(key);
    
    return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
  }

  // Presence management
  async setUserOnline(userId: string) {
    const key = `presence:${userId}`;
    await this.client.hSet(key, {
      isOnline: 'true',
      lastSeen: new Date().toISOString(),
    });
    
    // Set expiration for presence data (30 minutes)
    await this.client.expire(key, 30 * 60);
    
    // Publish presence update
    await this.publisher.publish('presence_updates', JSON.stringify({
      userId,
      isOnline: true,
      lastSeen: new Date().toISOString(),
    }));
  }

  async setUserOffline(userId: string) {
    const key = `presence:${userId}`;
    const lastSeen = new Date().toISOString();
    
    await this.client.hSet(key, {
      isOnline: 'false',
      lastSeen,
    });
    
    // Set expiration for presence data (7 days)
    await this.client.expire(key, 7 * 24 * 60 * 60);
    
    // Publish presence update
    await this.publisher.publish('presence_updates', JSON.stringify({
      userId,
      isOnline: false,
      lastSeen,
    }));
  }

  async getUserPresence(userId: string): Promise<{ isOnline: boolean; lastSeen: string } | null> {
    const key = `presence:${userId}`;
    const presence = await this.client.hGetAll(key);
    
    if (!presence.isOnline) {
      return null;
    }
    
    return {
      isOnline: presence.isOnline === 'true',
      lastSeen: presence.lastSeen,
    };
  }

  async getMultipleUserPresence(userIds: string[]): Promise<Record<string, { isOnline: boolean; lastSeen: string }>> {
    const pipeline = this.client.multi();
    
    userIds.forEach(userId => {
      pipeline.hGetAll(`presence:${userId}`);
    });
    
    const results = await pipeline.exec();
    const presenceData: Record<string, { isOnline: boolean; lastSeen: string }> = {};
    
    results?.forEach((result, index) => {
      const userId = userIds[index];
      const presence = result as any;
      
      if (presence && typeof presence === 'object' && presence.isOnline) {
        presenceData[userId] = {
          isOnline: presence.isOnline === 'true',
          lastSeen: presence.lastSeen,
        };
      }
    });
    
    return presenceData;
  }

  // Typing indicators
  async setUserTyping(userId: string, conversationId: string) {
    const key = `typing:${conversationId}:${userId}`;
    await this.client.setEx(key, 5, 'true'); // Expires in 5 seconds
    
    // Publish typing event
    await this.publisher.publish('typing_updates', JSON.stringify({
      userId,
      conversationId,
      isTyping: true,
    }));
  }

  async setUserStoppedTyping(userId: string, conversationId: string) {
    const key = `typing:${conversationId}:${userId}`;
    await this.client.del(key);
    
    // Publish typing stopped event
    await this.publisher.publish('typing_updates', JSON.stringify({
      userId,
      conversationId,
      isTyping: false,
    }));
  }

  async getTypingUsers(conversationId: string): Promise<string[]> {
    const pattern = `typing:${conversationId}:*`;
    const keys = await this.client.keys(pattern);
    
    return keys.map(key => key.split(':')[2]); // Extract userId from key
  }

  // Message delivery tracking
  async trackMessageDelivery(messageId: string, userId: string) {
    const key = `delivery:${messageId}`;
    await this.client.sAdd(key, userId);
    
    // Set expiration for delivery tracking (30 days)
    await this.client.expire(key, 30 * 24 * 60 * 60);
  }

  async trackMessageRead(messageId: string, userId: string) {
    const key = `read:${messageId}`;
    await this.client.sAdd(key, userId);
    
    // Set expiration for read tracking (30 days)
    await this.client.expire(key, 30 * 24 * 60 * 60);
  }

  async getMessageDeliveryStatus(messageId: string): Promise<{ delivered: string[]; read: string[] }> {
    const [delivered, read] = await Promise.all([
      this.client.sMembers(`delivery:${messageId}`),
      this.client.sMembers(`read:${messageId}`),
    ]);
    
    return { delivered, read };
  }

  // Pub/Sub methods
  async subscribe(channel: string, callback: (message: string) => void) {
    await this.subscriber.subscribe(channel, callback);
  }

  async publish(channel: string, message: string) {
    await this.publisher.publish(channel, message);
  }

  // General cache methods
  async set(key: string, value: string, expireInSeconds?: number) {
    if (expireInSeconds) {
      await this.client.setEx(key, expireInSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    return (await this.client.exists(key)) === 1;
  }

  // Expose client for advanced operations (use carefully)
  getClient(): RedisClientType {
    return this.client;
  }
}

export const redisClient = new RedisClient();