import { NextRequest } from 'next/server';
import { agentPersonas, SYSTEM_PROMPT_PREFIX } from '@/data/personas';

export const runtime = 'edge';
export const maxDuration = 60;

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const AGENT_META: Record<string, { name: string; floor: string; role: string; number: string }> = {
  tasky: { name: 'Tasky', floor: '9F', role: '기획조정실 PM', number: '01' },
  finy: { name: 'Finy', floor: '9F', role: '기획조정실 CFO', number: '02' },
  legaly: { name: 'Legaly', floor: '9F', role: '기획조정실 법무', number: '03' },
  skepty: { name: 'Skepty', floor: '8F', role: '리스크챌린지실', number: '04' },
  audity: { name: 'Audity', floor: '8F', role: '감사실', number: '05' },
  pixely: { name: 'Pixely', floor: '7F', role: 'UI/UX 디자이너', number: '06' },
  buildy: { name: 'Buildy', floor: '7F', role: '백엔드 개발자', number: '07' },
  testy: { name: 'Testy', floor: '7F', role: 'QA', number: '08' },
  buzzy: { name: 'Buzzy', floor: '6F', role: '바이럴 전략가', number: '09' },
  wordy: { name: 'Wordy', floor: '6F', role: '카피라이터', number: '10' },
  edity: { name: 'Edity', floor: '6F', role: '영상 편집자', number: '11' },
  searchy: { name: 'Searchy', floor: '6F', role: 'SEO/AEO', number: '12' },
  growthy: { name: 'Growthy', floor: '5F', role: '그로스해커', number: '13' },
  logoy: { name: 'Logoy', floor: '5F', role: '브랜드 디자이너', number: '14' },
  helpy: { name: 'Helpy', floor: '5F', role: '고객지원', number: '15' },
  clicky: { name: 'Clicky', floor: '5F', role: 'UX 리서처', number: '16' },
  selly: { name: 'Selly', floor: '5F', role: '세일즈', number: '17' },
  stacky: { name: 'Stacky', floor: '4F', role: '인프라/DevOps', number: '18' },
  watchy: { name: 'Watchy', floor: '4F', role: 'SRE', number: '19' },
  guardy: { name: 'Guardy', floor: '4F', role: '보안', number: '20' },
  hiry: { name: 'Hiry', floor: '3F', role: '채용', number: '21' },
  evaly: { name: 'Evaly', floor: '3F', role: '성과평가', number: '22' },
  quanty: { name: 'Quanty', floor: '2F', role: '퀀트', number: '23' },
  tradey: { name: 'Tradey', floor: '2F', role: '트레이더', number: '24' },
  globy: { name: 'Globy', floor: '2F', role: '매크로 리서처', number: '25' },
  fieldy: { name: 'Fieldy', floor: '2F', role: '섹터 애널리스트', number: '26' },
  hedgy: { name: 'Hedgy', floor: '2F', role: '리스크 헤저', number: '27' },
  valuey: { name: 'Valuey', floor: '2F', role: '밸류에이션', number: '28' },
  opsy: { name: 'Opsy', floor: '1F', role: '운영', number: '29' },
  counsely: { name: 'Counsely', floor: '10F', role: '비서실장', number: '30' },
};

// Auto-detect which agents should join based on topic
const TOPIC_AGENTS: Record<string, string[]> = {
  market: ['searchy', 'quanty', 'globy', 'skepty', 'growthy', 'tasky'],
  product: ['buildy', 'pixely', 'testy', 'tasky', 'growthy', 'buzzy'],
  crisis: ['skepty', 'audity', 'guardy', 'watchy', 'legaly', 'tasky'],
  investment: ['quanty', 'valuey', 'fieldy', 'hedgy', 'finy', 'skepty'],
  launch: ['buzzy', 'wordy', 'selly', 'growthy', 'searchy', 'tasky'],
  hiring: ['hiry', 'evaly', 'tasky', 'finy', 'legaly'],
  security: ['guardy', 'stacky', 'watchy', 'audity', 'legaly'],
  content: ['buzzy', 'wordy', 'edity', 'searchy', 'logoy', 'growthy'],
  general: ['tasky', 'skepty', 'finy', 'buildy', 'growthy'],
};

