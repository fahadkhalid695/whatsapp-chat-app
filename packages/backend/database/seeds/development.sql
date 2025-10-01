-- Development seed data for WhatsApp Chat App
-- This file contains sample data for development and testing purposes

-- Clear existing data (in reverse order of dependencies)
DELETE FROM message_status;
DELETE FROM messages;
DELETE FROM conversation_participants;
DELETE FROM conversations;
DELETE FROM contacts;
DELETE FROM users;

-- Reset sequences (if any)
-- PostgreSQL will handle UUID generation automatically

-- Insert sample users
INSERT INTO users (id, phone_number, display_name, profile_picture, status, is_online) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', '+1234567890', 'Alice Johnson', 'https://example.com/avatars/alice.jpg', 'Available', true),
  ('550e8400-e29b-41d4-a716-446655440002', '+1234567891', 'Bob Smith', 'https://example.com/avatars/bob.jpg', 'Busy', false),
  ('550e8400-e29b-41d4-a716-446655440003', '+1234567892', 'Charlie Brown', null, 'At work', true),
  ('550e8400-e29b-41d4-a716-446655440004', '+1234567893', 'Diana Prince', 'https://example.com/avatars/diana.jpg', 'Available', false),
  ('550e8400-e29b-41d4-a716-446655440005', '+1234567894', 'Eve Wilson', null, 'In a meeting', true);

-- Insert sample conversations
INSERT INTO conversations (id, type, name, last_activity) VALUES
  ('660e8400-e29b-41d4-a716-446655440001', 'direct', null, NOW() - INTERVAL '5 minutes'),
  ('660e8400-e29b-41d4-a716-446655440002', 'group', 'Project Team', NOW() - INTERVAL '1 hour'),
  ('660e8400-e29b-41d4-a716-446655440003', 'direct', null, NOW() - INTERVAL '2 hours'),
  ('660e8400-e29b-41d4-a716-446655440004', 'group', 'Family Chat', NOW() - INTERVAL '30 minutes');

-- Insert conversation participants
INSERT INTO conversation_participants (conversation_id, user_id, is_admin, is_muted) VALUES
  -- Direct conversation between Alice and Bob
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', false, false),
  ('660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', false, false),
  
  -- Project Team group (Alice is admin)
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', true, false),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', false, false),
  ('660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', false, false),
  
  -- Direct conversation between Charlie and Diana
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', false, false),
  ('660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', false, false),
  
  -- Family Chat group (Diana is admin)
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', true, false),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', false, false),
  ('660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', false, false);

-- Insert sample messages
INSERT INTO messages (id, conversation_id, sender_id, content, type, timestamp) VALUES
  -- Messages in Alice-Bob conversation
  ('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '{"text": "Hey Bob, how are you doing?"}', 'text', NOW() - INTERVAL '10 minutes'),
  ('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '{"text": "Hi Alice! I''m doing great, thanks for asking."}', 'text', NOW() - INTERVAL '8 minutes'),
  ('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '{"text": "That''s wonderful to hear!"}', 'text', NOW() - INTERVAL '5 minutes'),
  
  -- Messages in Project Team group
  ('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '{"text": "Good morning team! Let''s discuss today''s tasks."}', 'text', NOW() - INTERVAL '2 hours'),
  ('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440002', '{"text": "Morning Alice! I''ve completed the user authentication module."}', 'text', NOW() - INTERVAL '90 minutes'),
  ('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '{"text": "Great work Bob! I''m working on the database schema."}', 'text', NOW() - INTERVAL '1 hour'),
  
  -- Messages in Charlie-Diana conversation
  ('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440003', '{"text": "Diana, are you free for a quick call?"}', 'text', NOW() - INTERVAL '3 hours'),
  ('770e8400-e29b-41d4-a716-446655440008', '660e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', '{"text": "Sure Charlie, give me 5 minutes."}', 'text', NOW() - INTERVAL '2 hours'),
  
  -- Messages in Family Chat
  ('770e8400-e29b-41d4-a716-446655440009', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440004', '{"text": "Family dinner this Sunday at 6 PM. Everyone invited!"}', 'text', NOW() - INTERVAL '45 minutes'),
  ('770e8400-e29b-41d4-a716-446655440010', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', '{"text": "Count me in! Should I bring dessert?"}', 'text', NOW() - INTERVAL '40 minutes'),
  ('770e8400-e29b-41d4-a716-446655440011', '660e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', '{"text": "I''ll be there! Eve, yes please bring your famous apple pie 🥧"}', 'text', NOW() - INTERVAL '30 minutes');

-- Insert message delivery status
INSERT INTO message_status (message_id, user_id, status, timestamp) VALUES
  -- Alice-Bob conversation statuses
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'delivered', NOW() - INTERVAL '9 minutes'),
  ('770e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'read', NOW() - INTERVAL '8 minutes'),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'delivered', NOW() - INTERVAL '7 minutes'),
  ('770e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'read', NOW() - INTERVAL '6 minutes'),
  ('770e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440002', 'delivered', NOW() - INTERVAL '4 minutes'),
  
  -- Project Team group statuses
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'delivered', NOW() - INTERVAL '119 minutes'),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440002', 'read', NOW() - INTERVAL '90 minutes'),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'delivered', NOW() - INTERVAL '119 minutes'),
  ('770e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440003', 'read', NOW() - INTERVAL '60 minutes');

-- Insert sample contacts
INSERT INTO contacts (id, user_id, contact_user_id, name, phone_number, is_app_user, is_blocked) VALUES
  -- Alice's contacts
  ('880e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Bob Smith', '+1234567891', true, false),
  ('880e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440003', 'Charlie Brown', '+1234567892', true, false),
  ('880e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440004', 'Diana Prince', '+1234567893', true, false),
  ('880e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', null, 'John Doe', '+1234567895', false, false),
  
  -- Bob's contacts
  ('880e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Alice Johnson', '+1234567890', true, false),
  ('880e8400-e29b-41d4-a716-446655440006', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'Charlie Brown', '+1234567892', true, false),
  
  -- Charlie's contacts
  ('880e8400-e29b-41d4-a716-446655440007', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004', 'Diana Prince', '+1234567893', true, false),
  ('880e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440001', 'Alice Johnson', '+1234567890', true, false),
  
  -- Diana's contacts
  ('880e8400-e29b-41d4-a716-446655440009', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440005', 'Eve Wilson', '+1234567894', true, false),
  ('880e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440004', '550e8400-e29b-41d4-a716-446655440001', 'Alice Johnson', '+1234567890', true, false),
  
  -- Eve's contacts
  ('880e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440004', 'Diana Prince', '+1234567893', true, false),
  ('880e8400-e29b-41d4-a716-446655440012', '550e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440001', 'Alice Johnson', '+1234567890', true, false);

-- Update conversation last_activity based on latest messages
UPDATE conversations SET last_activity = (
  SELECT MAX(timestamp) FROM messages WHERE conversation_id = conversations.id
) WHERE id IN (
  SELECT DISTINCT conversation_id FROM messages
);