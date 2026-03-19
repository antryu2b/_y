import { NextRequest, NextResponse } from 'next/server';
import { getBackendType } from '@/lib/db';

interface CheckResult { name: string; status: 'ok' | 'warn' | 'error'; latencyMs: number; detail?: string; }

async function checkEndpoint(name: string, url: string, options?: RequestInit): Promise<CheckResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, { ...options, signal: AbortSignal.timeout(10000) });
    const latencyMs = Date.now() - start;
    return res.ok || res.status === 400 ? { name, status: 'ok', latencyMs } : { name, status: 'warn', latencyMs, detail: `HTTP ${res.status}` };
  } catch (e) { return { name, status: 'error', latencyMs: Date.now() - start, detail: String(e) }; }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const baseUrl = new URL(req.url).origin;
  const backend = getBackendType();
  const checks: CheckResult[] = [];

  // SQLite health check
  try {
    const { getDb } = await import('@/lib/sqlite');
    const start = Date.now(); const db = getDb(); db.prepare('SELECT 1').get();
    checks.push({ name: 'sqlite_connection', status: 'ok', latencyMs: Date.now() - start });
  } catch (e) { checks.push({ name: 'sqlite_connection', status: 'error', latencyMs: 0, detail: String(e) }); }

  const apiChecks = await Promise.all([
    checkEndpoint('chat_api', `${baseUrl}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentId: 'opsy', message: 'ping' }) }),
    checkEndpoint('directives_api', `${baseUrl}/api/directives`),
  ]);
  checks.push(...apiChecks);

  // Ollama check
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
  checks.push(await checkEndpoint('ollama', `${ollamaUrl}/api/tags`));

  const totalMs = Date.now() - startTime;
  const okCount = checks.filter(c => c.status === 'ok').length;
  const errorCount = checks.filter(c => c.status === 'error').length;
  const warnCount = checks.filter(c => c.status === 'warn').length;

  return NextResponse.json({
    overall: errorCount > 0 ? 'degraded' : warnCount > 0 ? 'warning' : 'healthy',
    backend, timestamp: new Date().toISOString(), totalMs,
    summary: { ok: okCount, warn: warnCount, error: errorCount, total: checks.length },
    checks, operator: 'Watchy (#19)',
  });
}
