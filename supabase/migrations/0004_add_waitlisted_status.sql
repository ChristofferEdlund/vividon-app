-- Add 'waitlisted' status to plugin auth sessions
ALTER TYPE plugin_auth_session_status ADD VALUE IF NOT EXISTS 'waitlisted';
