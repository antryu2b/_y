import { NextRequest, NextResponse } from 'next/server';
import { updateDecision } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { id, action, notes } = await req.json();
  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });
  
  const statusMap: Record<string, string> = {
    approve: 'approved', reject: 'rejected', defer: 'deferred', escalate: 'escalated'
  };
  const status = statusMap[action] || action;
  const result = await updateDecision(id, { status, review_notes: notes || null });
  return NextResponse.json(result);
}
