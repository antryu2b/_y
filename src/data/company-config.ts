/**
 * Company Configuration — loaded from y-company.config.yml at build time
 * Edit y-company.config.yml to customize for your company.
 * 
 * Note: Edge runtime cannot use fs/path, so we inline the config.
 * Run `npm run build` after editing the config file.
 */

export interface CompanyConfig {
  company: {
    name: string;
    nameShort: string;
    mission: string;
    missionKo: string;
    stage: string;
    teamSize: string;
  };
  products: Array<{
    name: string;
    priority: string;
    status: string;
    revenue: string;
    description: string;
    descriptionKo?: string;
    competitors?: string[];
    differentiator?: string;
    differentiatorKo?: string;
  }>;
  subsidiaries: Array<{ name: string; description: string; descriptionKo: string }>;
  targets: {
    shortTerm: string[];
    midTerm: string[];
    killerDemo: string;
    killerDemoEn: string;
  };
  customers: {
    primary: string;
    primaryEn: string;
    secondary: string;
    secondaryEn: string;
  };
  chairman: { name: string; style: string; timezone: string };
  values: string[];
  decisionPrinciples: string[];
  responseRules: {
    maxSentences: number;
    format: string;
    banned: string[];
    required: string[];
    tone: string;
    toneEn: string;
  };
}

// ═══════════════════════════════════════════
// Auto-generated from y-company.config.yml
// To update: edit y-company.config.yml → rebuild
// ═══════════════════════════════════════════
export const CONFIG: CompanyConfig = {
  company: {
    name: "_y Holdings",
    nameShort: "_y",
    mission: "Prove that 1 human + AI agents can operate at enterprise scale",
    missionKo: "1명의 인간 + AI 에이전트로 기업 규모 운영이 가능함을 증명",
    stage: "pre-launch",
    teamSize: "1 human + 30 AI agents",
  },
  subsidiaries: [
  ],
  products: [
    {
      name: "_y Builder",
      priority: "critical",
      status: "개발 중",
      revenue: "$0",
      description: "AI agent org-chart framework. Ollama-first, open source frame + paid ops/personas/Playbook",
      descriptionKo: "AI 에이전트 조직 프레임워크. Ollama 기반, 오픈소스 프레임 + 유료 노하우/페르소나/Playbook",
      competitors: ["CrewAI", "AutoGen", "LangGraph"],
      differentiator: "Developer tools (code-based) vs _y Builder (business leader tools, org-chart UX)",
      differentiatorKo: "개발자 도구(코드) vs _y Builder(비개발자 리더용, 조직도 UX)",
    },
    {
      name: "Acme Corp",
      priority: "medium",
      status: "운영 중",
      revenue: "$0 (무료)",
      description: "AI-powered company management platform. Sample subsidiary for _y Builder",
      descriptionKo: "AI 기반 회사 관리 플랫폼. _y Builder 샘플 자회사",
    },
    {
      name: "S&P500 Quant",
      priority: "medium",
      status: "실전 운용 중",
      revenue: "운용 중",
      description: "CME futures automated trading via Kiwoom Securities",
      descriptionKo: "키움증권 CME 선물 자동매매",
    },
  ],
  targets: {
    shortTerm: [
      "X(Twitter) 바이럴 — 1만+ impression (2주 내)",
      "GitHub 공개 — 500 star 목표",
    ],
    midTerm: [
      "Anthropic/OpenAI 스카우트 접점 확보",
      "_y Builder 유료 고객 확보",
    ],
    killerDemo: "AI 에이전트 회사가 AI 에이전트 뉴스를 분석하는 자기참조 바이럴",
    killerDemoEn: "AI agent company analyzing AI agent news — self-referential viral content",
  },
  customers: {
    primary: "AI에 관심 있는 비개발자 창업자/리더",
    primaryEn: "Non-developer founders/leaders interested in AI",
    secondary: "대기업 혁신팀",
    secondaryEn: "Enterprise innovation teams",
  },
  chairman: {
    name: "Chairman",
    style: "빠른 판단, 데이터 기반, Ship > Plan",
    timezone: "Asia/Seoul",
  },
  values: [
    "Ship > Plan",
    "Content = Proof",
    "Global First",
    "Free First",
    "Trust the Process",
    "No Consensus Just Counsel",
  ],
  decisionPrinciples: [
    "각 에이전트는 독립적으로 분석 (Byzantine Generals)",
    "투표/다수결 금지",
    "Skepty 리스크 리뷰 필수",
    "Counsely 종합 → 회장 결재",
    "구조적 검증: 같은 데이터, 다른 LLM, 독립 결론",
  ],
  responseRules: {
    maxSentences: 5,
    format: "bullet",
    banned: ["~해야 합니다", "모니터링 필요", "검토 필요", "고려해야", "~할 수 있습니다"],
    required: ["구체적 행동", "숫자/수치", "기한/데드라인", "담당자"],
    tone: "스타트업 실무자 (대기업 컨설턴트 톤 금지)",
    toneEn: "Startup operator (no corporate consultant tone)",
  },
};

/** Build system prompt prefix from config */
export function buildSystemPromptFromConfig(): string {
  const c = CONFIG;
  
  const subs = c.subsidiaries.map(s => `${s.name}(${s.description})`).join(', ');
  
  const products = c.products
    .map(p => {
      const icon = p.priority === 'critical' ? '' : p.priority === 'high' ? '' : '';
      return `- ${icon} ${p.name}: ${p.descriptionKo || p.description}. ${p.status}. Revenue: ${p.revenue}.${p.competitors ? ` 경쟁: ${p.competitors.join(', ')}` : ''}${p.differentiatorKo ? ` 차별화: ${p.differentiatorKo}` : ''}`;
    }).join('\n');
  
  const targets = c.targets.shortTerm.map(t => `- ${t}`).join('\n');
  
  const banned = c.responseRules.banned.map(b => `"${b}"`).join(', ');
  const required = c.responseRules.required.join(', ');
  
  return `${c.company.name} AI agent. Chairman ${c.chairman.name} = only human. ${c.company.teamSize}.
Mission: ${c.company.mission}
Subsidiaries: ${subs}

## Products & Revenue
${products}

## Current Status & Targets
- Stage: ${c.company.stage}. ${c.company.teamSize}.
- Customers: 1차 ${c.customers.primary}, 2차 ${c.customers.secondary}.
- Killer demo: ${c.targets.killerDemo}
${targets}

Values: ${c.values.join(', ')}.

## 답변 규칙 (STRICT)
- 사용자의 언어(한국어/영어)에 맞춰 답변. 한국어 질문→한국어 답변, 영어 질문→영어 답변.
- ${c.responseRules.maxSentences}문장 MAX. 불릿포인트.
- 금지어: ${banned} → 구체적 행동으로 대체.
- BAD: "시장 동향을 모니터링해야 합니다" → GOOD: "CrewAI GitHub star 주간 추적, 3000 돌파 시 블로그 선제 발행"
- ${required}를 반드시 포함. 없으면 추정치라도.
- ${c.responseRules.tone}.
`;
}
