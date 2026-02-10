-- Initial database schema for Jukugi Bokujo (熟議牧場)
-- Created: 2026-02-08

-- ============================================================================
-- Users Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,              -- Clerk user ID
  created_at INTEGER NOT NULL,      -- UNIX timestamp
  updated_at INTEGER NOT NULL
);

-- ============================================================================
-- Agents Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,              -- UUID
  user_id TEXT NOT NULL,            -- Clerk user ID
  name TEXT NOT NULL,               -- Agent name
  persona TEXT NOT NULL,            -- Persona description (JSON)
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id ON agents(user_id);

-- ============================================================================
-- Topics Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,              -- UUID
  title TEXT NOT NULL,              -- Topic title
  description TEXT NOT NULL,        -- Topic description
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);

-- ============================================================================
-- Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,              -- UUID
  topic_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | active | completed | cancelled
  participant_count INTEGER NOT NULL DEFAULT 0, -- Number of participating agents
  current_turn INTEGER NOT NULL DEFAULT 0,      -- Current turn number
  max_turns INTEGER NOT NULL DEFAULT 10,        -- Max turns (fixed at 10)
  summary TEXT,                     -- Session summary (generated on completion)
  judge_verdict TEXT,               -- AI judge verdict (JSON)
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_topic_id ON sessions(topic_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);

-- ============================================================================
-- Session Participants Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS session_participants (
  id TEXT PRIMARY KEY,              -- UUID
  session_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  joined_at INTEGER NOT NULL,
  speaking_order INTEGER NOT NULL DEFAULT 0, -- Speaking order (1, 2, 3, 4)
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  UNIQUE(session_id, agent_id)
);

CREATE INDEX IF NOT EXISTS idx_session_participants_session_id ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_agent_id ON session_participants(agent_id);
CREATE INDEX IF NOT EXISTS idx_session_participants_speaking_order ON session_participants(session_id, speaking_order);

-- ============================================================================
-- Turns Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS turns (
  id TEXT PRIMARY KEY,              -- UUID
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,     -- Turn number (starting from 1)
  status TEXT NOT NULL DEFAULT 'pending', -- pending | processing | completed | failed
  started_at INTEGER,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(session_id, turn_number)
);

CREATE INDEX IF NOT EXISTS idx_turns_session_id ON turns(session_id);
CREATE INDEX IF NOT EXISTS idx_turns_status ON turns(status);
CREATE INDEX IF NOT EXISTS idx_turns_session_turn ON turns(session_id, turn_number);

-- ============================================================================
-- Statements Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS statements (
  id TEXT PRIMARY KEY,              -- UUID
  turn_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  content TEXT NOT NULL,            -- Statement content
  thinking_process TEXT,            -- Thinking process (for debugging)
  created_at INTEGER NOT NULL,
  FOREIGN KEY (turn_id) REFERENCES turns(id) ON DELETE CASCADE,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_statements_turn_id ON statements(turn_id);
CREATE INDEX IF NOT EXISTS idx_statements_agent_id ON statements(agent_id);
CREATE INDEX IF NOT EXISTS idx_statements_created_at ON statements(created_at);

-- ============================================================================
-- Knowledge Entries Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT PRIMARY KEY,              -- UUID
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,            -- Knowledge content
  embedding_text TEXT,              -- Pre-processed text for embedding
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_knowledge_agent_id ON knowledge_entries(agent_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_created_at ON knowledge_entries(created_at);

-- ============================================================================
-- User Inputs Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_inputs (
  id TEXT PRIMARY KEY,              -- UUID
  agent_id TEXT NOT NULL,
  input_type TEXT NOT NULL,         -- direction | knowledge | feedback
  content TEXT NOT NULL,
  applied_at INTEGER,               -- Timestamp when applied to persona
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_inputs_agent_id ON user_inputs(agent_id);
CREATE INDEX IF NOT EXISTS idx_user_inputs_type ON user_inputs(input_type);
CREATE INDEX IF NOT EXISTS idx_user_inputs_applied_at ON user_inputs(applied_at);

-- ============================================================================
-- Initial Data: Demo Topic
-- ============================================================================
INSERT OR IGNORE INTO topics (id, title, description, status, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'デモトピック：地域活性化について',
  '地域活性化のための施策について熟議を行います。観光、移住促進、産業振興など様々な観点から議論してください。',
  'active',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);
