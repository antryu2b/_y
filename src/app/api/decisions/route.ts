import { isDemoMode, DEMO_DECISIONS } from '../../../lib/demo-data';
import { NextRequest, NextResponse } from 'next/server';
import { getDecisions, saveDecision, updateDecision } from '@/lib/db';
import { getDb } from '@/lib/sqlite';

export async function GET(req: NextRequest) {
  if (isDemoMode()) return Response.json(DEMO_DECISIONS);
  const status = req.nextUrl.searchParams.get('status') || undefined;
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '20');
  const decisions = await getDecisions(status, limit);
  return NextResponse.json({ decisions });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const decision = await saveDecision(body);
  return NextResponse.json(decision, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const result = await updateDecision(id, updates);
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getDb();
    db.prepare('DELETE FROM decisions WHERE id = ?').run(id);
    db.prepare('DELETE FROM directives WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
