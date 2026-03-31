#!/usr/bin/env tsx

/**
 * Chat Queue Worker (SQLite version)
 *
 * Polls chat_queue table via better-sqlite3 directly.
 * Calls Ollama / Gemini / Claude based on agent LLM assignment.
 *
 * Usage: npx tsx scripts/chat-worker.ts
 */

import { execSync } from 'child_process';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// ── Configuration ──
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const POLL_INTERVAL = 5000;
const DB_PATH = path.join(process.cwd(), 'data', 'y-company.db');

// ── Load agent-config (LLM assignment) ──
// We import dynamically because tsconfig excludes scripts/
// and path aliases (@/) won't resolve. Use relative paths.
import { getAgentLLM } from '../src/lib/llm-profile';

// ── Types ──
interface QueueItem {
  id: number;
  agent_id: string;
  message: string;
  system_prompt: string | null;
  status: string;
  response: string | null;
  model: string | null;
  metadata: string | null;
  created_at: string;
  processed_at: string | null;
}

interface ParsedMetadata {
  type?: string;
  directive_id?: string;
  phase?: number;
  total_phases?: number;
  hold?: boolean;
  retry_count?: number;
  tier?: string;
  [key: string]: unknown;
}

// ── Database setup ──
function openDb(): Database.Database {
  if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Database not found at ${DB_PATH}`);
    console.error('   Run the Next.js app first to create and seed the database.');
    process.exit(1);
  }
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

const db = openDb();

// Prepared statements for performance
const stmts = {
  selectPending: db.prepare(
    `SELECT * FROM chat_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT 5`
  ),
  selectErrors: db.prepare(
    `SELECT * FROM chat_queue WHERE status = 'error' ORDER BY created_at ASC LIMIT 3`
  ),
  updateStatus: db.prepare(
    `UPDATE chat_queue SET status = ? WHERE id = ?`
  ),
  updateProcessing: db.prepare(
    `UPDATE chat_queue SET status = 'processing' WHERE id = ?`
  ),
  updateDone: db.prepare(
    `UPDATE chat_queue SET status = 'done', response = ?, model = ?, processed_at = datetime('now') WHERE id = ?`
  ),
  updateError: db.prepare(
    `UPDATE chat_queue SET status = 'error', response = ? WHERE id = ?`
  ),
  updateMetadata: db.prepare(
    `UPDATE chat_queue SET metadata = ? WHERE id = ?`
  ),
  updateMessageAndMeta: db.prepare(
    `UPDATE chat_queue SET message = ?, metadata = ? WHERE id = ?`
  ),
  insertConversation: db.prepare(
    `INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)`
  ),
  insertMemory: db.prepare(
    `INSERT INTO agent_memory (agent_id, memory_type, content, importance) VALUES (?, ?, ?, ?)`
  ),
  selectMemories: db.prepare(
    `SELECT content, memory_type, importance FROM agent_memory
     WHERE agent_id = ? AND memory_type IN ('conversation','knowledge','skill','meeting')
     ORDER BY importance DESC, created_at DESC LIMIT 10`
  ),
  insertReport: db.prepare(
    `INSERT INTO reports (id, agent_id, title, content, report_type, status, directive_id, created_at)
     VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, datetime('now'))`
  ),
  selectDecision: db.prepare(
    `SELECT * FROM decisions WHERE id = ? LIMIT 1`
  ),
  updateDecision: db.prepare(
    `UPDATE decisions SET progress = ?, status = ?, updated_at = datetime('now') WHERE id = ?`
  ),
  selectDirectiveTasks: db.prepare(
    `SELECT * FROM chat_queue WHERE json_extract(metadata, '$.directive_id') = ?`
  ),
};

// ── Helpers ──
function parseMeta(item: QueueItem): ParsedMetadata {
  if (!item.metadata) return {};
  try { return JSON.parse(item.metadata); } catch { return {}; }
}

function randomUUID(): string {
  return crypto.randomUUID();
}

// ── LLM Calling Functions ──

async function callClaude(
  systemPrompt: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  // Build full prompt with history
  let fullPrompt = `${systemPrompt}\n\n`;
  if (history.length > 0) {
    fullPrompt += '## Previous Conversation\n';
    for (const h of history.slice(-5)) {
      fullPrompt += `${h.role === 'assistant' ? 'Assistant' : 'User'}: ${h.content}\n`;
    }
    fullPrompt += '\n';
  }
  fullPrompt += `Current User Message: ${message}`;

  // Write prompt to temp file to avoid shell escaping issues
  const tmpFile = path.join('/tmp', `chat-worker-${Date.now()}.txt`);
  fs.writeFileSync(tmpFile, fullPrompt, 'utf-8');
  try {
    const result = execSync(`cat "${tmpFile}" | claude --print --model ${model}`, {
      encoding: 'utf-8',
      timeout: 180_000,
      maxBuffer: 1024 * 1024,
    });
    return result.trim();
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function callOllama(
  systemPrompt: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: h.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: 0.8, top_p: 0.9 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama API error: ${response.statusText}`);
  const data = await response.json();
  return data.message?.content || '';
}

