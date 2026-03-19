/**
 * Demo mode data — returned when DEMO_MODE=true (no DB required)
 * Used for Vercel deployment showcase
 */

export const DEMO_COMPANIES = [
  {
    id: 1,
    name: '_y Holdings Demo',
    url: 'https://example.com',
    description: 'AI-powered company management platform',
    status: 'active',
    created_at: '2026-03-15T09:00:00Z',
    updated_at: '2026-03-18T10:00:00Z',
  },
];

export const DEMO_DECISIONS = [
  {
    id: 1,
    title: 'Expand to European market',
    status: 'approved',
    type: 'strategic',
    priority: 'high',
    current_assignee: 'counsely',
    created_at: '2026-03-17T14:00:00Z',
    updated_at: '2026-03-18T09:00:00Z',
  },
  {
    id: 2,
    title: 'Implement Byzantine LLM rotation',
    status: 'in_progress',
    type: 'technical',
    priority: 'critical',
    current_assignee: 'stacky',
    created_at: '2026-03-16T10:00:00Z',
    updated_at: '2026-03-17T15:00:00Z',
  },
  {
    id: 3,
    title: 'Q1 marketing budget allocation',
    status: 'in_progress',
    type: 'financial',
    priority: 'medium',
    current_assignee: 'finy',
    created_at: '2026-03-15T08:00:00Z',
    updated_at: '2026-03-18T07:00:00Z',
  },
];

export const DEMO_REPORTS = [
  {
    id: 1,
    agent_id: 'searchy',
    title: 'SEO Analysis: competitor landscape Q1 2026',
    report_type: 'analysis',
    status: 'completed',
    content: 'Comprehensive SEO analysis shows strong opportunity in long-tail keywords...',
    created_at: '2026-03-18T08:00:00Z',
  },
  {
    id: 2,
    agent_id: 'skepty',
    title: 'Risk Assessment: Cloud provider dependency',
    report_type: 'risk',
    status: 'completed',
    content: 'Current multi-vendor LLM strategy effectively mitigates single-point failures...',
    created_at: '2026-03-17T16:00:00Z',
  },
  {
    id: 3,
    agent_id: 'quanty',
    title: 'Market Analysis: AI agent framework landscape',
    report_type: 'analysis',
    status: 'completed',
    content: 'CrewAI leads in GitHub stars but _y differentiates with corporate hierarchy...',
    created_at: '2026-03-17T11:00:00Z',
  },
  {
    id: 4,
    agent_id: 'guardy',
    title: 'Security Audit: API endpoint review',
    report_type: 'audit',
    status: 'completed',
    content: 'All endpoints properly authenticated. Rate limiting in place...',
    created_at: '2026-03-16T14:00:00Z',
  },
  {
    id: 5,
    agent_id: 'growthy',
    title: 'Growth Strategy: Open source launch plan',
    report_type: 'strategy',
    status: 'in_progress',
    content: 'Recommended launch sequence: GitHub → HN → Reddit → Product Hunt...',
    created_at: '2026-03-16T09:00:00Z',
  },
];

export const DEMO_SCHEDULES = [
  {
    id: 1,
    title: 'Morning standup',
    agent_id: 'counsely',
    schedule_type: 'recurring',
    status: 'active',
    cron: '0 9 * * 1-5',
    created_at: '2026-03-10T00:00:00Z',
  },
  {
    id: 2,
    title: 'Weekly risk review',
    agent_id: 'skepty',
    schedule_type: 'recurring',
    status: 'active',
    cron: '0 14 * * 1',
    created_at: '2026-03-10T00:00:00Z',
  },
];

export const DEMO_AGENT_STATUS = [
  { agent_id: 'counsely', status: 'active', last_active: '2026-03-18T10:00:00Z', tasks_completed: 47 },
  { agent_id: 'tasky', status: 'active', last_active: '2026-03-18T09:55:00Z', tasks_completed: 83 },
  { agent_id: 'skepty', status: 'active', last_active: '2026-03-18T09:50:00Z', tasks_completed: 31 },
  { agent_id: 'searchy', status: 'active', last_active: '2026-03-18T09:45:00Z', tasks_completed: 56 },
  { agent_id: 'buildy', status: 'idle', last_active: '2026-03-18T08:30:00Z', tasks_completed: 72 },
  { agent_id: 'quanty', status: 'active', last_active: '2026-03-18T09:40:00Z', tasks_completed: 29 },
  { agent_id: 'growthy', status: 'active', last_active: '2026-03-18T09:30:00Z', tasks_completed: 44 },
  { agent_id: 'guardy', status: 'idle', last_active: '2026-03-18T07:00:00Z', tasks_completed: 18 },
];

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' || 
    (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.DATABASE_URL);
}
