-- Add session mode support
-- Created: 2026-02-10
--
-- Enables different deliberation modes per session (e.g. double_diamond, free_discussion)

-- ============================================================================
-- Add mode column to sessions table
-- ============================================================================
ALTER TABLE sessions ADD COLUMN mode TEXT NOT NULL DEFAULT 'double_diamond';

-- ============================================================================
-- Add mode-specific configuration (JSON)
-- ============================================================================
ALTER TABLE sessions ADD COLUMN mode_config TEXT;

-- ============================================================================
-- Index for mode queries
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sessions_mode ON sessions(mode);
