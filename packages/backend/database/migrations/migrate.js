const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database migration utility
class DatabaseMigrator {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'whatsapp_chat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });
  }

  async createMigrationsTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    
    try {
      await this.pool.query(query);
      console.log('Migrations table created or already exists');
    } catch (error) {
      console.error('Error creating migrations table:', error);
      throw error;
    }
  }

  async getExecutedMigrations() {
    try {
      const result = await this.pool.query('SELECT filename FROM migrations ORDER BY id');
      return result.rows.map(row => row.filename);
    } catch (error) {
      console.error('Error fetching executed migrations:', error);
      throw error;
    }
  }

  async executeMigration(filename, sql) {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Execute the migration SQL
      await client.query(sql);
      
      // Record the migration as executed
      await client.query(
        'INSERT INTO migrations (filename) VALUES ($1)',
        [filename]
      );
      
      await client.query('COMMIT');
      console.log(`Migration ${filename} executed successfully`);
    } catch (error) {
      await client.query('ROLLBACK');
      console.error(`Error executing migration ${filename}:`, error);
      throw error;
    } finally {
      client.release();
    }
  }

  async runMigrations() {
    try {
      console.log('Starting database migrations...');
      
      // Create migrations table if it doesn't exist
      await this.createMigrationsTable();
      
      // Get list of executed migrations
      const executedMigrations = await this.getExecutedMigrations();
      
      // Get all migration files
      const migrationsDir = path.join(__dirname);
      const migrationFiles = fs.readdirSync(migrationsDir)
        .filter(file => file.endsWith('.sql'))
        .sort();
      
      console.log(`Found ${migrationFiles.length} migration files`);
      
      // Execute pending migrations
      for (const filename of migrationFiles) {
        if (!executedMigrations.includes(filename)) {
          console.log(`Executing migration: ${filename}`);
          const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
          await this.executeMigration(filename, sql);
        } else {
          console.log(`Migration ${filename} already executed, skipping`);
        }
      }
      
      console.log('All migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const migrator = new DatabaseMigrator();
  
  migrator.runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    })
    .finally(() => {
      migrator.close();
    });
}

module.exports = DatabaseMigrator;