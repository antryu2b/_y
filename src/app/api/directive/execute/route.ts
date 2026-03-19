import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';
import { getAgentLLM } from '@/lib/llm-profile';
import { agentPersonas, SYSTEM_PROMPT_PREFIX } from '@/data/personas';

export async function POST(req: NextRequest) {
  try {
    const { directiveId, chairmanNote } = await req.json();
    if (!directiveId) {
      return NextResponse.json({ error: 'directiveId is required' }, { status: 400 });
    }

    const db = getDb();

    // 1. Fetch the directive from decisions table
    const directive = db.prepare('SELECT * FROM decisions WHERE id = ?').get(directiveId) as Record<string, unknown> | undefined;
    if (!directive) {
      return NextResponse.json({ error: 'Directive not found' }, { status: 404 });
    }

    // 2. Get assigned agents from trigger_data.assignees
    let assignedAgents: string[] = [];
    if (directive.trigger_data) {
      try {
        const triggerData = JSON.parse(directive.trigger_data as string);
        if (triggerData.assignees && Array.isArray(triggerData.assignees)) {
          assignedAgents = triggerData.assignees;
        }
      } catch {}
    }

    if (assignedAgents.length === 0) {
      return NextResponse.json({ error: 'No agents assigned to this directive' }, { status: 400 });
    }

    // 3. Prepare the directive message
    const directiveMessage = [
      `**[DIRECTIVE] from the Chairman of the Board**`,
      `Title: ${directive.title}`,
      directive.description ? `Description: ${directive.description}` : '',
      chairmanNote ? `Chairman's Note: ${chairmanNote}` : '',
      ``,
      `INSTRUCTIONS:`,
      `- Analyze this directive using YOUR specific expertise and role.`,
      `- Do NOT introduce yourself or describe your skills.`,
      `- Provide concrete analysis, findings, data points, and actionable recommendations.`,
      `- Write in the language matching the directive title (Korean title → Korean report, English title → English report).`,
      `- Structure your response with clear sections: Background, Analysis, Findings, Recommendations.`,
      `- Be specific and substantive — the Chairman expects expert-level insight, not generic overviews.`,
    ].filter(Boolean).join('\n');

    // 4. Insert chat_queue items for each assigned agent
    const tasksCreated: { agent_id: string; queue_id: number | bigint; model: string }[] = [];
    const insertStmt = db.prepare(
      'INSERT INTO chat_queue (agent_id, message, system_prompt, model, status, metadata) VALUES (?, ?, ?, ?, ?, ?)'
    );

    for (const agentId of assignedAgents) {
      try {
        const llmConfig = getAgentLLM(agentId);
        const modelString = `${llmConfig.provider}:${llmConfig.model}`;
        const systemPrompt = agentPersonas[agentId]
          ? `${SYSTEM_PROMPT_PREFIX}\n\n${agentPersonas[agentId]}`
          : `You are ${agentId}, an AI agent at _y Holdings.`;

        const metadata = JSON.stringify({
          directive_id: directiveId,
          type: 'directive_task',
        });

        const result = insertStmt.run(
          agentId,
          directiveMessage,
          systemPrompt,
          modelString,
          'pending',
          metadata
        );

        tasksCreated.push({
          agent_id: agentId,
          queue_id: result.lastInsertRowid,
          model: modelString,
        });
      } catch (error) {
        console.error(`Failed to create task for agent ${agentId}:`, error);
      }
    }

    // 5. Update directive status to in_progress
    const progressData = JSON.stringify({
      total: assignedAgents.length,
      completed: 0,
      agent_results: {},
    });

    db.prepare(
      "UPDATE decisions SET status = 'in_progress', progress = ?, updated_at = datetime('now') WHERE id = ?"
    ).run(progressData, directiveId);

    return NextResponse.json({
      success: true,
      tasksCreated: tasksCreated.length,
      assignedAgents,
      tasks: tasksCreated,
    });
  } catch (error) {
    console.error('Directive execute API error:', error);
    return NextResponse.json(
      { error: 'Failed to execute directive', details: String(error) },
      { status: 500 }
    );
  }
}
