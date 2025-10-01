# Database Setup and Management

This directory contains database migrations, seeds, and utilities for the WhatsApp Chat App backend.

## Structure

```
database/
├── migrations/           # Database schema migrations
│   ├── 001_initial_schema.sql
│   └── migrate.js       # Migration runner utility
├── seeds/               # Database seed data
│   ├── development.sql  # Development seed data
│   ├── test.sql        # Test seed data
│   └── seed.js         # Seeding utility
└── init.sql            # Docker initialization script
```

## Setup

1. **Environment Variables**: Copy `.env.example` to `.env` and configure database connection:
   ```bash
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=whatsapp_chat
   DB_USER=postgres
   DB_PASSWORD=postgres
   ```

2. **Database Creation**: Create the PostgreSQL database:
   ```sql
   CREATE DATABASE whatsapp_chat;
   ```

## Migration Commands

Run database migrations to create the schema:

```bash
# Run all pending migrations
npm run db:migrate

# Or run directly
node database/migrations/migrate.js
```

## Seeding Commands

Populate the database with sample data:

```bash
# Seed with development data
npm run db:seed

# Seed with test data
npm run db:seed:test

# Clear all data
npm run db:clear

# Reset database (clear + seed)
npm run db:reset

# Show database statistics
npm run db:stats
```

## Database Schema

### Core Tables

- **users**: User accounts and profiles
- **conversations**: Chat conversations (direct and group)
- **conversation_participants**: Many-to-many relationship between users and conversations
- **messages**: Chat messages with content and metadata
- **message_status**: Message delivery and read status tracking
- **contacts**: User contact lists

### Key Features

- **UUID Primary Keys**: All tables use UUID for better scalability
- **Timestamps**: Automatic created_at and updated_at tracking
- **Indexes**: Optimized indexes for common query patterns
- **Constraints**: Data integrity through foreign keys and check constraints
- **JSONB Content**: Flexible message content storage

## Usage in Code

```typescript
import { db, DatabaseHelper } from '../src/database/connection';
import { ModelTransformer } from '../src/models';

// Connect to database
await db.connect();

// Basic queries
const users = await db.query('SELECT * FROM users WHERE is_online = $1', [true]);

// Helper functions
const user = await DatabaseHelper.findById('users', userId);
const newUser = await DatabaseHelper.insert('users', userData);

// Transactions
await db.transaction(async (client) => {
  await client.query('INSERT INTO users ...');
  await client.query('INSERT INTO conversations ...');
});

// Model transformation
const userEntity = await DatabaseHelper.findById('users', userId);
const user = ModelTransformer.userEntityToUser(userEntity);
```

## Testing

The database utilities include comprehensive tests:

```bash
# Run database tests
npm test -- --testPathPattern="database"

# Run model tests
npm test -- --testPathPattern="models"
```

## Docker Support

The `init.sql` file is used by Docker Compose to initialize the PostgreSQL database with basic structure and a test user.

## Migration System

The migration system tracks executed migrations in a `migrations` table and ensures each migration runs only once. Migrations are executed in filename order.

## Seed Data

- **Development**: Realistic sample data for local development
- **Test**: Minimal data set for automated testing

Both seed files can be run multiple times safely as they clear existing data first.