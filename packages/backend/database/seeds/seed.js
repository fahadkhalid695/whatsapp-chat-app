const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Database seeder utility
class DatabaseSeeder {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      database: process.env.DB_NAME || 'whatsapp_chat',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
    });
  }

  async seedDatabase(environment = 'development') {
    const seedFile = path.join(__dirname, `${environment}.sql`);
    
    if (!fs.existsSync(seedFile)) {
      throw new Error(`Seed file not found: ${seedFile}`);
    }

    try {
      console.log(`Starting database seeding for ${environment} environment...`);
      
      const sql = fs.readFileSync(seedFile, 'utf8');
      
      // Execute the seed SQL
      await this.pool.query(sql);
      
      console.log(`Database seeded successfully for ${environment} environment`);
    } catch (error) {
      console.error('Seeding failed:', error);
      throw error;
    }
  }

  async clearDatabase() {
    try {
      console.log('Clearing database...');
      
      // Clear all data in reverse order of dependencies
      const clearQueries = [
        'DELETE FROM message_status',
        'DELETE FROM messages',
        'DELETE FROM conversation_participants',
        'DELETE FROM conversations',
        'DELETE FROM contacts',
        'DELETE FROM users',
      ];
      
      for (const query of clearQueries) {
        await this.pool.query(query);
      }
      
      console.log('Database cleared successfully');
    } catch (error) {
      console.error('Failed to clear database:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const stats = {};
      
      const tables = ['users', 'conversations', 'messages', 'contacts', 'conversation_participants', 'message_status'];
      
      for (const table of tables) {
        const result = await this.pool.query(`SELECT COUNT(*) as count FROM ${table}`);
        stats[table] = parseInt(result.rows[0].count, 10);
      }
      
      return stats;
    } catch (error) {
      console.error('Failed to get database stats:', error);
      throw error;
    }
  }

  async close() {
    await this.pool.end();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const environment = args[1] || 'development';
  
  const seeder = new DatabaseSeeder();
  
  try {
    switch (command) {
      case 'seed':
        await seeder.seedDatabase(environment);
        break;
        
      case 'clear':
        await seeder.clearDatabase();
        break;
        
      case 'reset':
        await seeder.clearDatabase();
        await seeder.seedDatabase(environment);
        break;
        
      case 'stats':
        const stats = await seeder.getStats();
        console.log('Database Statistics:');
        console.table(stats);
        break;
        
      default:
        console.log('Usage: node seed.js <command> [environment]');
        console.log('Commands:');
        console.log('  seed [env]  - Seed database with data for specified environment (default: development)');
        console.log('  clear       - Clear all data from database');
        console.log('  reset [env] - Clear database and reseed with fresh data');
        console.log('  stats       - Show database statistics');
        process.exit(1);
    }
  } catch (error) {
    console.error('Operation failed:', error);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = DatabaseSeeder;