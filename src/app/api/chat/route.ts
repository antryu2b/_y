import { NextRequest, NextResponse } from 'next/server';
import { agentPersonas, SYSTEM_PROMPT_PREFIX } from '@/data/personas';
import { saveMessage, getConversationHistory, enqueueChat, getBackendType } from '@/lib/db';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const CHAT_QUEUE_MODE = process.env.CHAT_QUEUE_MODE === 'true';

const AGENT_MBTI: Record<string, string> = {
  tasky:'ENTJ',finy:'ISTJ',legaly:'INTJ',skepty:'INTP',audity:'ISFJ',
  pixely:'ENFP',buildy:'ISTP',testy:'ISTJ',buzzy:'ESFP',wordy:'INFP',
  edity:'ISTP',searchy:'INTJ',growthy:'ENTP',logoy:'ISFP',helpy:'ESFJ',
  clicky:'INFJ',selly:'ESTP',stacky:'ISTJ',watchy:'ISTJ',guardy:'INTJ',
  hiry:'ENFJ',evaly:'ISTJ',quanty:'INTJ',tradey:'ESTP',globy:'INFJ',
  fieldy:'INTP',hedgy:'ISFJ',valuey:'INTJ',opsy:'ESFJ',counsely:'ENFJ',
};

function getPersonalityBoost(agentId: string): string {
  const mbti = AGENT_MBTI[agentId] || '';
  return `\n\n## Personality\n- MBTI: ${mbti}. Stay in character. Show quirks and weaknesses naturally.`;
}

async function buildSystemPrompt(agentId: string, context: unknown, lang: string) {
  const persona = agentPersonas[agentId];
  if (!persona) throw new Error('Unknown agent');
  const langNote = lang === 'en' ? '\nRespond in English.' : '\nRespond in Korean (except proper nouns).';
  const ctxBlock = context ? `\n\n## Context\n${JSON.stringify(context)}` : '';
  return `${SYSTEM_PROMPT_PREFIX}\n\n${persona}${getPersonalityBoost(agentId)}${ctxBlock}${langNote}`;
}

async function callOllama(sys: string, msg: string, hist: Array<{role:string;content:string}>) {
  const messages = [{ role: 'system', content: sys }, ...(hist||[]).slice(-10).map(h=>({role:h.role==='assistant'?'assistant':'user',content:h.content})), { role: 'user', content: msg }];
  try {
    const r = await fetch(`${OLLAMA_URL}/api/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({model:OLLAMA_MODEL,messages,stream:false}) });
    if (!r.ok) return null; const d = await r.json(); return d.message?.content || null;
  } catch { return null; }
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, message, history, lang = 'ko', context } = await req.json();
    if (!agentId || !message) return NextResponse.json({ error: 'Missing agentId or message' }, { status: 400 });
    if (!agentPersonas[agentId]) return NextResponse.json({ error: 'Unknown agent' }, { status: 404 });
    if (CHAT_QUEUE_MODE) {
      const item = await enqueueChat(agentId, message);
      return NextResponse.json({ queueId: item?.id, status: 'pending' });
    }
    const sys = await buildSystemPrompt(agentId, context, lang);
    const dbHist = await getConversationHistory(agentId, 10);
    const full = [...dbHist.map((h:Record<string,unknown>)=>({role:h.role as string,content:h.content as string})),...(history||[])].slice(-10);
    const reply = await callOllama(sys, message, full);
    if (!reply) return NextResponse.json({ error: 'No LLM available. Make sure Ollama is running, or set CHAT_QUEUE_MODE=true to use the worker.' }, { status: 503 });
    await saveMessage(agentId, 'user', message);
    await saveMessage(agentId, 'assistant', reply);
    return NextResponse.json({ reply, backend: getBackendType() });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Failed to get response' }, { status: 500 });
  }
}
export async function GET(req: NextRequest) {
  const queueId = new URL(req.url).searchParams.get('id');
  if (!queueId) return NextResponse.json({ error: 'Missing queue id' }, { status: 400 });
  return NextResponse.json({ status: 'pending', message: 'Check back soon' });
}