async function callGemini(
  systemPrompt: string,
  message: string,
  history: Array<{ role: string; content: string }>,
  model: string
): Promise<string> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not available');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  const contents = [
    ...history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 4096, temperature: 0.8 },
    }),
  });

  if (!response.ok) throw new Error(`Gemini API error: ${response.statusText}`);
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

// ── Memory recall ──
function recallMemories(agentId: string): string {
  const memories = stmts.selectMemories.all(agentId) as Array<{
    content: string;
    memory_type: string;
    importance: number;
  }>;
  if (!memories.length) return '';
  const block = memories.map(m => `[${m.memory_type}] ${m.content}`).join('\n');
  return `\n\n## Your Memories (recalled from past interactions)\n${block}\n\nUse these memories to provide more contextual, personalized responses. Reference past events when relevant.`;
}

// ── Directive handling ──
function handleDirectiveCompletion(item: QueueItem, meta: ParsedMetadata, response: string): void {
  if (meta.type !== 'directive_task' || !meta.directive_id) return;

  const directiveId = meta.directive_id;
  const agentId = item.agent_id;
  const currentPhase = meta.phase || 1;
  const totalPhases = meta.total_phases || 1;

  console.log(`📋 Processing directive completion for ${agentId} on directive ${directiveId}`);

  // 1. Save a report for this directive result
  stmts.insertReport.run(agentId, `Directive Response - ${agentId}`, response, 'directive_response', 'completed', directiveId);

  // 2. Update directive progress
  const directive = stmts.selectDecision.get(directiveId) as any;
  if (!directive) {
    console.warn(`Directive ${directiveId} not found`);
    return;
  }

  let progress: any;
  try { progress = JSON.parse(directive.progress || '{}'); } catch { progress = {}; }
  progress.completed = (progress.completed || 0) + 1;
  progress.agent_results = progress.agent_results || {};
  progress.agent_results[agentId] = { completed_at: new Date().toISOString(), status: 'completed' };

  // 3. Check if current phase is complete → activate next phase
  const allTasks = stmts.selectDirectiveTasks.all(directiveId) as QueueItem[];
  const allTasksParsed = allTasks.map(t => ({ ...t, _meta: parseMeta(t) }));

  const currentPhaseTasks = allTasksParsed.filter(t => (t._meta.phase || 1) === currentPhase);
  const currentPhaseCompleted = currentPhaseTasks.every(t => t.status === 'done' || t.status === 'error');

  if (currentPhaseCompleted && currentPhase < totalPhases) {
    // Collect completed results for context injection
    const completedResults = allTasksParsed
      .filter(t => (t.status === 'done') && t.response)
      .map(t => `[${t.agent_id.toUpperCase()} Analysis]:\n${t.response}`)
      .join('\n\n---\n\n');

    // Release next phase tasks
    const nextPhaseTasks = allTasksParsed.filter(
      t => (t._meta.phase || 1) === currentPhase + 1 && t._meta.hold === true
    );

    for (const task of nextPhaseTasks) {
      const enrichedMessage =
        task.message +
        `\n\n## Prior Analysis from Lower-Tier Agents\n` +
        `The following analyses were completed by agents who reported before you.\n\n` +
        `${completedResults}\n\n` +
        `## INDEPENDENT VERIFICATION MANDATE\n` +
        `- First, form your OWN independent analysis before reading the above.\n` +
        `- Then compare your conclusions with the prior analyses.\n` +
        `- Explicitly note where you AGREE and where you DISAGREE.\n` +
        `- If you find contradictions or weak reasoning, call them out directly.\n` +
        `- Do NOT defer to prior analyses just because they were submitted first.\n` +
        `- Your value is your independent judgment — anchoring to prior conclusions defeats the purpose of hierarchical review.`;

      const updatedMeta = { ...task._meta, hold: false };
      stmts.updateMessageAndMeta.run(enrichedMessage, JSON.stringify(updatedMeta), task.id);
      console.log(`⬆️ Released ${task.agent_id} (phase ${currentPhase + 1}) with ${currentPhaseTasks.length} prior results`);
    }
  }

  // 4. Check if ALL agents are done
  const allCompleted = progress.completed >= (progress.total || 0);
  const newStatus = allCompleted ? 'done' : directive.status;
  stmts.updateDecision.run(JSON.stringify(progress), newStatus, directiveId);

  if (allCompleted) {
    console.log(`🎉 All agents completed directive ${directiveId} (${totalPhases} phases)`);
  }
  console.log(`📈 Updated directive ${directiveId} progress: ${progress.completed}/${progress.total || '?'} (phase ${currentPhase}/${totalPhases})`);
}

