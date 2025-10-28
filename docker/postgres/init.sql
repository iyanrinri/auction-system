-- PostgreSQL initialization script for Auction System
-- This script is executed when the container is first started

-- Ensure the database exists (PostgreSQL doesn't support IF NOT EXISTS for databases)
-- The database is already created via POSTGRES_DB environment variable

-- Grant additional permissions to the user
GRANT ALL ON SCHEMA public TO auction_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO auction_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO auction_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO auction_user;

-- Create additional database for testing (optional)
CREATE DATABASE auction_system_test;
GRANT ALL PRIVILEGES ON DATABASE auction_system_test TO auction_user;

-- Log initialization
\echo 'PostgreSQL initialization completed for Auction System'