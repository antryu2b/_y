import { NextRequest, NextResponse } from 'next/server';

// In-memory store (resets on deploy, but that's fine for a demo)
const memoryStore: Map<string, { observations: any[]; reflections: string[] }> = new Map();

export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get('agentId');
  if (!agentId) {
    return NextResponse.json({ error: 'Missing agentId' }, { status: 400 });
  }

  const memory = memoryStore.get(agentId) || { observations: [], reflections: [] };
  return NextResponse.json(memory);
}

export async function POST(req: NextRequest) {
  try {
    const { agentId, observation, type } = await req.json();
    if (!agentId || !observation) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    if (!memoryStore.has(agentId)) {
      memoryStore.set(agentId, { observations: [], reflections: [] });
    }

    const mem = memoryStore.get(agentId)!;
    mem.observations.push({
      timestamp: Date.now(),
      description: observation,
      importance: Math.floor(Math.random() * 5) + 3,
      type: type || 'observation',
    });

    // Keep last 100
    if (mem.observations.length > 100) {
      mem.observations = mem.observations.slice(-100);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