// ── Memory extraction via Ollama (no API key needed) or Gemini fallback ──
async function extractAndSaveMemory(agentId: string, message: string, response: string): Promise<void> {
  const extractPrompt = `You are a memory extractor. Given this conversation between a chairman and an AI agent, extract ONE key takeaway worth remembering. Reply with ONLY a JSON object: {"content":"1-sentence memory","memory_type":"conversation|knowledge|skill|meeting","importance":1-10}. If nothing worth remembering, reply {"skip":true}.\n\nUser: ${message}\nAgent (${agentId}): ${response}`;

  let text = '';
  try {
    // Try Ollama first
    const ollamaRes = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.1:8b',
        messages: [{ role: 'user', content: extractPrompt }],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });
    if (ollamaRes.ok) {
      const d = await ollamaRes.json();
      text = d.message?.content?.trim() || '';
    } else {
      throw new Error('Ollama unavailable');
    }
  } catch {
    // Fallback to Gemini
    if (!GEMINI_API_KEY) return;
    try {
      const gemRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: extractPrompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }
      );
      const gemData = await gemRes.json();
      text = gemData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    } catch {
      return;
    }
  }

  try {
    const json = JSON.parse(text.replace(/```json?\n?/g, '').replace(/```/g, '').trim());
    if (!json.skip && json.content) {
      stmts.insertMemory.run(
        agentId,
        json.memory_type || 'conversation',
        json.content,
        Math.min(10, Math.max(1, json.importance || 5))
      );
      console.log(`💭 Memory extracted for ${agentId}: ${json.content}`);
    }
  } catch {
    // JSON parse failed — non-critical
  }
}

