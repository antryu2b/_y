-- Decision Engine Tables
-- Run on Supabase SQL Editor

-- 1. Decisions (의사결정 파이프라인)
CREATE TABLE IF NOT EXISTS decisions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,                        -- market_response, product_development, investment, content_publish, ops_incident, hiring, strategy, risk_alert
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'detected',   -- detected, analyzing, discussion_needed, in_discussion, decision_pending, approval_requested, approved, rejected, executing, completed
  priority TEXT NOT NULL DEFAULT 'medium',   -- critical, high, medium, low
  trigger_source TEXT DEFAULT 'auto',        -- auto, manual, scheduled
  trigger_agent_id TEXT,                     -- 감지한 에이전트
  trigger_data JSONB DEFAULT '{}',           -- 원본 데이터
  participants JSONB DEFAULT '{}',           -- {analyzer:[], discussants:[], reviewer:'', synthesizer:'', approver:'', executors:[]}
  artifacts JSONB DEFAULT '{}',              -- {analysis:'', discussion_log:'', risk_review:'', recommendation:'', decision:'', execution_result:''}
  current_assignee TEXT,                     -- 현재 담당자
  deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Decision History (상태 변경 이력)
CREATE TABLE IF NOT EXISTS decision_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  decision_id UUID REFERENCES decisions(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  changed_by TEXT NOT NULL,                  -- agent_id or 'chairman'
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Agent Skills (에이전트 역량)
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
CREATE INDEX IF NOT EXISTS idx_decisions_type ON decisions(type);
CREATE INDEX IF NOT EXISTS idx_decisions_priority ON decisions(priority);
CREATE INDEX IF NOT EXISTS idx_decisions_assignee ON decisions(current_assignee);
CREATE INDEX IF NOT EXISTS idx_decision_history_decision ON decision_history(decision_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_agent ON agent_skills(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_skills_skill ON agent_skills(skill_name);

-- RLS Policies (same pattern as existing tables)
ALTER TABLE decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE decision_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_all" ON decisions FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON decision_history FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon_all" ON agent_skills FOR ALL TO anon USING (true) WITH CHECK (true);
