/**
 * PostgreSQL adapter for _y Company
 * Implements same interface pattern as sqlite.ts
 * Uses dynamic import so build passes even without pg installed
 */

let _pool: any = null;
let _pg: any = null;

function getPg() {
  if (!_pg) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      _pg = require('pg');
    } catch {
      throw new Error(
        'pg package not installed. Run: npm install pg @types/pg'
      );
    }
  }
  return _pg;
}

export function getDb() {
  if (!_pool) {
    const { Pool } = getPg();
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required for PostgreSQL');
    }
    _pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

let _initialized = false;

async function ensureTables(): Promise<void> {
  if (_initialized) return;
  const pool = getDb();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      topic TEXT NOT NULL,
      topic_type TEXT,
      participants TEXT DEFAULT '[]',
      messages TEXT DEFAULT '[]',
      summary TEXT,
      action_items TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      report_type TEXT DEFAULT 'general',
      meeting_id TEXT,
      directive_id TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS agent_memory (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 5,
      source_id TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_queue (
      id SERIAL PRIMARY KEY,
      agent_id TEXT NOT NULL,
      message TEXT NOT NULL,
      system_prompt TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'done', 'error')),
      response TEXT,
      model TEXT,
      metadata TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      processed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'general',
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      source_agent TEXT,
      trigger_source TEXT,
      trigger_agent_id TEXT,
      trigger_data TEXT,
      progress TEXT,
      analysis TEXT,
      verification TEXT,
      counsel_summary TEXT,
      final_decision TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS directives (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      assignees TEXT DEFAULT '[]',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      reviewed_at TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS trades (
      id SERIAL PRIMARY KEY,
      symbol TEXT,
      direction TEXT,
      entry_price DOUBLE PRECISION,
      exit_price DOUBLE PRECISION,
      pnl DOUBLE PRECISION,
      status TEXT DEFAULT 'open',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      name TEXT NOT NULL,
      agent_id TEXT,
      schedule_type TEXT DEFAULT 'interval',
      schedule_value TEXT NOT NULL,
      prompt TEXT NOT NULL,
      channel TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      last_run TIMESTAMPTZ,
      next_run TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS connected_companies (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      company_name TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      url TEXT,
      agents TEXT DEFAULT '[]',
      connected_at TEXT DEFAULT ''
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON chat_queue(status);
    CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled, next_run);
    CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
  `);
  _initialized = true;
}

export async function query(sql: string, params?: unknown[]): Promise<unknown[]> {
  await ensureTables();
  const pool = getDb();
  // Convert ? placeholders to $1, $2, etc.
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(pgSql, params);
  return result.rows;
}

export async function run(sql: string, params?: unknown[]): Promise<void> {
  await ensureTables();
  const pool = getDb();
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  await pool.query(pgSql, params);
}

export async function get(sql: string, params?: unknown[]): Promise<unknown> {
  const rows = await query(sql, params);
  return rows[0] || null;
}

export async function closeDb(): Promise<void> {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}
