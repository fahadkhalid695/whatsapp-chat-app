-- Security and Privacy Features Migration

-- User reports table
CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'fake_account', 'other')),
  description TEXT,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Security settings table
CREATE TABLE security_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  two_factor_enabled BOOLEAN DEFAULT false,
  read_receipts_enabled BOOLEAN DEFAULT true,
  last_seen_enabled BOOLEAN DEFAULT true,
  profile_photo_visibility VARCHAR(20) DEFAULT 'everyone' CHECK (profile_photo_visibility IN ('everyone', 'contacts', 'nobody')),
  status_visibility VARCHAR(20) DEFAULT 'everyone' CHECK (status_visibility IN ('everyone', 'contacts', 'nobody')),
  blocked_users UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disappearing messages settings table
CREATE TABLE disappearing_messages (
  conversation_id UUID PRIMARY KEY REFERENCES conversations(id) ON DELETE CASCADE,
  timer_duration INTEGER NOT NULL DEFAULT 0, -- in seconds, 0 = disabled
  enabled_by UUID REFERENCES users(id) ON DELETE SET NULL,
  enabled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Account recovery table
CREATE TABLE account_recovery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  recovery_code VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

-- Message encryption keys table (for end-to-end encryption)
CREATE TABLE encryption_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  key_id VARCHAR(255) NOT NULL,
  public_key TEXT NOT NULL,
  private_key_encrypted TEXT NOT NULL, -- encrypted with user's password
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user_id, key_id)
);

-- Add encryption fields to messages table
ALTER TABLE messages ADD COLUMN encrypted_content TEXT;
ALTER TABLE messages ADD COLUMN key_id VARCHAR(255);
ALTER TABLE messages ADD COLUMN iv VARCHAR(255);
ALTER TABLE messages ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE; -- for disappearing messages

-- Add indexes for performance
CREATE INDEX idx_user_reports_reporter ON user_reports(reporter_id);
CREATE INDEX idx_user_reports_reported ON user_reports(reported_user_id);
CREATE INDEX idx_user_reports_status ON user_reports(status);
CREATE INDEX idx_user_reports_created_at ON user_reports(created_at);

CREATE INDEX idx_encryption_keys_user_id ON encryption_keys(user_id);
CREATE INDEX idx_encryption_keys_key_id ON encryption_keys(key_id);
CREATE INDEX idx_encryption_keys_active ON encryption_keys(is_active);

CREATE INDEX idx_messages_expires_at ON messages(expires_at) WHERE expires_at IS NOT NULL;

-- Function to automatically delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE messages 
  SET is_deleted = true, content = '{"text": "This message has disappeared"}'::jsonb
  WHERE expires_at IS NOT NULL 
    AND expires_at <= NOW() 
    AND is_deleted = false;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update security_settings updated_at
CREATE OR REPLACE FUNCTION update_security_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_security_settings_updated_at
  BEFORE UPDATE ON security_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_security_settings_updated_at();

-- Insert default security settings for existing users
INSERT INTO security_settings (user_id)
SELECT id FROM users
ON CONFLICT (user_id) DO NOTHING;