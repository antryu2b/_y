-- Chat Queue Table for DB-based LLM system
-- Execute this in Supabase SQL Editor

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

-- RLS 정책
ALTER TABLE chat_queue ENABLE ROW LEVEL SECURITY;

-- 익명 사용자가 chat_queue를 읽을 수 있도록
CREATE POLICY "anon_read_chat_queue" ON chat_queue 
  FOR SELECT USING (true);

-- 익명 사용자가 chat_queue에 INSERT할 수 있도록
CREATE POLICY "anon_insert_chat_queue" ON chat_queue 
  FOR INSERT WITH CHECK (true);

-- 익명 사용자가 chat_queue를 UPDATE할 수 있도록 (워커가 상태 업데이트를 위해)
CREATE POLICY "anon_update_chat_queue" ON chat_queue 
  FOR UPDATE USING (true);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_chat_queue_status 
  ON chat_queue(status) WHERE status = 'pending';

-- 생성된 시간 인덱스 (오래된 레코드 정리용)
CREATE INDEX IF NOT EXISTS idx_chat_queue_created_at 
  ON chat_queue(created_at);

-- 트리거로 updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_chat_queue_updated_at BEFORE UPDATE
  ON chat_queue FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();