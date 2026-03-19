-- _y Company — PostgreSQL / Supabase Schema
-- Run this in your PostgreSQL database or Supabase SQL Editor

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  topic TEXT NOT NULL,
  topic_type TEXT,
  participants TEXT DEFAULT '[]',
  messages TEXT DEFAULT '[]',
  summary TEXT,
  action_items TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  report_type TEXT DEFAULT 'general',
  meeting_id TEXT,
  directive_id TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_memory (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5,
  source_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_queue (
  id SERIAL PRIMARY KEY,
  agent_id TEXT NOT NULL,
  message TEXT NOT NULL,
  system_prompt TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'done', 'error')),
  response TEXT,
  model TEXT,
  metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  source_agent TEXT,
  trigger_source TEXT,
  trigger_agent_id TEXT,
  trigger_data TEXT,
  progress TEXT,
  analysis TEXT,
  verification TEXT,
  counsel_summary TEXT,
  final_decision TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS directives (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  assignees TEXT DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  symbol TEXT,
  direction TEXT,
  entry_price DOUBLE PRECISION,
  exit_price DOUBLE PRECISION,
  pnl DOUBLE PRECISION,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS schedules (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  agent_id TEXT,
  schedule_type TEXT DEFAULT 'interval',
  schedule_value TEXT NOT NULL,
  prompt TEXT NOT NULL,
  channel TEXT DEFAULT '',
  enabled INTEGER DEFAULT 1,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS connected_companies (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_name TEXT NOT NULL,
  industry TEXT,
  description TEXT,
  url TEXT,
  agents TEXT DEFAULT '[]',
  connected_at TEXT DEFAULT ''
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON chat_queue(status);
CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled, next_run);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
