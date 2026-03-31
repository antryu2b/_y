import { NextRequest, NextResponse } from 'next/server';
import { saveReport } from '@/lib/db';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function extractActionItemsViaOllama(summary: string): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        messages: [
          {
            role: 'system',
            content: 'You are a meeting action-item extractor. Given a meeting summary, extract specific action items as a numbered list. Each item should include: assignee (if mentioned), task description, and deadline (if mentioned). Reply ONLY with the numbered list.',
          },
          { role: 'user', content: `Extract action items from this meeting summary:\n\n${summary}` },
        ],
        stream: false,
        options: { temperature: 0.2 },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.message?.content || null;
  } catch {
    return null;
  }
}

async function extractActionItemsViaGemini(summary: string): Promise<string | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: {
          parts: [
            {
              text: 'You are a meeting action-item extractor. Given a meeting summary, extract specific action items as a numbered list. Each item should include: assignee (if mentioned), task description, and deadline (if mentioned). Reply ONLY with the numbered list.',
            },
          ],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: `Extract action items from this meeting summary:\n\n${summary}` }],
          },
        ],
        generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { summary, meetingId, agentId } = await req.json();

    if (!summary) {
      return NextResponse.json({ error: 'Missing summary' }, { status: 400 });
    }

    // Extract action items: Ollama first, Gemini fallback
    let actionItems = await extractActionItemsViaOllama(summary);
    if (!actionItems) {
      actionItems = await extractActionItemsViaGemini(summary);
    }
    if (!actionItems) {
      // Last resort: no LLM available, just note it
      actionItems = '(No LLM available to extract action items)';
    }

    // Build report content with action item markers
    const content = `${summary}\n\n<!-- ACTION_ITEMS -->\n${actionItems}\n<!-- /ACTION_ITEMS -->`;

    const report = await saveReport(
      agentId || 'counsely',
      'Meeting Summary & Action Items',
      content,
      'meeting_summary',
      meetingId
    );

    return NextResponse.json({
      id: report?.id,
      actionItems,
      status: 'saved',
    });
  } catch (error) {
    console.error('Meeting save error:', error);
    return NextResponse.json(
      { error: 'Failed to save meeting' },
      { status: 500 }
    );
  }
}
