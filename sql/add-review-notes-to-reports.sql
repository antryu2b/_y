-- Add review_notes column to reports table
-- Run this in Supabase SQL Editor
ALTER TABLE reports ADD COLUMN IF NOT EXISTS review_notes TEXT;
