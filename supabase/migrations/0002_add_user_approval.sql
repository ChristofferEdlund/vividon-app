-- Add user approval and admin fields to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE NOT NULL,
  ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE NOT NULL;

-- Add index for filtering by approval status
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_approved ON user_profiles(is_approved);

-- Comment for documentation
COMMENT ON COLUMN user_profiles.is_approved IS 'User must be approved to use generation API';
COMMENT ON COLUMN user_profiles.is_blocked IS 'Emergency block - prevents all API access';
COMMENT ON COLUMN user_profiles.is_admin IS 'Can access admin panel';
