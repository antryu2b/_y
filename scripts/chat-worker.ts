#!/usr/bin/env tsx

/**
 * Chat Queue Worker (SQLite + Multi-LLM)
 * 
 * Polls SQLite chat_queue for pending tasks and routes to the configured LLM provider.
 * Supports: Ollama (local), OpenAI, Anthropic, Google.
 * 
 * Usage: npx tsx scripts/chat-worker.ts
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── Config ──
const POLL_INTERVAL = 5000;
const DB_PATH = path.join(process.cwd(), 'data', 'y-company.db');
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// ── DB ──
function getDb(): Database.Database {
  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  return db;
}

const db = getDb();

// Ensure columns exist
try { db.exec('ALTER TABLE chat_queue ADD COLUMN system_prompt TEXT'); } catch {}
try { db.exec('ALTER TABLE chat_queue ADD COLUMN metadata TEXT'); } catch {}
try { db.exec('ALTER TABLE chat_queue ADD COLUMN model TEXT'); } catch {}
try { db.exec('ALTER TABLE decisions ADD COLUMN progress TEXT'); } catch {}
try { db.exec('ALTER TABLE decisions ADD COLUMN trigger_data TEXT'); } catch {}
try { db.exec('ALTER TABLE reports ADD COLUMN directive_id TEXT'); } catch {}

// ── LLM Profile ──
interface AgentLLMConfig {
  provider: string;
  model: string;
}

function getAgentLLMConfig(agentId: string): AgentLLMConfig {
  try {
    const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
    if (fs.existsSync(profilePath)) {
      const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      const provider = profile.provider || 'ollama';

      // Per-agent override (new format)
      if (profile.agents?.[agentId]) {
        return {
          provider: profile.agents[agentId].provider,
          model: profile.agents[agentId].model,
        };
      }

      // Cloud provider defaults
      const analysisAgents = new Set([
        'counsely', 'tasky', 'finy', 'legaly', 'skepty', 'audity',
        'quanty', 'hedgy', 'valuey', 'growthy',
      ]);
      const cloudDefaults: Record<string, { analysis: string; utility: string }> = {
        openai: { analysis: 'gpt-4o', utility: 'gpt-4o-mini' },
        anthropic: { analysis: 'claude-sonnet-4-20250514', utility: 'claude-sonnet-4-20250514' },
        google: { analysis: 'gemini-2.0-flash', utility: 'gemini-2.0-flash' },
      };

      if (provider in cloudDefaults) {
        const defaults = cloudDefaults[provider];
        return {
          provider,
          model: analysisAgents.has(agentId) ? defaults.analysis : defaults.utility,
        };
      }

      // Ollama: legacy agentModels format
      if (profile.agentModels?.[agentId]) {
        return { provider: 'ollama', model: profile.agentModels[agentId] };
      }
    }
  } catch {}
  return { provider: 'ollama', model: 'qwen2.5:7b' };
}

// ── Ollama Call ──
async function callOllama(systemPrompt: string, message: string, history: any[], model: string): Promise<string | null> {
  try {
    const messages = [
      { role: 'system', content: systemPrompt || 'You are a helpful AI agent.' },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        options: { temperature: 0.8, top_p: 0.9 },
      }),
    });

    if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
    const data = await response.json();
    return data.message?.content || '';
  } catch (error: any) {
    console.error(`  \x1b[31m[Ollama] ${error.message}\x1b[0m`);
    return null;
  }
}

// ── OpenAI Call ──
async function callOpenAI(systemPrompt: string, message: string, history: any[], model: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('  \x1b[31m[OpenAI] OPENAI_API_KEY not set\x1b[0m');
    return null;
  }

  try {
    const messages = [
      { role: 'system', content: systemPrompt || 'You are a helpful AI agent.' },
      ...history,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.8,
        top_p: 0.9,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error: any) {
    console.error(`  \x1b[31m[OpenAI] ${error.message}\x1b[0m`);
    return null;
  }
}

// ── Anthropic Call ──
async function callAnthropic(systemPrompt: string, message: string, history: any[], model: string): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('  \x1b[31m[Anthropic] ANTHROPIC_API_KEY not set\x1b[0m');
    return null;
  }

  try {
    // Convert history to Anthropic format (alternating user/assistant)
    const anthropicMessages: { role: string; content: string }[] = [];
    for (const msg of history) {
      anthropicMessages.push({ role: msg.role, content: msg.content });
    }
    anthropicMessages.push({ role: 'user', content: message });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system: systemPrompt || 'You are a helpful AI agent.',
        messages: anthropicMessages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Anthropic API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    // Anthropic returns content as an array of blocks
    const textBlocks = (data.content || []).filter((b: any) => b.type === 'text');
    return textBlocks.map((b: any) => b.text).join('') || '';
  } catch (error: any) {
    console.error(`  \x1b[31m[Anthropic] ${error.message}\x1b[0m`);
    return null;
  }
}

// ── Google (Gemini) Call ──
async function callGoogle(systemPrompt: string, message: string, history: any[], model: string): Promise<string | null> {
  const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('  \x1b[31m[Google] GOOGLE_API_KEY not set\x1b[0m');
    return null;
  }

  try {
    // Build Gemini contents format
    const contents: any[] = [];
    for (const msg of history) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }
    contents.push({ role: 'user', parts: [{ text: message }] });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt || 'You are a helpful AI agent.' }] },
          contents,
          generationConfig: {
            temperature: 0.8,
            topP: 0.9,
          },
        }),
      }
    );

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Google API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (error: any) {
    console.error(`  \x1b[31m[Google] ${error.message}\x1b[0m`);
    return null;
  }
}

// ── LLM Router ──
async function callLLM(provider: string, model: string, systemPrompt: string, message: string, history: any[]): Promise<string | null> {
  switch (provider) {
    case 'ollama':    return callOllama(systemPrompt, message, history, model);
    case 'openai':    return callOpenAI(systemPrompt, message, history, model);
    case 'anthropic': return callAnthropic(systemPrompt, message, history, model);
    case 'google':    return callGoogle(systemPrompt, message, history, model);
    default:          return callOllama(systemPrompt, message, history, model);
  }
}

// ── Directive Completion ──
function handleDirectiveCompletion(item: any, response: string): void {
  try {
    const metadata = item.metadata ? JSON.parse(item.metadata) : {};
    if (metadata.type !== 'directive_task' || !metadata.directive_id) return;

    const directiveId = metadata.directive_id;
    const agentId = item.agent_id;
    console.log(`  \x1b[36m📋 Directive completion: ${agentId} → ${directiveId}\x1b[0m`);

    const directive = db.prepare('SELECT * FROM decisions WHERE id = ?').get(directiveId) as any;
    if (!directive) return;

    let progress = directive.progress ? JSON.parse(directive.progress) : { total: 0, completed: 0, agent_results: {} };
    progress.completed = (progress.completed || 0) + 1;
    progress.agent_results = progress.agent_results || {};
    progress.agent_results[agentId] = { status: 'completed', completed_at: new Date().toISOString() };

    const allDone = progress.completed >= progress.total;

    db.prepare('UPDATE decisions SET progress = ?, status = ?, updated_at = datetime("now") WHERE id = ?')
      .run(JSON.stringify(progress), allDone ? 'done' : 'in_progress', directiveId);

    if (allDone) {
      console.log(`  \x1b[32m🎉 All agents completed directive ${directiveId}\x1b[0m`);
      const tasks = db.prepare('SELECT * FROM chat_queue WHERE metadata LIKE ? AND status = "done"')
        .all(`%${directiveId}%`) as any[];
      
      let reportContent = `# Directive Report\n\n`;
      for (const t of tasks) {
        reportContent += `## ${t.agent_id}\n${t.response || '(no response)'}\n\n`;
      }

      db.prepare('INSERT INTO reports (id, agent_id, title, content, report_type, directive_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)')
        .run(
          crypto.randomUUID(),
          'counsely',
          `Directive Report: ${directive.title}`,
          reportContent,
          'directive_report',
          directiveId,
          'pending'
        );
    }
  } catch (e) {
    console.error('Directive completion error:', e);
  }
}

// ── Schedule Checker ──
function checkSchedules(): void {
  try {
    db.exec(`
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
      )
    `);

    const now = new Date();
    const nowStr = now.toISOString().replace('T', ' ').slice(0, 19);

    const dueSchedules = db.prepare(
      `SELECT * FROM schedules WHERE enabled = 1 AND (next_run IS NULL OR next_run <= ?)`
    ).all(nowStr) as any[];

    for (const schedule of dueSchedules) {
      const { id, name, agent_id, schedule_type, schedule_value, prompt } = schedule;
      if (!agent_id || !prompt) continue;

      console.log(`\x1b[35m⏰ [Schedule]\x1b[0m "${name}" → ${agent_id}`);

      db.prepare(
        'INSERT INTO chat_queue (agent_id, message, system_prompt, metadata) VALUES (?, ?, ?, ?)'
      ).run(
        agent_id,
        prompt,
        null,
        JSON.stringify({ type: 'scheduled', schedule_id: id, schedule_name: name })
      );

      const nextRun = calculateNextRun(schedule_type, schedule_value, now);

      db.prepare(
        'UPDATE schedules SET last_run = ?, next_run = ? WHERE id = ?'
      ).run(nowStr, nextRun, id);

      console.log(`\x1b[35m  ↳ next_run: ${nextRun}\x1b[0m`);
    }
  } catch (e) {
    console.error('Schedule check error:', e);
  }
}

function calculateNextRun(type: string, value: string, now: Date): string {
  if (type === 'daily') {
    const [hours, minutes] = value.split(':').map(Number);
    const next = new Date(now);
    next.setHours(hours, minutes, 0, 0);
    next.setDate(next.getDate() + 1);
    return next.toISOString().replace('T', ' ').slice(0, 19);
  }

  if (type === 'interval') {
    const ms = parseInt(value, 10);
    const next = new Date(now.getTime() + (ms || 3600000));
    return next.toISOString().replace('T', ' ').slice(0, 19);
  }

  if (type === 'cron') {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString().replace('T', ' ').slice(0, 19);
  }

  return new Date(now.getTime() + 3600000).toISOString().replace('T', ' ').slice(0, 19);
}

// ── Get conversation history ──
function getHistory(agentId: string, limit: number = 10): { role: string; content: string }[] {
  try {
    const rows = db.prepare(
      'SELECT role, content FROM conversations WHERE agent_id = ? ORDER BY rowid DESC LIMIT ?'
    ).all(agentId, limit) as any[];
    return rows.reverse();
  } catch {
    return [];
  }
}

// ── Process Queue ──
async function processItem(item: any): Promise<void> {
  const { id, agent_id, message, system_prompt } = item;
  const { provider, model } = getAgentLLMConfig(agent_id);
  const start = Date.now();

  console.log(`\x1b[33m🔄 [${agent_id}]\x1b[0m ${provider}/${model} — processing...`);

  db.prepare('UPDATE chat_queue SET status = "processing" WHERE id = ?').run(id);

  try {
    const history = getHistory(agent_id);
    const response = await callLLM(provider, model, system_prompt || '', message, history);
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);

    if (!response) throw new Error('Empty response from LLM');

    db.prepare('UPDATE chat_queue SET status = "done", response = ?, model = ?, processed_at = datetime("now") WHERE id = ?')
      .run(response, `${provider}/${model}`, id);

    db.prepare('INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)').run(agent_id, 'user', message);
    db.prepare('INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)').run(agent_id, 'assistant', response);

    console.log(`\x1b[32m✅ [${agent_id}]\x1b[0m ${elapsed}s — ${response.length} chars`);

    handleDirectiveCompletion(item, response);

  } catch (error: any) {
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.error(`\x1b[31m❌ [${agent_id}]\x1b[0m ${elapsed}s — ${error.message}`);
    db.prepare('UPDATE chat_queue SET status = "error", response = ? WHERE id = ?')
      .run(`Error: ${error.message}`, id);
  }
}

// ── Main Loop ──
async function poll() {
  checkSchedules();
  const pending = db.prepare('SELECT * FROM chat_queue WHERE status = "pending" ORDER BY rowid ASC LIMIT 1').all();

  for (const item of pending) {
    await processItem(item);
  }
}

// ── Detect active provider ──
function getActiveProvider(): string {
  try {
    const profilePath = path.join(process.cwd(), 'data', 'llm-profile.json');
    if (fs.existsSync(profilePath)) {
      const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
      return profile.provider || 'ollama';
    }
  } catch {}
  return 'ollama';
}

const activeProvider = getActiveProvider();

console.log(`\n  \x1b[1m🏢 _y Holdings — Chat Worker\x1b[0m`);
console.log(`  \x1b[90mProvider: ${activeProvider}\x1b[0m`);
if (activeProvider === 'ollama' || activeProvider === 'mixed') {
  console.log(`  \x1b[90mOllama: ${OLLAMA_URL}\x1b[0m`);
}
console.log(`  \x1b[90mDB: ${DB_PATH}\x1b[0m`);
console.log(`  \x1b[90mPolling every ${POLL_INTERVAL/1000}s...\x1b[0m\n`);

// Startup checks based on provider
if (activeProvider === 'ollama') {
  fetch(`${OLLAMA_URL}/api/tags`)
    .then(() => console.log('  \x1b[32m✅ Ollama connected\x1b[0m\n'))
    .catch(() => {
      console.error('  \x1b[31m❌ Ollama not running! Start with: ollama serve\x1b[0m\n');
      process.exit(1);
    });
} else if (activeProvider === 'openai') {
  console.log(process.env.OPENAI_API_KEY ? '  \x1b[32m✅ OpenAI API key configured\x1b[0m\n' : '  \x1b[31m❌ OPENAI_API_KEY not set!\x1b[0m\n');
} else if (activeProvider === 'anthropic') {
  console.log(process.env.ANTHROPIC_API_KEY ? '  \x1b[32m✅ Anthropic API key configured\x1b[0m\n' : '  \x1b[31m❌ ANTHROPIC_API_KEY not set!\x1b[0m\n');
} else if (activeProvider === 'google') {
  const hasKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  console.log(hasKey ? '  \x1b[32m✅ Google API key configured\x1b[0m\n' : '  \x1b[31m❌ GOOGLE_API_KEY not set!\x1b[0m\n');
} else if (activeProvider === 'mixed') {
  console.log('  \x1b[36mℹ️  Mixed mode — per-agent provider routing\x1b[0m\n');
}

setInterval(poll, POLL_INTERVAL);
poll();
