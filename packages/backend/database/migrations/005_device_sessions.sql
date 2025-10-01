-- Migration 005: Device sessions for cross-platform synchronization
-- Created: 2025-01-01
-- Description: Creates device_sessions table and offline_messages table for cross-platform sync

-- Device sessions table for tracking user sessions across devices
CREATE TABLE IF NOT EXISTS device_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255) NOT NULL,
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'mobile')),
  user_agent TEXT,
  app_version VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, device_id)
);

-- Offline messages queue for storing messages when devices are offline
CREATE TABLE IF NOT EXISTS offline_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  device_id VARCHAR(255),
  message_data JSONB NOT NULL,
  queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_device_sessions_is_active ON device_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_device_sessions_last_activity ON device_sessions(last_activity);

CREATE INDEX IF NOT EXISTS idx_offline_messages_user_id ON offline_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_messages_device_id ON offline_messages(device_id);
CREATE INDEX IF NOT EXISTS idx_offline_messages_queued_at ON offline_messages(queued_at);
CREATE INDEX IF NOT EXISTS idx_offline_messages_next_retry ON offline_messages(next_retry);
CREATE INDEX IF NOT EXISTS idx_offline_messages_delivered_at ON offline_messages(delivered_at);

-- Function to clean up old device sessions (inactive for more than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_device_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM device_sessions 
  WHERE is_active = false 
  AND last_activity < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to clean up delivered offline messages (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_delivered_offline_messages()
RETURNS void AS $$
BEGIN
  DELETE FROM offline_messages 
  WHERE delivered_at IS NOT NULL 
  AND delivered_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;