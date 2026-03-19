import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';
export const maxDuration = 60;
import { agentPersonas, SYSTEM_PROMPT_PREFIX } from '@/data/personas';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Scenario types and their relevant agents
const SCENARIO_AGENTS: Record<string, string[]> = {
  market: ['skepty', 'quanty', 'globy', 'hedgy', 'tradey', 'tasky'],
  product: ['tasky', 'buildy', 'pixely', 'testy', 'growthy', 'buzzy'],
  crisis: ['skepty', 'audity', 'guardy', 'watchy', 'legaly', 'tasky'],
  investment: ['quanty', 'valuey', 'fieldy', 'hedgy', 'finy', 'skepty'],
  launch: ['buzzy', 'wordy', 'selly', 'growthy', 'searchy', 'tasky'],
  hiring: ['hiry', 'evaly', 'tasky', 'finy', 'legaly'],
  security: ['guardy', 'stacky', 'watchy', 'audity', 'legaly'],
  content: ['buzzy', 'wordy', 'edity', 'searchy', 'logoy', 'growthy'],
  general: ['tasky', 'skepty', 'finy', 'buildy', 'growthy'],
};

function detectScenarioType(scenario: string): string {
  const lower = scenario.toLowerCase();
  const keywords: Record<string, string[]> = {
    market: ['시장', '경쟁', '경쟁사', 'market', 'competitor', '점유율', '가격전쟁'],
    product: ['제품', '개발', '기능', 'product', 'feature', '출시', 'MVP', '프로토타입'],
    crisis: ['위기', '장애', '사고', 'crisis', 'incident', '해킹', '유출', '소송'],
    investment: ['투자', '인수', 'M&A', 'investment', '펀딩', '밸류에이션', 'IPO'],
    launch: ['런칭', '출시', 'launch', '마케팅', '캠페인', 'GTM'],
    hiring: ['채용', '인력', 'hiring', '퇴사', '조직', '인사'],
    security: ['보안', '해킹', 'security', '취약점', '침투', '데이터유출'],
    content: ['콘텐츠', '영상', 'content', '바이럴', 'SNS', '브랜딩'],
  };

  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) return type;
  }
  return 'general';
}

async function callAI(systemPrompt: string, userMessage: string, maxTokens: number = 200): Promise<string> {
  // Try Anthropic first
  if (ANTHROPIC_API_KEY) {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.content?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.error('Anthropic error:', e);
    }
  }

  // Fallback to Gemini
  if (GEMINI_API_KEY) {
    try {
      const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      const response = await fetch(GEMINI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          generationConfig: { maxOutputTokens: maxTokens, temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) return text;
      }
    } catch (e) {
      console.error('Gemini error:', e);
    }
  }

  return '(Response failed)';
}

async function getAgentResponse(
  agentId: string,
  scenario: string,
  previousResponses: { agent: string; response: string }[],
  lang: string = 'ko'
): Promise<string> {
  const persona = agentPersonas[agentId];
  if (!persona) return '';

  const prevContext = previousResponses.length > 0
    ? `\n\n## Other Agents' Opinions:\n${previousResponses.map(p => `- ${p.agent}: ${p.response}`).join('\n')}`
    : '';

  const systemPrompt = `${SYSTEM_PROMPT_PREFIX}\n\n${persona}\n\n## Simulation Mode
You are participating in a group simulation. A scenario has been presented and you must respond FROM YOUR PROFESSIONAL PERSPECTIVE.
- ${lang === 'ko' ? '반드시 한국어로 답변 (영어 금지, 고유명사/기술용어 제외)' : 'Respond in English only'}
- Be specific and actionable (not generic)
- Use your skills and frameworks
- Reference specific metrics, tools, or methods
- Keep response to 2-3 sentences max
- If other agents have already responded, build on or challenge their points
- End with one specific action item you'd take${prevContext}`;

  return callAI(systemPrompt, `Scenario: ${scenario}\n\nAnalyze from your expert perspective and provide response strategies.`, 200);
}

