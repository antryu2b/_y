import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';

export async function POST(req: NextRequest) {
  try {
    const { directiveId } = await req.json();
    if (!directiveId) return NextResponse.json({ error: 'directiveId required' }, { status: 400 });

    const db = getDb();

    // 1. Get the directive
    const directive = db.prepare('SELECT * FROM decisions WHERE id = ?').get(directiveId) as Record<string, unknown> | undefined;
    if (!directive) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // 2. Get completed agent responses from chat_queue
    const qItems = db.prepare(
      "SELECT agent_id, response, status, model FROM chat_queue WHERE status = 'done' AND metadata LIKE ?"
    ).all(`%"directive_id":"${directiveId}"%`) as { agent_id: string; response: string; status: string; model: string }[];

    if (qItems.length === 0) {
      return NextResponse.json({ error: 'No completed responses yet' }, { status: 400 });
    }

    // 3. Build formatted report content
    const sections = qItems.map(q => {
      const agentName = q.agent_id.charAt(0).toUpperCase() + q.agent_id.slice(1);
      return `## ${agentName}\n\n${q.response || 'No response'}\n`;
    }).join('\n---\n\n');

    const reportContent = `# ${directive.title}\n\n${directive.description || ''}\n\n---\n\n${sections}`;

    // 4. Insert as report
    const reportId = crypto.randomUUID();
    db.prepare(
      'INSERT INTO reports (id, agent_id, title, content, report_type, status, directive_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      reportId,
      'counsely',
      `\ud83d\udccb ${directive.title}`,
      reportContent,
      'directive_report',
      'pending',
      directiveId
    );

    // 5. Update directive status to completed
    db.prepare(
      "UPDATE decisions SET status = 'completed', updated_at = datetime('now') WHERE id = ?"
    ).run(directiveId);

    return NextResponse.json({
      success: true,
      report: { id: reportId, title: `\ud83d\udccb ${directive.title}`, report_type: 'directive_report' },
      agentCount: qItems.length,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