// ── Main processing function ──
async function processQueueItem(item: QueueItem): Promise<void> {
  const meta = parseMeta(item);

  // Skip held items
  if (meta.hold === true) {
    console.log(`⏸️ Skipping ${item.agent_id} (phase ${meta.phase}) — held, awaiting prior phases`);
    return;
  }

  console.log(`🔄 Processing queue item ${item.id} for agent ${item.agent_id}`);

  try {
    // Mark as processing
    stmts.updateProcessing.run(item.id);

    // Recall agent memories
    const memoryContext = recallMemories(item.agent_id);
    const systemPrompt = (item.system_prompt || '') + memoryContext;
    console.log(`💭 Recalled ${memoryContext ? memoryContext.split('\n').length - 2 : 0} memories for ${item.agent_id}`);

    // Get LLM config
    const llmConfig = getAgentLLM(item.agent_id);
    console.log(`📡 Calling ${llmConfig.provider} (${llmConfig.model}) for ${item.agent_id}`);

    let response: string;
    const history: Array<{ role: string; content: string }> = [];

    // Map provider to call
    switch (llmConfig.provider) {
      case 'anthropic':
        response = await callClaude(systemPrompt, item.message, history, llmConfig.model);
        break;

      case 'ollama':
        try {
          response = await callOllama(systemPrompt, item.message, history, llmConfig.model);
        } catch (ollamaError) {
          console.warn(`Ollama failed for ${item.agent_id}, falling back to Gemini Flash:`, (ollamaError as Error).message);
          if (GEMINI_API_KEY) {
            response = await callGemini(systemPrompt, item.message, history, 'gemini-2.0-flash');
          } else {
            throw ollamaError; // No fallback available
          }
        }
        break;

      case 'google':
        response = await callGemini(systemPrompt, item.message, history, llmConfig.model);
        break;

      default:
        // Default: try Ollama → Gemini
        try {
          response = await callOllama(systemPrompt, item.message, history, 'qwen2.5:7b');
        } catch {
          if (GEMINI_API_KEY) {
            response = await callGemini(systemPrompt, item.message, history, 'gemini-2.0-flash');
          } else {
            throw new Error(`No LLM available for provider: ${llmConfig.provider}`);
          }
        }
        break;
    }

    if (!response) throw new Error('Empty response from LLM');

    // Save to chat_queue
    stmts.updateDone.run(response, `${llmConfig.provider}:${llmConfig.model}`, item.id);

    // Save to conversations
    stmts.insertConversation.run(item.agent_id, 'user', item.message);
    stmts.insertConversation.run(item.agent_id, 'assistant', response);

    console.log(`✅ Completed queue item ${item.id} for agent ${item.agent_id}`);

    // Handle directive completion
    handleDirectiveCompletion(item, meta, response);

    // Extract and save memory (async, non-blocking)
    extractAndSaveMemory(item.agent_id, item.message, response).catch(e =>
      console.warn('Memory extraction failed (non-critical):', e)
    );
  } catch (error) {
    console.error(`❌ Error processing queue item ${item.id}:`, error);
    stmts.updateError.run(String(error), item.id);
  }
}

// ── Main worker loop ──
async function main() {
  console.log('🤖 Chat Queue Worker started (SQLite mode)');
  console.log(`📍 Database: ${DB_PATH}`);
  console.log(`⏱️  Poll interval: ${POLL_INTERVAL}ms`);

  while (true) {
    try {
      // Fetch pending items
      const pendingItems = stmts.selectPending.all() as QueueItem[];

      // Auto-retry: error items older than 2 min, max 1 retry
      const errorItems = stmts.selectErrors.all() as QueueItem[];
      for (const errItem of errorItems) {
        const age = Date.now() - new Date(errItem.created_at).getTime();
        const meta = parseMeta(errItem);
        const retryCount = meta.retry_count || 0;
        if (age > 2 * 60 * 1000 && retryCount < 1) {
          console.log(`🔄 Auto-retry: ${errItem.agent_id} (attempt ${retryCount + 1})`);
          const updatedMeta = { ...meta, retry_count: retryCount + 1 };
          stmts.updateMetadata.run(JSON.stringify(updatedMeta), errItem.id);
          stmts.updateStatus.run('pending', errItem.id);
        }
      }

      if (pendingItems.length > 0) {
        console.log(`📥 Found ${pendingItems.length} pending items`);

        for (const item of pendingItems) {
          const meta = parseMeta(item);

          if (meta.hold === true && meta.directive_id) {
            // Check if prior phases are complete
            const allTasks = stmts.selectDirectiveTasks.all(meta.directive_id) as QueueItem[];
            const currentPhase = meta.phase || 1;
            const priorIncomplete = allTasks.some(t => {
              const tMeta = parseMeta(t);
              return (tMeta.phase || 1) < currentPhase && t.status !== 'done' && t.status !== 'error';
            });
            if (priorIncomplete) continue;
          }

          await processQueueItem(item);
        }
      }

      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error('💥 Worker loop error:', error);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
}

// ── Graceful shutdown ──
process.on('SIGINT', () => {
  console.log('\n👋 Chat Queue Worker stopping...');
  db.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\n👋 Chat Queue Worker stopping...');
  db.close();
  process.exit(0);
});

if (require.main === module) {
  main().catch(error => {
    console.error('💥 Worker startup failed:', error);
    db.close();
    process.exit(1);
  });
}
