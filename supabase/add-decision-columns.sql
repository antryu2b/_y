-- Decision Engine Phase 2: 분석 결과 + 위임 등급 컬럼 추가
-- Supabase SQL Editor에서 실행

-- 에이전트 분석 결과
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS analysis TEXT;

-- 위임 등급 (1=자동실행, 2=실행후보고, 3=승인후실행, 4=직접지시)
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS delegation_level INTEGER DEFAULT 2;

-- Skepty/Counsely 검토 내용
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- 회의 ID 연결 (meetings 테이블과 연동)
ALTER TABLE decisions ADD COLUMN IF NOT EXISTS meeting_id UUID;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_decisions_delegation ON decisions(delegation_level);
CREATE INDEX IF NOT EXISTS idx_decisions_status_delegation ON decisions(status, delegation_level);
