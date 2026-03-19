import { NextRequest, NextResponse } from 'next/server';
import { getConversationHistory } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    if (!agentId) return NextResponse.json({ error: 'Missing agent_id' }, { status: 400 });
    const history = await getConversationHistory(agentId, limit);
    return NextResponse.json(history);
  } catch (error) {
    console.error('Conversations API error:', error);
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 });
  }
}
