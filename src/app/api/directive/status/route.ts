import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const directiveId = searchParams.get('id');
    if (!directiveId) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();

    // Get directive
    const directive = db.prepare('SELECT * FROM decisions WHERE id = ?').get(directiveId) as Record<string, unknown> | undefined;
    if (!directive) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Get chat_queue tasks for this directive
    const tasks = db.prepare(
      "SELECT id, agent_id, status, model, created_at, processed_at FROM chat_queue WHERE metadata LIKE ?"
    ).all(`%"directive_id":"${directiveId}"%`) as Record<string, unknown>[];

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const processing = tasks.filter(t => t.status === 'processing').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const errors = tasks.filter(t => t.status === 'error').length;

    return NextResponse.json({
      directive: {
        id: directive.id,
        title: directive.title,
        status: directive.status,
        progress: directive.progress ? JSON.parse(directive.progress as string) : null,
      },
      tasks: tasks.map(t => ({
        id: t.id,
        agent_id: t.agent_id,
        status: t.status,
        model: t.model,
      })),
      summary: { total, completed, processing, pending, errors },
      allDone: total > 0 && completed === total,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
