-- _y Holdings - Complete Database Schema
-- For Supabase: Run in SQL Editor
-- For SQLite: The app auto-creates tables via src/lib/db.ts
--
-- Tables: conversations, meetings, reports, agent_memory,
--         decisions, decision_history, agent_skills, chat_queue, trades

-- ============================================
-- Core Tables
-- ============================================

-- 1. conversations: Agent 1:1 chat history
CREATE TABLE IF NOT EXISTS conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. meetings: Meeting records
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  topic TEXT NOT NULL,
  topic_type TEXT,
  participants TEXT[] NOT NULL DEFAULT '{}',
  messages JSONB NOT NULL DEFAULT '[]',
  summary TEXT,
  action_items JSONB,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. reports: Agent reports + approval
CREATE TABLE IF NOT EXISTS reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  report_type TEXT DEFAULT 'general',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  review_notes TEXT,
  meeting_id UUID REFERENCES meetings(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- 4. agent_memory: Agent learning / accumulated memory
CREATE TABLE IF NOT EXISTS agent_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('conversation', 'meeting', 'knowledge', 'skill')),
  content TEXT NOT NULL,
  importance INTEGER DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  source_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Decision Engine
-- ============================================

-- 5. decisions: Decision pipeline
CREATE TABLE IF NOT EXISTS decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,                        -- market_response, product_development, investment, content_publish, ops_incident, hiring, strategy, risk_alert
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'detected',   -- detected → analyzing → approval_requested → approved/rejected → executing → completed
  priority TEXT NOT NULL DEFAULT 'medium',   -- critical, high, medium, low
  trigger_source TEXT DEFAULT 'auto',        -- auto, manual, scheduled
  trigger_agent_id TEXT,
  trigger_data JSONB DEFAULT '{}',           -- { title_ko, title_en, ... }
  participants JSONB DEFAULT '{}',
  artifacts JSONB DEFAULT '{}',
  current_assignee TEXT,
  analysis TEXT,
  delegation_level INTEGER DEFAULT 2,        -- 1=auto, 2=execute+report, 3=approve first, 4=chairman only
  review_notes TEXT,
  meeting_id UUID,
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. decision_history: Status change audit trail
CREATE TABLE IF NOT EXISTS decision_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. agent_skills: Agent skill progression
CREATE TABLE IF NOT EXISTS agent_skills (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  skill_name TEXT NOT NULL,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  tasks_done INTEGER DEFAULT 0,
  success_rate NUMERIC(3,2) DEFAULT 0.50,
  avg_quality NUMERIC(3,2) DEFAULT 0.50,
  streak INTEGER DEFAULT 0,
  notable_results JSONB DEFAULT '[]',
  last_task_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, skill_name)
);

-- ============================================
-- Chat Queue (DB-based LLM calls)
-- ============================================

-- 8. chat_queue: Async LLM request queue
CREATE TABLE IF NOT EXISTS chat_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  history JSONB,
  lang TEXT DEFAULT 'en',
  system_prompt TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  response TEXT,
  error TEXT,
  llm_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Trading (optional)
-- ============================================

-- 9. trades: Trading log
CREATE TABLE IF NOT EXISTS trades (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  symbol VARCHAR(20) DEFAULT 'MES',
  contract VARCHAR(20),
  direction VARCHAR(10) NOT NULL,
  entry_price DECIMAL(10,2),
  exit_price DECIMAL(10,2),
  pnl_points DECIMAL(10,2),
  pnl_dollars DECIMAL(10,2),
  quantity INT DEFAULT 1,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  strategy VARCHAR(50),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_agent ON reports(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(agent_id, memory_type);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(type);
CREATE INDEX IF NOT EXISTS idx_decisions_priority ON decisions(priority);
CREATE INDEX IF NOT EXISTS idx_decisions_assignee ON decisions(current_assignee);
CREATE INDEX IF NOT EXISTS idx_decisions_delegation ON decisions(delegation_level);
CREATE INDEX IF NOT EXISTS idx_decision_history_decision ON decision_history(decision_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_chat_queue_status ON chat_queue(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_chat_queue_created_at ON chat_queue(created_at);

-- ============================================
-- Row Level Security (Supabase only)
-- ============================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_queue ENABLE ROW LEVEL SECURITY;

-- Allow all access for anon (web app)
CREATE POLICY "anon_all" ON conversations FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON meetings FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON reports FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON agent_memory FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON decisions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON decision_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON agent_skills FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON chat_queue FOR ALL TO anon USING (true) WITH CHECK (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

CREATE TRIGGER update_chat_queue_updated_at BEFORE UPDATE
  ON chat_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_decisions_updated_at BEFORE UPDATE
  ON decisions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_agent_skills_updated_at BEFORE UPDATE
  ON agent_skills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
