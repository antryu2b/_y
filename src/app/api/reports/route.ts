import { isDemoMode, DEMO_REPORTS } from '../../../lib/demo-data';
import { NextRequest, NextResponse } from 'next/server';
import { getReports, saveReport, updateReportStatus } from '@/lib/db';

export async function GET(req: NextRequest) {
  if (isDemoMode()) return Response.json(DEMO_REPORTS);
  try {
    const url = new URL(req.url);
    const agentId = url.searchParams.get('agent_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const reports = await getReports(limit);
    const filtered = agentId
      ? (reports as any[]).filter((r: any) => r.agent_id === agentId)
      : (reports as any[]).filter((r: any) => r.report_type !== 'health_check' && r.report_type !== 'directive' && r.agent_id !== 'chairman');
    return NextResponse.json(filtered);
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agent_id, title, content, report_type = 'general', meeting_id } = body;
    if (!agent_id || !title) {
      return NextResponse.json({ error: 'Missing agent_id or title' }, { status: 400 });
    }
    await saveReport(agent_id, title, content || '', report_type, meeting_id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Reports POST error:', error);
    return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { id, status } = await req.json();
    if (!id || !status) return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    await updateReportStatus(id, status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
  }
}
