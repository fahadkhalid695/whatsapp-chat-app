import { db, DatabaseHelper } from '../connection';
import { config } from '../../config';

describe('Database Connection', () => {
  beforeAll(async () => {
    // Connect to test database
    await db.connect();
  });

  afterAll(async () => {
    // Close database connection
    await db.close();
  });

  describe('Connection Management', () => {
    it('should establish database connection', async () => {
      const poolInfo = db.getPoolInfo();
      expect(poolInfo.isConnected).toBe(true);
    });

    it('should execute basic queries', async () => {
      const result = await db.query('SELECT NOW() as current_time');
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].current_time).toBeInstanceOf(Date);
    });

    it('should handle transactions', async () => {
      const result = await db.transaction(async (client) => {
        const testResult = await client.query('SELECT 1 as test_value');
        return testResult.rows[0].test_value;
      });
      
      expect(result).toBe(1);
    });
  });

  describe('Database Helper Functions', () => {
    beforeEach(async () => {
      // Clean up test data before each test
      await db.query('DELETE FROM users WHERE phone_number LIKE \'+test%\'');
    });

    it('should insert and find records', async () => {
      const userData = {
        phone_number: '+test123456789',
        display_name: 'Test User',
        status: 'Available',
      };

      // Insert user
      const insertedUser = await DatabaseHelper.insert('users', userData);
      expect(insertedUser.id).toBeDefined();
      expect(insertedUser.phone_number).toBe(userData.phone_number);

      // Find by ID
      const foundUser = await DatabaseHelper.findById('users', insertedUser.id);
      expect(foundUser).toBeTruthy();
      expect(foundUser.phone_number).toBe(userData.phone_number);

      // Find by field
      const usersByPhone = await DatabaseHelper.findByField('users', 'phone_number', userData.phone_number);
      expect(usersByPhone).toHaveLength(1);
      expect(usersByPhone[0].id).toBe(insertedUser.id);
    });

    it('should update records', async () => {
      const userData = {
        phone_number: '+test987654321',
        display_name: 'Test User',
        status: 'Available',
      };

      // Insert user
      const insertedUser = await DatabaseHelper.insert('users', userData);

      // Update user
      const updatedUser = await DatabaseHelper.update('users', insertedUser.id, {
        display_name: 'Updated Test User',
        status: 'Busy',
      });

      expect(updatedUser).toBeTruthy();
      expect(updatedUser.display_name).toBe('Updated Test User');
      expect(updatedUser.status).toBe('Busy');
    });

    it('should delete records', async () => {
      const userData = {
        phone_number: '+test555666777',
        display_name: 'Test User',
        status: 'Available',
      };

      // Insert user
      const insertedUser = await DatabaseHelper.insert('users', userData);

      // Delete user
      const deleted = await DatabaseHelper.delete('users', insertedUser.id);
      expect(deleted).toBe(true);

      // Verify deletion
      const foundUser = await DatabaseHelper.findById('users', insertedUser.id);
      expect(foundUser).toBeNull();
    });

    it('should check if records exist', async () => {
      const userData = {
        phone_number: '+test111222333',
        display_name: 'Test User',
        status: 'Available',
      };

      // Check non-existent record
      const existsBefore = await DatabaseHelper.exists('users', 'phone_number', userData.phone_number);
      expect(existsBefore).toBe(false);

      // Insert user
      await DatabaseHelper.insert('users', userData);

      // Check existing record
      const existsAfter = await DatabaseHelper.exists('users', 'phone_number', userData.phone_number);
      expect(existsAfter).toBe(true);
    });
  });
});