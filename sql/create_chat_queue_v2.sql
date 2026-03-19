-- Step 1: 테이블 생성
CREATE TABLE IF NOT EXISTS chat_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB,
  history JSONB,
  lang TEXT DEFAULT 'ko',
  system_prompt TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'error')),
  response TEXT,
  error TEXT,
  llm_model TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: RLS
ALTER TABLE chat_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_chat_queue" ON chat_queue 
  FOR SELECT USING (true);

CREATE POLICY "anon_insert_chat_queue" ON chat_queue 
  FOR INSERT WITH CHECK (true);

CREATE POLICY "anon_update_chat_queue" ON chat_queue 
  FOR UPDATE USING (true);

-- Step 3: 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_queue_status 
  ON chat_queue(status) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_chat_queue_created_at 
  ON chat_queue(created_at);
