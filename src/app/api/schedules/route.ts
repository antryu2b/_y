import { isDemoMode, DEMO_SCHEDULES } from '../../../lib/demo-data';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';

export async function GET() {
  if (isDemoMode()) return Response.json(DEMO_SCHEDULES);
  const db = getDb();
  const schedules = db.prepare('SELECT * FROM schedules ORDER BY schedule_value ASC').all();
  return NextResponse.json({ schedules });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { name, agent_id, schedule_type, schedule_value, prompt, channel } = body;
  if (!name || !prompt) return NextResponse.json({ error: 'name and prompt required' }, { status: 400 });
  const db = getDb();
  db.prepare('INSERT INTO schedules (id, name, agent_id, schedule_type, schedule_value, prompt, channel) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)')
    .run(name, agent_id || '', schedule_type || 'daily', schedule_value || '09:00', prompt, channel || '');
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, enabled, name, schedule_value, prompt } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getDb();
  if (typeof enabled === 'number') db.prepare('UPDATE schedules SET enabled = ? WHERE id = ?').run(enabled, id);
  if (name) db.prepare('UPDATE schedules SET name = ? WHERE id = ?').run(name, id);
  if (schedule_value) db.prepare('UPDATE schedules SET schedule_value = ? WHERE id = ?').run(schedule_value, id);
  if (prompt) db.prepare('UPDATE schedules SET prompt = ? WHERE id = ?').run(prompt, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM schedules WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
