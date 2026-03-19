/**
 * Agent Hierarchy, Level, and LLM Configuration
 * 
 * 위계(Tier): C-Suite > Director > Manager > Staff
 * LLM: 상급자 = 강한 모델, 하급자 = 빠른 모델, 견제 라인 = 별도 모델
 * 
 * Byzantine Principle: 상반된 위치의 에이전트는 반드시 다른 LLM 사용
 */

export type AgentTier = 'C' | 'Director' | 'Manager' | 'Staff';

export type LLMProvider = {
  type: 'gemini' | 'ollama' | 'anthropic';
  model: string;
  label: string; // human-readable
};

export const LLM_MODELS = {
  // ── Ollama (Local — DEFAULT for _y Builder users) ──
  deepseek_r1:  { type: 'ollama' as const, model: 'deepseek-r1:70b', label: 'DeepSeek R1 70B' },
  qwen3_32b:    { type: 'ollama' as const, model: 'qwen3:32b', label: 'Qwen3 32B' },
  exaone:       { type: 'ollama' as const, model: 'exaone3.5:latest', label: 'ExaOne 3.5' },
  minimax_m25:  { type: 'ollama' as const, model: 'minimax-m2.5:cloud', label: 'MiniMax M2.5' },
  llama:        { type: 'ollama' as const, model: 'llama3.1:8b', label: 'Llama 3.1 8B' }, // lightweight default

  // ── Anthropic (Cloud — premium, needs ANTHROPIC_API_KEY) ──
  claude_opus:  { type: 'anthropic' as const, model: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  claude_sonnet:{ type: 'anthropic' as const, model: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
  claude_haiku: { type: 'anthropic' as const, model: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },

  // ── Gemini (Cloud — needs GEMINI_API_KEY) ──
  gemini_flash: { type: 'gemini' as const, model: 'gemini-2.5-flash', label: 'Gemini Flash' },
  gemini_pro:   { type: 'gemini' as const, model: 'gemini-2.5-pro', label: 'Gemini Pro' },
};

export interface AgentConfig {
  id: string;
  number: string;
  name: string;
  tier: AgentTier;
  floor: number;
  department: string;
  reportTo: string;       // direct supervisor
  llm: LLMProvider;       // assigned LLM
  role: 'analyst' | 'reviewer' | 'executor' | 'synthesizer' | 'strategist';
  desc: string;           // one-line role description (Korean)
  emoji?: string;         // optional emoji for display
}

/**
 * Full agent roster with hierarchy, level, and LLM assignment
 * 
 * LLM Assignment Logic (2026-03-11 OAuth update):
 * - C-Suite (전략/종합): Claude Opus — 최강 추론 ($0 OAuth)
 * - Director (견제/감사): DeepSeek R1 — 완전 다른 아키텍처
 * - 글쓰기/창의: Claude Sonnet — 고품질 작문 ($0 OAuth)
 * - Manager (전문분석): Qwen3 — 다른 훈련 데이터
 * - Staff (실무): Gemini Flash — 빠른 실행
 * 
 * 핵심: 같은 안건에서 분석(Flash)↔견제(DeepSeek)↔종합(Opus)이 모두 다른 모델
 * Claude OAuth: M4 로컬에서 `claude --print` 호출 시 $0
 */
export const AGENT_ROSTER: AgentConfig[] = [
  // ── 10F 회장실 ──
  { id: 'counsely', number: '30', name: 'Counsely', tier: 'C', floor: 10,
    department: "Chief of Staff", reportTo: 'chairman', llm: LLM_MODELS.claude_opus, role: 'synthesizer',
    desc: 'Chief of Staff — Information filtering, strategic synthesis', emoji: '' },

  // ── 9F 기획조정실 ──
  { id: 'tasky', number: '01', name: 'Tasky', tier: 'C', floor: 9,
    department: 'Planning & Coordination', reportTo: 'chairman', llm: LLM_MODELS.claude_opus, role: 'strategist',
    desc: 'Task Management — Company-wide coordination, project allocation', emoji: '' },
  { id: 'finy', number: '02', name: 'Finy', tier: 'C', floor: 9,
    department: 'Planning & Coordination', reportTo: 'tasky', llm: LLM_MODELS.deepseek_r1, role: 'analyst',
    desc: 'Financial Planning — Budget, revenue analysis, investment review', emoji: '' },
  { id: 'legaly', number: '03', name: 'Legaly', tier: 'Director', floor: 9,
    department: 'Planning & Coordination', reportTo: 'tasky', llm: LLM_MODELS.qwen3_32b, role: 'reviewer',
    desc: 'Legal Affairs — Contract review, licensing, regulations', emoji: '️' },

  // ── 8F 리스크/감사 ──
  { id: 'skepty', number: '04', name: 'Skepty', tier: 'Director', floor: 8,
    department: 'Risk Challenge', reportTo: 'chairman', llm: LLM_MODELS.deepseek_r1, role: 'reviewer',
    desc: 'Risk Analysis — Counter-arguments, false positive prevention', emoji: '' },
  { id: 'audity', number: '05', name: 'Audity', tier: 'Director', floor: 8,
    department: 'Audit', reportTo: 'chairman', llm: LLM_MODELS.deepseek_r1, role: 'reviewer',
    desc: 'Auditing — Internal controls, process verification', emoji: '' },

  // ── 7F SW개발본부 ──
  { id: 'pixely', number: '06', name: 'Pixely', tier: 'Manager', floor: 7,
    department: 'Software Development', reportTo: 'buildy', llm: LLM_MODELS.gemini_flash, role: 'executor',
    desc: 'UI/UX Design — Visuals, asset creation', emoji: '' },
  { id: 'buildy', number: '07', name: 'Buildy', tier: 'Director', floor: 7,
    department: 'Software Development', reportTo: 'tasky', llm: LLM_MODELS.minimax_m25, role: 'executor',
    desc: 'Full-stack Development — Architecture, implementation', emoji: '' },
  { id: 'testy', number: '08', name: 'Testy', tier: 'Manager', floor: 7,
    department: 'Software Development', reportTo: 'buildy', llm: LLM_MODELS.minimax_m25, role: 'reviewer',
    desc: 'QA/Testing — Automation, quality verification', emoji: '' },

  // ── 6F 콘텐츠본부 ──
  { id: 'buzzy', number: '09', name: 'Buzzy', tier: 'Director', floor: 6,
    department: 'Content Division', reportTo: 'tasky', llm: LLM_MODELS.claude_sonnet, role: 'executor',
    desc: 'Social Media — Content strategy, campaigns', emoji: '' },
  { id: 'wordy', number: '10', name: 'Wordy', tier: 'Manager', floor: 6,
    department: 'Content Division', reportTo: 'buzzy', llm: LLM_MODELS.claude_sonnet, role: 'executor',
    desc: 'Copywriting — Blog, document writing', emoji: '️' },
  { id: 'edity', number: '11', name: 'Edity', tier: 'Manager', floor: 6,
    department: 'Content Division', reportTo: 'buzzy', llm: LLM_MODELS.gemini_flash, role: 'executor',
    desc: 'Video Editing — Content processing, production', emoji: '' },
  { id: 'searchy', number: '12', name: 'Searchy', tier: 'Manager', floor: 6,
    department: 'Content Division', reportTo: 'buzzy', llm: LLM_MODELS.gemini_flash, role: 'analyst',
    desc: 'SEO/Research — Trend detection, competitor analysis', emoji: '' },

  // ── 5F 마케팅본부 ──
  { id: 'growthy', number: '13', name: 'Growthy', tier: 'Director', floor: 5,
    department: 'Marketing Division', reportTo: 'tasky', llm: LLM_MODELS.qwen3_32b, role: 'strategist',
    desc: 'Growth Hacking — Growth strategy, user acquisition', emoji: '' },
  { id: 'logoy', number: '14', name: 'Logoy', tier: 'Staff', floor: 5,
    department: 'Marketing Division', reportTo: 'growthy', llm: LLM_MODELS.gemini_flash, role: 'executor',
    desc: 'Brand Design — Logo, CI guidelines', emoji: '️' },
  { id: 'helpy', number: '15', name: 'Helpy', tier: 'Staff', floor: 5,
    department: 'Marketing Division', reportTo: 'growthy', llm: LLM_MODELS.gemini_flash, role: 'executor',
    desc: 'Customer Support — FAQ, onboarding guides', emoji: '' },
  { id: 'clicky', number: '16', name: 'Clicky', tier: 'Staff', floor: 5,
    department: 'Marketing Division', reportTo: 'growthy', llm: LLM_MODELS.gemini_flash, role: 'analyst',
    desc: 'Ad Management — Performance, conversion tracking', emoji: '' },
  { id: 'selly', number: '17', name: 'Selly', tier: 'Staff', floor: 5,
    department: 'Marketing Division', reportTo: 'growthy', llm: LLM_MODELS.gemini_flash, role: 'executor',
    desc: 'Sales Strategy — Business development, partnerships', emoji: '' },

  // ── 4F ICT본부 ──
  { id: 'stacky', number: '18', name: 'Stacky', tier: 'Director', floor: 4,
    department: 'ICT Division', reportTo: 'tasky', llm: LLM_MODELS.minimax_m25, role: 'executor',
    desc: 'Infrastructure — Servers, deployment, DevOps', emoji: '' },
  { id: 'watchy', number: '19', name: 'Watchy', tier: 'Manager', floor: 4,
    department: 'ICT Division', reportTo: 'stacky', llm: LLM_MODELS.claude_sonnet, role: 'analyst',
    desc: 'Monitoring — Service status, incident detection', emoji: '️' },
  { id: 'guardy', number: '20', name: 'Guardy', tier: 'Manager', floor: 4,
    department: 'ICT Division', reportTo: 'stacky', llm: LLM_MODELS.deepseek_r1, role: 'reviewer',
    desc: 'Security — Vulnerability checks, access control', emoji: '' },

  // ── 3F 경영지원실 ──
  { id: 'hiry', number: '21', name: 'Hiry', tier: 'Manager', floor: 3,
    department: 'Human Resources', reportTo: 'tasky', llm: LLM_MODELS.qwen3_32b, role: 'executor',
    desc: 'Operations Support — Hiring, organizational management', emoji: '' },
  { id: 'evaly', number: '22', name: 'Evaly', tier: 'Manager', floor: 3,
    department: 'Human Resources', reportTo: 'hiry', llm: LLM_MODELS.claude_sonnet, role: 'reviewer',
    desc: 'Data Analytics — Performance measurement, KPI review', emoji: '' },

  // ── 2F _y Capital ──
  { id: 'quanty', number: '23', name: 'Quanty', tier: 'Director', floor: 2,
    department: '_y Capital', reportTo: 'chairman', llm: LLM_MODELS.deepseek_r1, role: 'analyst',
    desc: 'Quantitative Analysis — Market signals, trading strategies', emoji: '' },
  { id: 'tradey', number: '24', name: 'Tradey', tier: 'Manager', floor: 2,
    department: '_y Capital', reportTo: 'quanty', llm: LLM_MODELS.qwen3_32b, role: 'executor',
    desc: 'Trading — Execution, backtesting', emoji: '' },
  { id: 'globy', number: '25', name: 'Globy', tier: 'Manager', floor: 2,
    department: '_y Capital', reportTo: 'quanty', llm: LLM_MODELS.gemini_flash, role: 'analyst',
    desc: 'Global Markets — International trends, macro analysis', emoji: '' },
  { id: 'fieldy', number: '26', name: 'Fieldy', tier: 'Staff', floor: 2,
    department: '_y Capital', reportTo: 'quanty', llm: LLM_MODELS.gemini_flash, role: 'analyst',
    desc: 'Field Research — On-site data, due diligence', emoji: '' },
  { id: 'hedgy', number: '27', name: 'Hedgy', tier: 'Manager', floor: 2,
    department: '_y Capital', reportTo: 'quanty', llm: LLM_MODELS.deepseek_r1, role: 'reviewer',
    desc: 'Hedge Strategy — Risk hedging, position management', emoji: '️' },
  { id: 'valuey', number: '28', name: 'Valuey', tier: 'Manager', floor: 2,
    department: '_y Capital', reportTo: 'quanty', llm: LLM_MODELS.deepseek_r1, role: 'analyst',
    desc: 'Valuation — Corporate value, fundamentals', emoji: '' },

  // ── 1F _y SaaS ──
  { id: 'opsy', number: '29', name: 'Opsy', tier: 'Director', floor: 1,
    department: '_y SaaS', reportTo: 'tasky', llm: LLM_MODELS.qwen3_32b, role: 'executor',
    desc: 'Operations — SaaS services, automation', emoji: '' },
];

// ── Helper functions ──

/** Get agent config by id */
export function getAgentConfig(id: string): AgentConfig | undefined {
  return AGENT_ROSTER.find(a => a.id === id);
}

/** Get LLM for a specific agent */
export function getAgentLLM(id: string): LLMProvider {
  return getAgentConfig(id)?.llm || LLM_MODELS.gemini_flash;
}

/** Get agent's direct supervisor */
export function getSupervisor(id: string): string {
  return getAgentConfig(id)?.reportTo || 'chairman';
}

/** Get all agents reporting to a supervisor */
export function getSubordinates(supervisorId: string): AgentConfig[] {
  return AGENT_ROSTER.filter(a => a.reportTo === supervisorId);
}

/** Get agents by tier */
export function getAgentsByTier(tier: AgentTier): AgentConfig[] {
  return AGENT_ROSTER.filter(a => a.tier === tier);
}

/** Get agents by floor */
export function getAgentsByFloor(floor: number): AgentConfig[] {
  return AGENT_ROSTER.filter(a => a.floor === floor);
}

/** Tier priority for decision weight */
export const TIER_WEIGHT: Record<AgentTier, number> = {
  C: 4,        // C-Suite — 최종 판단
  Director: 3, // 본부장/실장 — 전문 분석
  Manager: 2,  // 팀장 — 실무 분석
  Staff: 1,    // 사원 — 데이터 수집/실행
};

/** Summary stats */
export const LLM_DISTRIBUTION = {
  'Claude Opus': AGENT_ROSTER.filter(a => a.llm.model.includes('opus')).length,
  'Claude Sonnet': AGENT_ROSTER.filter(a => a.llm.model.includes('sonnet')).length,
  'Gemini Flash': AGENT_ROSTER.filter(a => a.llm.model === 'gemini-2.5-flash').length,
  'DeepSeek R1': AGENT_ROSTER.filter(a => a.llm.model === 'deepseek-r1:70b').length,
  'Qwen3 32B': AGENT_ROSTER.filter(a => a.llm.model === 'qwen3:32b').length,
  'MiniMax M2.5': AGENT_ROSTER.filter(a => a.llm.model === 'minimax-m2.5:cloud').length,
};
