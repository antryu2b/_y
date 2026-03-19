-- _y Company Supabase Schema
-- Run this in Supabase Dashboard > SQL Editor

-- 1. conversations: 에이전트 1:1 채팅 이력
CREATE TABLE IF NOT EXISTS conversations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 2. meetings: 회의록
CREATE TABLE IF NOT EXISTS meetings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  topic text NOT NULL,
  topic_type text,
  participants text[] NOT NULL DEFAULT '{}',
  messages jsonb NOT NULL DEFAULT '[]',
  summary text,
  action_items jsonb,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

-- 3. reports: 보고서 + 결재
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  title text NOT NULL,
  content text NOT NULL,
  report_type text DEFAULT 'general',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  meeting_id uuid REFERENCES meetings(id),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);

-- 4. agent_memory: 에이전트 학습/기억 누적
CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id text NOT NULL,
  memory_type text NOT NULL CHECK (memory_type IN ('conversation', 'meeting', 'knowledge', 'skill')),
  content text NOT NULL,
  importance integer DEFAULT 5 CHECK (importance BETWEEN 1 AND 10),
  source_id uuid,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_created ON meetings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_agent ON reports(agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id, importance DESC);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(agent_id, memory_type);

-- RLS policies (enable row-level security but allow all for service_role)
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

-- Allow anon read access (for the web app)
CREATE POLICY "Allow anon read conversations" ON conversations FOR SELECT USING (true);
CREATE POLICY "Allow anon insert conversations" ON conversations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon read meetings" ON meetings FOR SELECT USING (true);
CREATE POLICY "Allow anon insert meetings" ON meetings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon all reports" ON reports FOR ALL USING (true);
CREATE POLICY "Allow anon read memory" ON agent_memory FOR SELECT USING (true);
CREATE POLICY "Allow anon insert memory" ON agent_memory FOR INSERT WITH CHECK (true);
