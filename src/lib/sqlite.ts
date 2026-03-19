import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'y-company.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    initTables(_db);
  }
  return _db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      topic TEXT NOT NULL,
      topic_type TEXT,
      participants TEXT DEFAULT '[]',
      messages TEXT DEFAULT '[]',
      summary TEXT,
      action_items TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      agent_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      report_type TEXT DEFAULT 'general',
      meeting_id TEXT,
      status TEXT DEFAULT 'pending',
      reviewed_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS agent_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      memory_type TEXT NOT NULL,
      content TEXT NOT NULL,
      importance INTEGER DEFAULT 5,
      source_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS chat_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      message TEXT NOT NULL,
      system_prompt TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'done', 'error')),
      response TEXT,
      model TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      processed_at TEXT
    );
    CREATE TABLE IF NOT EXISTS decisions (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
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
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS directives (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      title TEXT NOT NULL,
      content TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'normal',
      assignees TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME
    );
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      direction TEXT,
      entry_price REAL,
      exit_price REAL,
      pnl REAL,
      status TEXT DEFAULT 'open',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id);
    CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
    CREATE INDEX IF NOT EXISTS idx_memory_agent ON agent_memory(agent_id);
    CREATE INDEX IF NOT EXISTS idx_queue_status ON chat_queue(status);
    CREATE TABLE IF NOT EXISTS schedules (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      name TEXT NOT NULL,
      agent_id TEXT,
      schedule_type TEXT DEFAULT 'interval',
      schedule_value TEXT NOT NULL,
      prompt TEXT NOT NULL,
      channel TEXT DEFAULT '',
      enabled INTEGER DEFAULT 1,
      last_run TEXT,
      next_run TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_schedules_enabled ON schedules(enabled, next_run);
    CREATE INDEX IF NOT EXISTS idx_decisions_status ON decisions(status);
    CREATE TABLE IF NOT EXISTS connected_companies (
      id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
      company_name TEXT NOT NULL,
      industry TEXT,
      description TEXT,
      url TEXT,
      agents TEXT DEFAULT "[]",
      connected_at TEXT DEFAULT ''
    );
  `);
  // Migrations for existing databases
  const migrate = (sql: string) => { try { db.exec(sql); } catch {} };
  migrate('ALTER TABLE decisions ADD COLUMN description TEXT');
  migrate('ALTER TABLE decisions ADD COLUMN priority TEXT DEFAULT "normal"');
  migrate('ALTER TABLE decisions ADD COLUMN trigger_source TEXT');
  migrate('ALTER TABLE decisions ADD COLUMN trigger_agent_id TEXT');
  migrate('ALTER TABLE decisions ADD COLUMN trigger_data TEXT');
  migrate('ALTER TABLE decisions ADD COLUMN progress TEXT');
  migrate('ALTER TABLE chat_queue ADD COLUMN system_prompt TEXT');
  migrate('ALTER TABLE chat_queue ADD COLUMN metadata TEXT');
  migrate('ALTER TABLE reports ADD COLUMN directive_id TEXT');
  seedSchedules(db);
  seedDemoData(db);

}




function seedDemoData(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM reports').get() as { c: number }).c;
  if (count > 0) return;

  const now = new Date().toISOString();
  const ago = (hours: number) => new Date(Date.now() - hours * 3600000).toISOString();

  // Reports
  const reportStmt = db.prepare(
    'INSERT INTO reports (id, agent_id, title, content, report_type, status, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)'
  );
  reportStmt.run('counsely', 'Company Environment Analysis Complete',
    'System check complete. 30 agents initialized across 10 floors. LLM provider configured and operational. All departments reporting ready status. Recommendation: Begin with a strategy directive to test the full pipeline.',
    'general', 'reviewed', ago(2));
  reportStmt.run('searchy', 'GitHub Trending: 5 High-Relevance AI Repositories',
    '1. llm-agents-framework (2.1k stars) - Multi-agent orchestration\n2. local-ai-stack (1.8k stars) - Self-hosted LLM infrastructure\n3. agent-memory (1.2k stars) - Persistent memory for AI agents\n4. tool-calling-bench (900 stars) - Benchmarks for tool-use\n5. rag-evaluation (750 stars) - RAG quality metrics\n\nRecommendation: agent-memory aligns with our architecture.',
    'research', 'pending', ago(1));
  reportStmt.run('skepty', 'Risk Assessment: New Investment Proposal',
    'Target: EdgeAI Solutions Series A ($15M)\n\nRisk Factors:\n- Market: AI hardware commoditization risk (Medium)\n- Technical: Proprietary chip dependency (High)\n- Financial: 18-month runway at current burn (Medium)\n\nVerdict: Proceed with caution. Recommend due diligence on chip supplier contracts.',
    'analysis', 'pending', ago(3));
  reportStmt.run('watchy', 'Daily Service Health Check',
    'All systems operational. API Response Time: 142ms avg. Uptime: 99.97% (30-day). Error Rate: 0.02%. Database: 45% capacity. No critical alerts.',
    'health_check', 'reviewed', ago(4));
  reportStmt.run('buzzy', 'Weekly Social Media Performance Report',
    'X (@_yholdings): Impressions 12.4K (+23% WoW), Engagement 4.2%, Top Post: "30 agents, 10 floors, one founder" (847 likes), New Followers: +38. Recommendation: Double down on builder narrative content.',
    'general', 'pending', ago(5));

  // Decisions
  const decStmt = db.prepare(
    'INSERT INTO decisions (id, title, description, type, status, priority, source_agent, trigger_source, created_at, updated_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  decStmt.run('European Market Expansion Strategy',
    'Evaluate potential for AI consulting services in EU market. Focus on London and Berlin offices.',
    'strategy', 'in_progress', 'high', 'counsely', 'directive', ago(6), ago(1));
  decStmt.run('Open Source Release Readiness',
    'Final checklist for public repository launch. Code audit, documentation review, license compliance.',
    'general', 'completed', 'critical', 'tasky', 'manual', ago(24), ago(2));
  decStmt.run('Q1 Budget Reallocation',
    'Redistribute unused marketing budget to R&D infrastructure. $45K available.',
    'financial', 'pending', 'normal', 'finy', 'agent', ago(8), ago(8));

  // Meeting
  const mtgStmt = db.prepare(
    'INSERT INTO meetings (id, topic, topic_type, participants, messages, summary, action_items, created_at) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?)'
  );
  mtgStmt.run(
    'Q1 Strategy Review', 'strategy',
    JSON.stringify(['counsely', 'tasky', 'finy', 'skepty', 'growthy']),
    JSON.stringify([
      { agent: 'counsely', content: 'Q1 revenue targets met at 112%. Key growth from consulting pipeline.' },
      { agent: 'finy', content: 'Cash reserves healthy. Recommend 30% allocation to new market exploration.' },
      { agent: 'skepty', content: 'EU expansion carries regulatory risk. Suggest legal review before commitment.' },
      { agent: 'growthy', content: 'Social presence growing. Open source launch could 3x our visibility.' },
      { agent: 'tasky', content: 'Action items assigned. Timeline: 2 weeks for EU legal review, 1 week for OSS prep.' },
    ]),
    'Q1 exceeded targets. Team aligned on EU exploration with proper due diligence. OSS launch approved.',
    JSON.stringify([
      { agent: 'legaly', task: 'EU regulatory compliance review', deadline: '2 weeks' },
      { agent: 'buildy', task: 'Prepare open source repository', deadline: '1 week' },
      { agent: 'buzzy', task: 'Draft launch announcement', deadline: '1 week' },
    ]),
    ago(12)
  );

  // Agent memory
  const memStmt = db.prepare(
    'INSERT INTO agent_memory (agent_id, memory_type, content, importance, created_at) VALUES (?, ?, ?, ?, ?)'
  );
  memStmt.run('counsely', 'insight', 'Chairman prefers concise 3-line summaries with actionable items.', 8, ago(24));
  memStmt.run('searchy', 'observation', 'GitHub trending repos with 1K+ weekly stars have 70% chance of sustained growth.', 6, ago(12));
  memStmt.run('skepty', 'lesson', 'Always verify financial projections with at least 2 independent data sources.', 9, ago(48));
}


function seedSchedules(db: Database.Database) {
  const count = (db.prepare('SELECT COUNT(*) as c FROM schedules').get() as { c: number }).c;
  if (count > 0) return;
  const seeds = [
    { name: 'Market Morning Brief', agent_id: 'quanty', schedule_type: 'daily', schedule_value: '09:00', prompt: 'Analyze todays market conditions and provide a brief summary of key indicators, trends, and recommendations.', channel: '' },
    { name: 'Security Audit', agent_id: 'guardy', schedule_type: 'daily', schedule_value: '22:00', prompt: 'Run daily security check. Review access logs, check for vulnerabilities, and report any anomalies.', channel: '' },
    { name: 'News Scan', agent_id: 'searchy', schedule_type: 'daily', schedule_value: '08:00', prompt: 'Scan latest industry news and trends. Summarize key developments relevant to our business.', channel: '' },
  ];
  const stmt = db.prepare('INSERT INTO schedules (id, name, agent_id, schedule_type, schedule_value, prompt, channel) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?)');
  for (const s of seeds) {
    stmt.run(s.name, s.agent_id, s.schedule_type, s.schedule_value, s.prompt, s.channel);
  }
}
export function closeDb() {
  if (_db) { _db.close(); _db = null; }
}
