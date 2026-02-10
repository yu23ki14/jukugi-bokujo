-- Refactor: Split user_inputs into directions, feedbacks, session_strategies
-- Direction: real-time tactical instructions during sessions (80 chars)
-- Feedback: post-session reflection (400 chars), used for persona updates
-- Session Strategy: LLM-generated strategy from feedback, used in prompts

-- ============================================================================
-- Directions Table (replaces direction type from user_inputs)
-- ============================================================================
CREATE TABLE directions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  turn_number INTEGER NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE INDEX idx_directions_agent_session ON directions(agent_id, session_id);
CREATE INDEX idx_directions_session_turn ON directions(session_id, turn_number);

-- ============================================================================
-- Feedbacks Table (replaces feedback type from user_inputs)
-- ============================================================================
CREATE TABLE feedbacks (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  content TEXT NOT NULL,
  applied_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  UNIQUE(agent_id, session_id)
);

CREATE INDEX idx_feedbacks_agent_id ON feedbacks(agent_id);
CREATE INDEX idx_feedbacks_session_id ON feedbacks(session_id);

-- ============================================================================
-- Session Strategies Table (new)
-- ============================================================================
CREATE TABLE session_strategies (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  feedback_id TEXT,
  strategy TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
  FOREIGN KEY (feedback_id) REFERENCES feedbacks(id) ON DELETE SET NULL,
  UNIQUE(agent_id, session_id)
);

CREATE INDEX idx_session_strategies_agent_session ON session_strategies(agent_id, session_id);

-- ============================================================================
-- Drop old user_inputs table
-- ============================================================================
DROP TABLE IF EXISTS user_inputs;
