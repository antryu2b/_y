import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';

// Guess decision type from directive content
function guessDecisionType(title: string, desc: string): string {
  const text = `${title} ${desc}`.toLowerCase();
  if (/\ud22c\uc790|\ub9e4\ub9e4|\ud3ec\uc9c0\uc158|\ub9e4\uc218|\ub9e4\ub3c4|trading/.test(text)) return 'investment';
  if (/\uac1c\ubc1c|\ube4c\ub4dc|\ubc30\ud3ec|\ucf54\ub4dc|ui|api|\ubc84\uadf8/.test(text)) return 'product_development';
  if (/\ucf58\ud150\uce20|\uae00|\ud3ec\uc2a4\ud2b8|sns|x|\ud2b8\uc704\ud130|\ube14\ub85c\uadf8/.test(text)) return 'content_publish';
  if (/\ub9c8\ucf00\ud305|\ud64d\ubcf4|seo|\uad11\uace0/.test(text)) return 'content_publish';
  if (/\ucc44\uc6a9|\uc778\uc7ac|\uc678\uc8fc/.test(text)) return 'hiring';
  if (/\uc7a5\uc560|\uc11c\ubc84|\ubaa8\ub2c8\ud130\ub9c1|\ubcf4\uc548/.test(text)) return 'ops_incident';
  if (/\ub9ac\uc2a4\ud06c|\uc704\ud5d8|\uac10\uc0ac/.test(text)) return 'risk_alert';
  if (/\uc2dc\uc7a5|\ub274\uc2a4|\ud2b8\ub80c\ub4dc|\uacbd\uc7c1/.test(text)) return 'market_response';
  return 'strategy';
}

export async function GET() {
  try {
    const db = getDb();
    // Return directives from both the directives table and decisions with trigger_source='directive'
    const directives = db.prepare(
      "SELECT * FROM directives ORDER BY created_at DESC LIMIT 50"
    ).all() as Record<string, unknown>[];

    const parsed = directives.map(d => ({
      ...d,
      assignees: JSON.parse((d.assignees as string) || '[]'),
      parsed: {
        description: d.content || '',
        assignees: JSON.parse((d.assignees as string) || '[]'),
      },
    }));

    // Also fetch directive decisions
    const decisions = db.prepare(
      "SELECT * FROM decisions WHERE trigger_source = 'directive' ORDER BY created_at DESC LIMIT 50"
    ).all() as Record<string, unknown>[];

    return NextResponse.json({ directives: parsed, decisions });
  } catch {
    return NextResponse.json({ directives: [], decisions: [] });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, assignees, priority } = body;
    if (!title) return NextResponse.json({ error: 'Title required' }, { status: 400 });

    const db = getDb();
    const assigneeIds = (assignees || []).map((a: { id: string }) => a.id);
    const decisionType = guessDecisionType(title, description || '');
    const id = crypto.randomUUID();

    // Create decision entry (the main record for the directive pipeline)
    db.prepare(
      `INSERT INTO decisions (id, type, title, description, priority, status, trigger_source, trigger_agent_id, trigger_data, progress)
       VALUES (?, ?, ?, ?, ?, 'pending', 'directive', 'chairman', ?, ?)`
    ).run(
      id,
      decisionType,
      title,
      description || title,
      priority || 'normal',
      JSON.stringify({ assignees: assigneeIds }),
      JSON.stringify({ total: assigneeIds.length, completed: 0, agent_results: {} })
    );

    // Also save to directives table for backward compat
    db.prepare(
      'INSERT INTO directives (id, title, content, assignees, priority) VALUES (?, ?, ?, ?, ?)'
    ).run(id, title, description || '', JSON.stringify(assignees || []), priority || 'normal');

    const directive = {
      id, title, description: description || title,
      type: decisionType, status: 'pending', priority: priority || 'normal',
      trigger_source: 'directive', trigger_agent_id: 'chairman',
      trigger_data: { assignees: assigneeIds },
    };

    return NextResponse.json({ directive });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status } = body;
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db = getDb();
    if (status) {
      db.prepare("UPDATE directives SET status = ? WHERE id = ?").run(status, id);
      db.prepare("UPDATE decisions SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
    }
    return NextResponse.json({ id, status });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
