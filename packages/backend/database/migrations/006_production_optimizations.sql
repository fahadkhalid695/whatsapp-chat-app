-- Production database optimizations and indexing
-- Migration: 006_production_optimizations.sql

-- Create indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_number ON users(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_seen ON users(last_seen);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_online ON users(is_online);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_last_activity ON conversations(last_activity DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_user_id ON conversation_participants(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_conversation_id ON conversation_participants(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversation_participants_joined_at ON conversation_participants(joined_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_type ON messages(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_timestamp ON messages(conversation_id, timestamp DESC);

-- Composite index for message queries with pagination
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_conversation_timestamp_id ON messages(conversation_id, timestamp DESC, id);

-- Index for message search (using GIN for JSONB content)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_gin ON messages USING GIN(content);

-- Full-text search index for message content
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_content_text ON messages USING GIN(to_tsvector('english', content->>'text'));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_status_message_id ON message_status(message_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_status_user_id ON message_status(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_status_status ON message_status(status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_status_timestamp ON message_status(timestamp DESC);

-- Composite index for message status queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_status_user_message ON message_status(user_id, message_id, status);

-- Contacts table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_contact_user_id ON contacts(contact_user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_phone_number ON contacts(phone_number);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_is_app_user ON contacts(is_app_user);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_is_blocked ON contacts(is_blocked);

-- Media table indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_message_id ON media(message_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_user_id ON media(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_type ON media(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_media_created_at ON media(created_at DESC);

-- Notification table indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Device sessions indexes (if exists)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_sessions_user_id ON device_sessions(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_sessions_device_id ON device_sessions(device_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_sessions_is_active ON device_sessions(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_device_sessions_last_activity ON device_sessions(last_activity DESC);

-- Partial indexes for better performance on filtered queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_active ON messages(conversation_id, timestamp DESC) WHERE is_deleted = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_conversations_active ON conversations(last_activity DESC) WHERE is_archived = false;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_online ON users(last_seen DESC) WHERE is_online = true;

-- Database configuration optimizations
-- These should be set in postgresql.conf or via ALTER SYSTEM

-- Connection and memory settings
-- shared_buffers = 256MB (25% of RAM for dedicated server)
-- effective_cache_size = 1GB (75% of RAM)
-- work_mem = 4MB
-- maintenance_work_mem = 64MB
-- max_connections = 200

-- Write-ahead logging settings
-- wal_buffers = 16MB
-- checkpoint_completion_target = 0.9
-- wal_writer_delay = 200ms

-- Query planner settings
-- random_page_cost = 1.1 (for SSD storage)
-- effective_io_concurrency = 200 (for SSD storage)

-- Logging settings for monitoring
-- log_min_duration_statement = 1000 (log queries taking more than 1 second)
-- log_checkpoints = on
-- log_connections = on
-- log_disconnections = on
-- log_lock_waits = on

-- Create materialized view for conversation list with last message
CREATE MATERIALIZED VIEW IF NOT EXISTS conversation_list_view AS
SELECT 
    c.id,
    c.type,
    c.name,
    c.last_activity,
    c.is_archived,
    c.created_at,
    m.id as last_message_id,
    m.content as last_message_content,
    m.type as last_message_type,
    m.timestamp as last_message_timestamp,
    u.display_name as last_sender_name,
    (
        SELECT COUNT(*)
        FROM messages m2
        LEFT JOIN message_status ms ON m2.id = ms.message_id AND ms.user_id = cp.user_id AND ms.status = 'read'
        WHERE m2.conversation_id = c.id 
        AND m2.is_deleted = false
        AND ms.message_id IS NULL
        AND m2.sender_id != cp.user_id
    ) as unread_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id AND m.timestamp = (
    SELECT MAX(timestamp) 
    FROM messages m3 
    WHERE m3.conversation_id = c.id AND m3.is_deleted = false
)
LEFT JOIN users u ON m.sender_id = u.id
LEFT JOIN conversation_participants cp ON c.id = cp.conversation_id
WHERE c.is_archived = false;

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_list_view_id_user ON conversation_list_view(id, user_id);

-- Create function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_conversation_list_view()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY conversation_list_view;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to refresh view when messages are inserted/updated
CREATE OR REPLACE FUNCTION trigger_refresh_conversation_list()
RETURNS trigger AS $$
BEGIN
    PERFORM refresh_conversation_list_view();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: In production, consider using a job scheduler instead of triggers for view refresh
-- to avoid performance impact on write operations

-- Create function for efficient message pagination
CREATE OR REPLACE FUNCTION get_messages_paginated(
    p_conversation_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_before_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    p_before_id UUID DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    conversation_id UUID,
    sender_id UUID,
    content JSONB,
    type VARCHAR,
    timestamp TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN,
    reply_to UUID,
    edited_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.type,
        m.timestamp,
        m.is_deleted,
        m.reply_to,
        m.edited_at
    FROM messages m
    WHERE m.conversation_id = p_conversation_id
    AND m.is_deleted = false
    AND (
        p_before_timestamp IS NULL 
        OR m.timestamp < p_before_timestamp
        OR (m.timestamp = p_before_timestamp AND m.id < p_before_id)
    )
    ORDER BY m.timestamp DESC, m.id DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function for message search with ranking
CREATE OR REPLACE FUNCTION search_messages(
    p_user_id UUID,
    p_query TEXT,
    p_conversation_id UUID DEFAULT NULL,
    p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
    id UUID,
    conversation_id UUID,
    sender_id UUID,
    content JSONB,
    type VARCHAR,
    timestamp TIMESTAMP WITH TIME ZONE,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.type,
        m.timestamp,
        ts_rank(to_tsvector('english', m.content->>'text'), plainto_tsquery('english', p_query)) as rank
    FROM messages m
    JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
    WHERE cp.user_id = p_user_id
    AND m.is_deleted = false
    AND m.content->>'text' IS NOT NULL
    AND to_tsvector('english', m.content->>'text') @@ plainto_tsquery('english', p_query)
    AND (p_conversation_id IS NULL OR m.conversation_id = p_conversation_id)
    ORDER BY rank DESC, m.timestamp DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for the functions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_search_rank ON messages USING GIN(to_tsvector('english', content->>'text'));

-- Analyze tables to update statistics
ANALYZE users;
ANALYZE conversations;
ANALYZE conversation_participants;
ANALYZE messages;
ANALYZE message_status;
ANALYZE contacts;