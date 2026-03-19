-- reports 테이블 status check constraint 수정
-- 기존: pending만 허용
-- 변경: pending, in_progress, done, approved, rejected 허용

ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE reports ADD CONSTRAINT reports_status_check 
  CHECK (status IN ('pending', 'in_progress', 'done', 'approved', 'rejected'));
