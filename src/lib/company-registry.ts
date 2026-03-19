// Company Registry — _y Holdings Multi-Company PnP
// Open-source version: no built-in subsidiaries.
// Users connect their own company via Company Settings.

export interface Company {
  id: string;
  name: string;
  nameKo: string;
  icon: string;
  color: string;
  agents: string[];
  floors: number[];
  description: string;
  descriptionKo: string;
  isHoldings?: boolean;
  isUserCompany?: boolean;
  connectedAt?: string;
  industry?: string;
  mode?: 'scan' | 'manual';
}

// No built-in subsidiaries in open-source version
export const BASE_SUBSIDIARIES: Company[] = [];

export const ALL_AGENTS = [
  'counsely', 'tasky', 'skepty', 'audity',
  'buzzy', 'wordy', 'pixely', 'edity',
  'buildy', 'stacky', 'testy', 'guardy',
  'searchy', 'hiry', 'legaly', 'opsy',
  'helpy', 'selly', 'globy', 'growthy',
  'evaly', 'valuey', 'hedgy', 'finy',
  'logoy', 'clicky', 'fieldy',
  'tradey', 'quanty', 'watchy',
];

const INDUSTRY_STYLE: Record<string, { icon: string; color: string }> = {
  manufacturing: { icon: '', color: 'slate' },
  import_export: { icon: '', color: 'blue' },
  retail: { icon: '️', color: 'pink' },
  construction: { icon: '', color: 'orange' },
  consulting: { icon: '', color: 'violet' },
  food_beverage: { icon: '️', color: 'yellow' },
  logistics: { icon: '', color: 'teal' },
  saas: { icon: '', color: 'cyan' },
  ecommerce: { icon: '', color: 'rose' },
  finance: { icon: '', color: 'emerald' },
  media: { icon: '', color: 'purple' },
  healthcare: { icon: '', color: 'green' },
  education: { icon: '', color: 'indigo' },
  marketplace: { icon: '', color: 'amber' },
  enterprise: { icon: '', color: 'gray' },
  gaming: { icon: '', color: 'fuchsia' },
  other: { icon: '', color: 'zinc' },
};

export function loadUserCompany(): Company | null {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem('y-company-connection');
    if (!data) return null;
    const conn = JSON.parse(data);
    const style = INDUSTRY_STYLE[conn.industry || 'other'] || INDUSTRY_STYLE.other;
    return {
      id: 'user-company',
      name: conn.company_name || conn.title || 'My Company',
      nameKo: conn.company_name || conn.title || '내 회사',
      icon: style.icon,
      color: style.color,
      agents: conn.agents || [],
      floors: [],
      description: conn.description || `${conn.site_type_label || 'Business'} company`,
      descriptionKo: conn.description || `${conn.site_type_label || '비즈니스'} 회사`,
      isUserCompany: true,
      connectedAt: conn.connected_at,
      industry: conn.industry,
      mode: conn.mode,
    };
  } catch { return null; }
}

export function buildCompanyList(userCompany?: Company | null): {
  companies: Company[]; isMulti: boolean; defaultId: string;
} {
  const subs = [...BASE_SUBSIDIARIES];
  if (userCompany) subs.push(userCompany);
  const subsidiaryAgents = new Set(subs.flatMap(c => c.agents));
  const holdingsAgents = ALL_AGENTS.filter(a => !subsidiaryAgents.has(a));
  const holdings: Company = {
    id: 'holdings', name: '_y Holdings', nameKo: '_y 홀딩스',
    icon: '', color: 'amber', agents: holdingsAgents,
    floors: [10, 9, 8, 7, 6, 5],
    description: 'Headquarters — shared agent platform, decision pipeline, reporting',
    descriptionKo: '본사 — 공통 에이전트 플랫폼, 의사결정, 보고 체계',
    isHoldings: true,
  };
  const isMulti = subs.length > 1;
  const companies = isMulti
    ? [holdings, ...subs]
    : subs.length === 1
      ? [{ ...subs[0], agents: ALL_AGENTS, floors: [10,9,8,7,6,5,4,3,2,1] }]
      : [{ ...holdings, agents: ALL_AGENTS, floors: [10,9,8,7,6,5,4,3,2,1], isHoldings: false }];
  return { companies, isMulti, defaultId: companies[0].id };
}

const { companies: _companies, isMulti: _isMulti, defaultId: _defaultId } = buildCompanyList(null);
export const SUBSIDIARIES = BASE_SUBSIDIARIES;
export const COMPANIES = _companies;
export const isMultiCompany = _isMulti;
export const defaultCompanyId = _defaultId;

export const getCompany = (id: string, list?: Company[]): Company | undefined =>
  (list || COMPANIES).find(c => c.id === id);
export const getCompanyByAgent = (agentId: string, list?: Company[]): Company | undefined =>
  (list || COMPANIES).find(c => c.agents.includes(agentId));
export const getCompanyByFloor = (floor: number, list?: Company[]): Company | undefined =>
  (list || COMPANIES).find(c => c.floors.includes(floor));
