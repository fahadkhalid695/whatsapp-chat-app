-- Production PostgreSQL configuration optimizations
-- These settings should be applied to postgresql.conf or via ALTER SYSTEM

-- Memory Configuration
-- Adjust based on available system memory
ALTER SYSTEM SET shared_buffers = '256MB';  -- 25% of RAM for dedicated server
ALTER SYSTEM SET effective_cache_size = '1GB';  -- 75% of available RAM
ALTER SYSTEM SET work_mem = '4MB';  -- Per-operation memory
ALTER SYSTEM SET maintenance_work_mem = '64MB';  -- For maintenance operations

-- Connection Settings
ALTER SYSTEM SET max_connections = 200;  -- Adjust based on expected load
ALTER SYSTEM SET superuser_reserved_connections = 3;

-- Write-Ahead Logging (WAL) Configuration
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_writer_delay = '200ms';
ALTER SYSTEM SET commit_delay = 0;
ALTER SYSTEM SET commit_siblings = 5;

-- Background Writer Configuration
ALTER SYSTEM SET bgwriter_delay = '200ms';
ALTER SYSTEM SET bgwriter_lru_maxpages = 100;
ALTER SYSTEM SET bgwriter_lru_multiplier = 2.0;

-- Query Planner Configuration
ALTER SYSTEM SET random_page_cost = 1.1;  -- For SSD storage
ALTER SYSTEM SET effective_io_concurrency = 200;  -- For SSD storage
ALTER SYSTEM SET seq_page_cost = 1.0;
ALTER SYSTEM SET cpu_tuple_cost = 0.01;
ALTER SYSTEM SET cpu_index_tuple_cost = 0.005;
ALTER SYSTEM SET cpu_operator_cost = 0.0025;

-- Autovacuum Configuration
ALTER SYSTEM SET autovacuum = on;
ALTER SYSTEM SET autovacuum_max_workers = 3;
ALTER SYSTEM SET autovacuum_naptime = '1min';
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_analyze_threshold = 50;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.2;
ALTER SYSTEM SET autovacuum_analyze_scale_factor = 0.1;
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = '20ms';
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 200;

-- Logging Configuration for Monitoring
ALTER SYSTEM SET log_destination = 'stderr';
ALTER SYSTEM SET logging_collector = on;
ALTER SYSTEM SET log_directory = 'pg_log';
ALTER SYSTEM SET log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log';
ALTER SYSTEM SET log_rotation_age = '1d';
ALTER SYSTEM SET log_rotation_size = '100MB';
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log slow queries (1 second)
ALTER SYSTEM SET log_checkpoints = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_lock_waits = on;
ALTER SYSTEM SET log_temp_files = 10240;  -- Log temp files > 10MB
ALTER SYSTEM SET log_autovacuum_min_duration = 0;
ALTER SYSTEM SET log_error_verbosity = 'default';
ALTER SYSTEM SET log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h ';
ALTER SYSTEM SET log_statement = 'none';  -- Change to 'all' for debugging

-- Statistics Configuration
ALTER SYSTEM SET track_activities = on;
ALTER SYSTEM SET track_counts = on;
ALTER SYSTEM SET track_io_timing = on;
ALTER SYSTEM SET track_functions = 'none';
ALTER SYSTEM SET stats_temp_directory = 'pg_stat_tmp';

-- Lock Configuration
ALTER SYSTEM SET deadlock_timeout = '1s';
ALTER SYSTEM SET max_locks_per_transaction = 64;
ALTER SYSTEM SET max_pred_locks_per_transaction = 64;

-- Replication Configuration (if using replication)
-- ALTER SYSTEM SET wal_level = 'replica';
-- ALTER SYSTEM SET max_wal_senders = 3;
-- ALTER SYSTEM SET wal_keep_segments = 32;
-- ALTER SYSTEM SET hot_standby = on;

-- Security Configuration
ALTER SYSTEM SET ssl = on;  -- Enable SSL
ALTER SYSTEM SET password_encryption = 'scram-sha-256';
ALTER SYSTEM SET row_security = on;

-- Reload configuration
SELECT pg_reload_conf();

-- Create monitoring views and functions
CREATE OR REPLACE VIEW pg_stat_statements_summary AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements
ORDER BY total_time DESC;

-- Function to get database size information
CREATE OR REPLACE FUNCTION get_database_size_info()
RETURNS TABLE(
    database_name TEXT,
    size_mb NUMERIC,
    size_pretty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        datname::TEXT,
        ROUND(pg_database_size(datname) / 1024.0 / 1024.0, 2) as size_mb,
        pg_size_pretty(pg_database_size(datname)) as size_pretty
    FROM pg_database
    WHERE datname NOT IN ('template0', 'template1', 'postgres')
    ORDER BY pg_database_size(datname) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get table size information
CREATE OR REPLACE FUNCTION get_table_size_info()
RETURNS TABLE(
    schema_name TEXT,
    table_name TEXT,
    size_mb NUMERIC,
    size_pretty TEXT,
    index_size_mb NUMERIC,
    index_size_pretty TEXT,
    total_size_mb NUMERIC,
    total_size_pretty TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        schemaname::TEXT,
        tablename::TEXT,
        ROUND(pg_total_relation_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as size_mb,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size_pretty,
        ROUND(pg_indexes_size(schemaname||'.'||tablename) / 1024.0 / 1024.0, 2) as index_size_mb,
        pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as index_size_pretty,
        ROUND((pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) / 1024.0 / 1024.0, 2) as total_size_mb,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) + pg_indexes_size(schemaname||'.'||tablename)) as total_size_pretty
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get connection information
CREATE OR REPLACE FUNCTION get_connection_info()
RETURNS TABLE(
    state TEXT,
    count BIGINT,
    max_connections INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(state, 'idle')::TEXT,
        COUNT(*),
        (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections')
    FROM pg_stat_activity
    GROUP BY state
    ORDER BY count DESC;
END;
$$ LANGUAGE plpgsql;

-- Create extension for monitoring (if not exists)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Set up table-specific autovacuum settings for high-traffic tables
ALTER TABLE messages SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE message_status SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05,
    autovacuum_vacuum_cost_delay = 10
);

ALTER TABLE conversation_participants SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- Create maintenance procedures
CREATE OR REPLACE FUNCTION maintenance_cleanup()
RETURNS void AS $$
BEGIN
    -- Vacuum and analyze critical tables
    VACUUM ANALYZE messages;
    VACUUM ANALYZE message_status;
    VACUUM ANALYZE conversations;
    VACUUM ANALYZE users;
    
    -- Reindex if needed (run during maintenance window)
    -- REINDEX TABLE messages;
    
    -- Update table statistics
    ANALYZE;
    
    RAISE NOTICE 'Maintenance cleanup completed at %', NOW();
END;
$$ LANGUAGE plpgsql;