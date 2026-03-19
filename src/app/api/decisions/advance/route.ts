import { NextRequest, NextResponse } from 'next/server';
import { updateDecision } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { id, notes } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const result = await updateDecision(id, { status: 'in_review', review_notes: notes || null });
  return NextResponse.json(result);
}