function detectTopic(agenda: string): string {
  const lower = agenda.toLowerCase();
  const keywords: Record<string, string[]> = {
    market: ['시장', '경쟁', '경쟁사', 'market', '점유율'],
    product: ['제품', '개발', '기능', 'product', 'MVP', '프로토타입'],
    crisis: ['위기', '장애', '사고', 'crisis', '해킹', '유출'],
    investment: ['투자', '인수', 'M&A', '펀딩', '밸류에이션'],
    launch: ['런칭', '출시', 'launch', '마케팅', '캠페인'],
    hiring: ['채용', '인력', 'hiring', '퇴사', '인사'],
    security: ['보안', '해킹', 'security', '취약점'],
    content: ['콘텐츠', '영상', 'content', '바이럴', 'SNS'],
  };
  for (const [type, words] of Object.entries(keywords)) {
    if (words.some(w => lower.includes(w))) return type;
  }
  return 'general';
}

async function getAgentResponse(
  agentId: string,
  agenda: string,
  conversation: { speaker: string; message: string }[],
  chairmanMessage?: string
): Promise<string> {
  const persona = agentPersonas[agentId];
  if (!persona) return '';

  const meta = AGENT_META[agentId];
  const convContext = conversation.length > 0
    ? `\n\n## 지금까지의 회의 내용:\n${conversation.map(c => `${c.speaker}: ${c.message}`).join('\n')}`
    : '';

  const chairmanContext = chairmanMessage
    ? `\n\n##  회장님 발언 (최우선):\n회장: ${chairmanMessage}\n→ 회장님 의견에 반응하고 답변하세요.`
    : '';

  const systemPrompt = `${SYSTEM_PROMPT_PREFIX}\n\n${persona}

## 회의 모드
당신은 _y Holdings의 ${meta?.role || agentId}입니다. 지금 회의 중입니다.
- 한국어로 답변하세요
- 당신의 전문 분야 관점에서 의견을 말하세요
- 이전 발언자의 의견을 참고하되, 동의만 하지 말고 새로운 관점을 추가하세요
- 반대 의견이 있으면 공손하지만 명확하게 말하세요
- 2-3문장으로 간결하게
- 구체적인 수치, 방법론, 도구를 언급하세요
- 마지막에 한 줄 액션 아이템을 제시하세요
- 당신의 말투와 성격을 유지하세요${convContext}${chairmanContext}`;

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: `회의 안건: ${agenda}\n\n당신의 의견을 말씀해주세요.` }] }],
      generationConfig: { maxOutputTokens: 500, temperature: 0.85, thinkingConfig: { thinkingBudget: 0 } },
    }),
  });

  if (!response.ok) return '(응답 실패)';
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '(응답 없음)';
}

export async function POST(req: NextRequest) {
  try {
    const { agenda, agents: forceAgents, chairmanMessage, conversation } = await req.json();

    if (!agenda) {
      return new Response(JSON.stringify({ error: 'Missing agenda' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const topic = detectTopic(agenda);
    const agentIds = forceAgents || TOPIC_AGENTS[topic] || TOPIC_AGENTS.general;

    // Stream responses using SSE
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const conv: { speaker: string; message: string }[] = conversation || [];

        // Send meeting start
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'meeting_start',
          topic,
          agenda,
          participants: agentIds.map((id: string) => ({
            id,
            ...AGENT_META[id],
          })),
        })}\n\n`));

        // Each agent speaks
        for (const agentId of agentIds) {
          const meta = AGENT_META[agentId];
          if (!meta) continue;

          // Send typing indicator
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'typing',
            agentId,
            agentName: meta.name,
          })}\n\n`));

          const response = await getAgentResponse(agentId, agenda, conv, chairmanMessage);

          conv.push({ speaker: `${meta.name}(${meta.role})`, message: response });

          // Send agent's response
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({
            type: 'message',
            agentId,
            agentName: meta.name,
            number: meta.number,
            floor: meta.floor,
            role: meta.role,
            message: response,
          })}\n\n`));
        }

        // Generate summary
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'summarizing',
        })}\n\n`));

        const summaryPrompt = `회의 안건: ${agenda}\n\n회의 내용:\n${conv.map(c => `${c.speaker}: ${c.message}`).join('\n')}\n\n위 회의를 종합하여:\n1. 핵심 합의사항 (2줄)\n2. 즉시 실행 액션 아이템 Top 3\n3. 미결 이슈 (있으면)\n\n한국어로 간결하게 작성하세요.`;

        const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
        const summaryRes = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: summaryPrompt }] }],
            generationConfig: { maxOutputTokens: 600, temperature: 0.7, thinkingConfig: { thinkingBudget: 0 } },
          }),
        });

        let summary = '';
        if (summaryRes.ok) {
          const sData = await summaryRes.json();
          summary = sData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        }

        // Send meeting end with summary
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({
          type: 'meeting_end',
          summary,
          conversation: conv,
        })}\n\n`));

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Meeting API error:', error);
    return new Response(JSON.stringify({ error: 'Meeting failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
