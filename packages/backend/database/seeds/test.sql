-- Test seed data for WhatsApp Chat App
-- Minimal data set for running automated tests

-- Clear existing data (in reverse order of dependencies)
DELETE FROM message_status;
DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM contacts;
DELETE FROM users;

-- Insert minimal test users
INSERT INTO users (id, phone_number, display_name, status, is_online) VALUES
  ('test-user-1', '+1111111111', 'Test User 1', 'Available', true),
  ('test-user-2', '+2222222222', 'Test User 2', 'Available', false),
  ('test-user-3', '+3333333333', 'Test User 3', 'Busy', true);

-- Insert test conversation
INSERT INTO conversations (id, type, name, last_activity) VALUES
  ('test-conv-1', 'direct', null, NOW()),
  ('test-conv-2', 'group', 'Test Group', NOW());

-- Insert conversation participants
INSERT INTO conversation_participants (conversation_id, user_id, is_admin) VALUES
  ('test-conv-1', 'test-user-1', false),
  ('test-conv-1', 'test-user-2', false),
  ('test-conv-2', 'test-user-1', true),
  ('test-conv-2', 'test-user-2', false),
  ('test-conv-2', 'test-user-3', false);

-- Insert test message
INSERT INTO messages (id, conversation_id, sender_id, content, type, timestamp) VALUES
  ('test-msg-1', 'test-conv-1', 'test-user-1', '{"text": "Test message"}', 'text', NOW());

-- Insert test contacts
INSERT INTO contacts (id, user_id, contact_user_id, name, phone_number, is_app_user) VALUES
  ('test-contact-1', 'test-user-1', 'test-user-2', 'Test User 2', '+2222222222', true),
  ('test-contact-2', 'test-user-2', 'test-user-1', 'Test User 1', '+1111111111', true);