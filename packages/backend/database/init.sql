-- Initial database setup for WhatsApp Chat App
-- This file is used by Docker to initialize the PostgreSQL database

-- Create database if it doesn't exist
-- (This is handled by the POSTGRES_DB environment variable in Docker)

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create initial tables (basic structure)
-- Full schema will be created through migrations in later tasks

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    profile_picture TEXT,
    status TEXT DEFAULT 'Available',
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_online BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_is_online ON users(is_online);

-- Insert a test user for development
INSERT INTO users (phone_number, display_name, status) 
VALUES ('+1234567890', 'Test User', 'Available')
ON CONFLICT (phone_number) DO NOTHING;