import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from '../config';

// Database connection pool singleton
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: Pool;
  private isConnected: boolean = false;

  private constructor() {
    this.pool = new Pool({
      host: config.database.host,
      port: config.database.port,
      database: config.database.name,
      user: config.database.user,
      password: config.database.password,
      max: config.database.maxConnections,
      idleTimeoutMillis: config.database.idleTimeoutMillis,
      connectionTimeoutMillis: config.database.connectionTimeoutMillis,
    });

    // Handle pool events
    this.pool.on('connect', () => {
      console.log('New database client connected');
    });

    this.pool.on('error', (err: Error) => {
      console.error('Database pool error:', err);
    });

    this.pool.on('remove', () => {
      console.log('Database client removed from pool');
    });
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      
      this.isConnected = true;
      console.log('Database connection established successfully');
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }

  public async query<T extends Record<string, any> = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }

    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      
      console.log('Executed query', { 
        text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
        duration: `${duration}ms`,
        rows: result.rowCount 
      });
      
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    if (!this.isConnected) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.pool.connect();
  }

  public async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.getClient();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async close(): Promise<void> {
    try {
      await this.pool.end();
      this.isConnected = false;
      console.log('Database connection pool closed');
    } catch (error) {
      console.error('Error closing database connection:', error);
      throw error;
    }
  }

  public getPoolInfo() {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      isConnected: this.isConnected,
    };
  }
}

// Export singleton instance
export const db = DatabaseConnection.getInstance();

// Helper functions for common database operations
export class DatabaseHelper {
  static async findById<T extends Record<string, any>>(table: string, id: string): Promise<T | null> {
    const result = await db.query<T>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  static async findByField<T extends Record<string, any>>(table: string, field: string, value: any): Promise<T[]> {
    const result = await db.query<T>(`SELECT * FROM ${table} WHERE ${field} = $1`, [value]);
    return result.rows;
  }

  static async insert<T extends Record<string, any>>(table: string, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${table} (${fields.join(', ')}) 
      VALUES (${placeholders}) 
      RETURNING *
    `;
    
    const result = await db.query<T>(query, values);
    return result.rows[0];
  }

  static async update<T extends Record<string, any>>(table: string, id: string, data: Partial<T>): Promise<T | null> {
    const fields = Object.keys(data);
    const values = Object.values(data);
    const setClause = fields.map((field, index) => `${field} = $${index + 2}`).join(', ');
    
    const query = `
      UPDATE ${table} 
      SET ${setClause}, updated_at = NOW() 
      WHERE id = $1 
      RETURNING *
    `;
    
    const result = await db.query<T>(query, [id, ...values]);
    return result.rows[0] || null;
  }

  static async delete(table: string, id: string): Promise<boolean> {
    const result = await db.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return (result.rowCount || 0) > 0;
  }

  static async exists(table: string, field: string, value: any): Promise<boolean> {
    const result = await db.query(
      `SELECT 1 FROM ${table} WHERE ${field} = $1 LIMIT 1`,
      [value]
    );
    return result.rows.length > 0;
  }
}

export default db;