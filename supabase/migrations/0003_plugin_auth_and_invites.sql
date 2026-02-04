-- Migration: Plugin Auth Sessions and Invites
-- Description: Adds tables for browser-based plugin authentication and invite system

-- Plugin auth session status enum
CREATE TYPE plugin_auth_session_status AS ENUM ('pending', 'completed', 'expired');

-- Plugin auth sessions table for browser-based login flow
CREATE TABLE plugin_auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES user_profiles(id),
  api_key_id UUID REFERENCES api_keys(id),
  api_key_plaintext TEXT, -- Temporary storage, cleared after first retrieval
  status plugin_auth_session_status DEFAULT 'pending' NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for plugin auth sessions
CREATE INDEX idx_plugin_auth_sessions_token ON plugin_auth_sessions(session_token);
CREATE INDEX idx_plugin_auth_sessions_expires ON plugin_auth_sessions(expires_at);
CREATE INDEX idx_plugin_auth_sessions_status ON plugin_auth_sessions(status);

-- Invites table for waitlist user invitations
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  credits_to_grant INTEGER DEFAULT 10 NOT NULL,
  used BOOLEAN DEFAULT FALSE NOT NULL,
  used_at TIMESTAMPTZ,
  used_by_user_id UUID REFERENCES user_profiles(id),
  expires_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_by_user_id UUID REFERENCES user_profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for invites
CREATE INDEX idx_invites_code ON invites(code);
CREATE INDEX idx_invites_email ON invites(email);
CREATE INDEX idx_invites_used ON invites(used);

-- Enable RLS on new tables
ALTER TABLE plugin_auth_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for plugin_auth_sessions
-- Sessions are managed by the API, no direct user access needed
CREATE POLICY "Service role can manage plugin auth sessions"
  ON plugin_auth_sessions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- RLS Policies for invites
-- Only admins can create/manage invites (handled at API level)
CREATE POLICY "Service role can manage invites"
  ON invites
  FOR ALL
  USING (true)
  WITH CHECK (true);
