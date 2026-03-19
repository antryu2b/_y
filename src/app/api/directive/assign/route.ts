import { NextRequest, NextResponse } from 'next/server';
import { AGENT_ROSTER } from '@/data/agent-config';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_ASSIGN_MODEL || 'qwen2.5:7b';

const AGENT_LIST = AGENT_ROSTER.map(a => `- ${a.id}: ${a.name} (${a.desc})`).join('\n');

export async function POST(req: NextRequest) {
  try {
    const { title, description } = await req.json();
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 });

    const prompt = `You are Counsely, Chief of Staff at _y Holdings. The Chairman has issued a directive. Analyze it and assign the most appropriate agents.

DIRECTIVE:
Title: ${title}
${description ? `Description: ${description}` : ''}

AVAILABLE AGENTS:
${AGENT_LIST}

RULES:
- Assign 3-5 agents (no fewer than 3, no more than 5)
- Always include yourself (counsely) for synthesis
- Pick agents whose expertise matches the directive
- For each agent, specify their task in 3-5 words
- Consider multiple perspectives: research, risk, financial impact, strategy

Respond ONLY in this exact JSON format, no other text:
{"agents":[{"id":"agent_id","task":"brief task description"}]}`;

    try {
      const res = await fetch(`${OLLAMA_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          options: { temperature: 0.3 },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = data.response || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.agents && Array.isArray(parsed.agents) && parsed.agents.length > 0) {
            const validIds = new Set(AGENT_ROSTER.map(a => a.id));
            const validAgents = parsed.agents.filter((a: { id: string }) => validIds.has(a.id));
            if (validAgents.length >= 2) {
              if (validAgents.length < 3 && !validAgents.find((a: { id: string }) => a.id === 'counsely')) {
                validAgents.push({ id: 'counsely', task: 'Synthesis & briefing' });
              }
              return NextResponse.json({ agents: validAgents, source: 'ollama' });
            }
          }
        }
      }
    } catch (e) {
      console.error('Ollama assign error:', e);
    }

    // Fallback: keyword-based assignment
    return NextResponse.json({ agents: fallbackAssign(title, description || ''), source: 'fallback' });
  } catch {
    return NextResponse.json({ agents: fallbackAssign('', ''), source: 'fallback' });
  }
}

function fallbackAssign(title: string, desc: string): { id: string; task: string }[] {
  const text = `${title} ${desc}`.toLowerCase();
  const agents: { id: string; task: string }[] = [];
  if (/시장|market|트렌드|trend|분석|analy|조사|research/.test(text)) agents.push({ id: 'searchy', task: 'Research' });
  if (/투자|invest|매매|trad|자산|asset/.test(text)) agents.push({ id: 'quanty', task: 'Analysis' }, { id: 'finy', task: 'Financial review' });
  if (/리스크|risk|위험|보안|security/.test(text)) agents.push({ id: 'skepty', task: 'Risk assessment' });
  if (/마케팅|marketing|콘텐츠|content/.test(text)) agents.push({ id: 'buzzy', task: 'Marketing' });
  if (/개발|develop|빌드|build/.test(text)) agents.push({ id: 'buildy', task: 'Development' });
  if (/전쟁|war|지정학|경제|econom|글로벌|global/.test(text)) agents.push({ id: 'searchy', task: 'Research' }, { id: 'quanty', task: 'Impact analysis' });
  if (!agents.find(a => a.id === 'counsely')) agents.push({ id: 'counsely', task: 'Synthesis' });
  if (agents.length < 3) {
    if (!agents.find(a => a.id === 'skepty')) agents.push({ id: 'skepty', task: 'Risk assessment' });
    if (agents.length < 3 && !agents.find(a => a.id === 'searchy')) agents.push({ id: 'searchy', task: 'Research' });
  }
  return agents.filter((a, i, arr) => arr.findIndex(b => b.id === a.id) === i).slice(0, 5);
}
