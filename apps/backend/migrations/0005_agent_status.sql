-- Add status column to agents table for active/reserve system
ALTER TABLE agents ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
CREATE INDEX IF NOT EXISTS idx_agents_user_status ON agents(user_id, status);