export async function POST(req: NextRequest) {
  try {
    const { scenario, type: forceType, agents: forceAgents, lang = 'ko' } = await req.json();

    if (!scenario) {
      return NextResponse.json({ error: 'Missing scenario' }, { status: 400 });
    }

    const scenarioType = forceType || detectScenarioType(scenario);
    const agentIds = forceAgents || SCENARIO_AGENTS[scenarioType] || SCENARIO_AGENTS.general;

    const responses: { agentId: string; agentName: string; floor: string; role: string; response: string }[] = [];

    const agentMeta: Record<string, { name: string; floor: string; role: string }> = {
      tasky: { name: 'Tasky', floor: '9F', role: 'Planning PM' },
      finy: { name: 'Finy', floor: '9F', role: 'Planning CFO' },
      legaly: { name: 'Legaly', floor: '9F', role: 'Planning Legal' },
      skepty: { name: 'Skepty', floor: '8F', role: 'Risk Challenge' },
      audity: { name: 'Audity', floor: '8F', role: 'Auditing' },
      pixely: { name: 'Pixely', floor: '7F', role: 'UI/UX Designer' },
      buildy: { name: 'Buildy', floor: '7F', role: 'Backend Developer' },
      testy: { name: 'Testy', floor: '7F', role: 'QA' },
      buzzy: { name: 'Buzzy', floor: '6F', role: 'Viral Strategist' },
      wordy: { name: 'Wordy', floor: '6F', role: 'Copywriter' },
      edity: { name: 'Edity', floor: '6F', role: 'Video Editor' },
      searchy: { name: 'Searchy', floor: '6F', role: 'SEO/AEO' },
      growthy: { name: 'Growthy', floor: '5F', role: 'Growth Hacker' },
      logoy: { name: 'Logoy', floor: '5F', role: 'Brand Designer' },
      helpy: { name: 'Helpy', floor: '5F', role: 'Customer Support' },
      clicky: { name: 'Clicky', floor: '5F', role: 'UX Researcher' },
      selly: { name: 'Selly', floor: '5F', role: 'Sales' },
      stacky: { name: 'Stacky', floor: '4F', role: 'Infrastructure/DevOps' },
      watchy: { name: 'Watchy', floor: '4F', role: 'SRE' },
      guardy: { name: 'Guardy', floor: '4F', role: 'Security' },
      hiry: { name: 'Hiry', floor: '3F', role: 'Hiring' },
      evaly: { name: 'Evaly', floor: '3F', role: 'Performance Evaluation' },
      quanty: { name: 'Quanty', floor: '2F', role: 'Quantitative Analyst' },
      tradey: { name: 'Tradey', floor: '2F', role: 'Trader' },
      globy: { name: 'Globy', floor: '2F', role: 'Macro Researcher' },
      fieldy: { name: 'Fieldy', floor: '2F', role: 'Sector Analyst' },
      hedgy: { name: 'Hedgy', floor: '2F', role: 'Risk Hedger' },
      valuey: { name: 'Valuey', floor: '2F', role: 'Valuation Analyst' },
      opsy: { name: 'Opsy', floor: '1F', role: 'Operations' },
      counsely: { name: 'Counsely', floor: '10F', role: 'Chief of Staff' },
    };

    for (const agentId of agentIds) {
      const meta = agentMeta[agentId];
      if (!meta) continue;

      const prevResponses = responses.map(r => ({
        agent: `${r.agentName}(${r.role})`,
        response: r.response,
      }));

      const response = await getAgentResponse(agentId, scenario, prevResponses, lang);

      responses.push({
        agentId,
        agentName: meta.name,
        floor: meta.floor,
        role: meta.role,
        response,
      });
    }

    // Generate executive summary
    const summaryPrompt = `The following are analysis results from _y Holdings agents on the scenario.

Scenario: ${scenario}

Analysis Results:
${responses.map(r => `- ${r.agentName}(${r.role}): ${r.response}`).join('\n')}

${lang === 'ko' ? '위 분석을 종합하여 회장에게 보고할 3줄 요약과 즉시 실행할 Top 3 액션 아이템을 한국어로 작성하세요.' : 'Synthesize the above into a 3-line executive summary and Top 3 action items for the Chairman. Write in English.'}`;

    const summary = await callAI('You are a strategic planning report writer for _y Holdings.', summaryPrompt, 300);

    return NextResponse.json({
      scenario,
      type: scenarioType,
      agentCount: responses.length,
      responses,
      summary,
    });
  } catch (error) {
    console.error('Simulate API error:', error);
    return NextResponse.json({ error: 'Simulation failed' }, { status: 500 });
  }
}
