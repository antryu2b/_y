import { isDemoMode, DEMO_COMPANIES } from '../../../lib/demo-data';
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/sqlite';

export async function GET() {
  if (isDemoMode()) return Response.json(DEMO_COMPANIES);
  const db = getDb();
  const companies = db.prepare('SELECT * FROM connected_companies ORDER BY connected_at DESC').all();
  return NextResponse.json({ companies: companies.map((c: any) => ({
    ...c,
    agents: JSON.parse(c.agents || '[]'),
  }))});
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { company_name, industry, description, url, agents } = body;
  if (!company_name) return NextResponse.json({ error: 'company_name required' }, { status: 400 });

  const db = getDb();
  // Check for duplicates
  const existing = db.prepare('SELECT id FROM connected_companies WHERE company_name = ?').get(company_name);
  if (existing) return NextResponse.json({ ok: true, existing: true });

  db.prepare('INSERT INTO connected_companies (company_name, industry, description, url, agents) VALUES (?, ?, ?, ?, ?)')
    .run(company_name, industry || '', description || '', url || '', JSON.stringify(agents || []));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const db = getDb();
  db.prepare('DELETE FROM connected_companies WHERE id = ?').run(id);
  return NextResponse.json({ ok: true });
}
