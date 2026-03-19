/**
 * _y Database Abstraction Layer
 * Supports: SQLite (default) | PostgreSQL | Supabase
 */

export type DbProvider = 'sqlite' | 'postgres' | 'supabase';

export function getDbProvider(): DbProvider {
  if (process.env.DB_PROVIDER) {
    return process.env.DB_PROVIDER as DbProvider;
  }
  // Legacy detection: if Supabase env vars are set, use supabase
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return 'supabase';
  }
  return 'sqlite';
}

const provider = getDbProvider();
const USE_SUPABASE = provider === 'supabase';
const USE_POSTGRES = provider === 'postgres';

function getSupabase() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { supabase } = require('./supabase');
  return supabase;
}
function getSqlite() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getDb } = require('./sqlite');
  return getDb();
}
function getPostgres() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('./postgres');
}

// ─── Unified DB Functions (new interface for gradual migration) ───

export async function dbQuery(
  table: string,
  options?: { where?: Record<string, unknown>; orderBy?: string; ascending?: boolean; limit?: number }
): Promise<unknown[]> {
  if (USE_SUPABASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const supaDb = require('./supabase-db');
    return supaDb.query(table, options || {});
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    let sql = `SELECT * FROM ${table}`;
    const params: unknown[] = [];
    if (options?.where) {
      const conditions = Object.entries(options.where).map(([col, val], i) => {
        params.push(val);
        return `${col} = $${i + 1}`;
      });
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }
    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.ascending ? 'ASC' : 'DESC'}`;
    }
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    return pg.query(sql, params);
  }
  // SQLite
  const db = getSqlite();
  let sql = `SELECT * FROM ${table}`;
  const params: unknown[] = [];
  if (options?.where) {
    const conditions = Object.entries(options.where).map(([col]) => {
      return `${col} = ?`;
    });
    params.push(...Object.values(options.where));
    sql += ` WHERE ${conditions.join(' AND ')}`;
  }
  if (options?.orderBy) {
    sql += ` ORDER BY ${options.orderBy} ${options.ascending ? 'ASC' : 'DESC'}`;
  }
  if (options?.limit) {
    sql += ` LIMIT ${options.limit}`;
  }
  return db.prepare(sql).all(...params);
}

export async function dbInsert(table: string, data: Record<string, unknown>): Promise<unknown> {
  if (USE_SUPABASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const supaDb = require('./supabase-db');
    return supaDb.insert(table, data);
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const cols = Object.keys(data);
    const vals = Object.values(data);
    const placeholders = cols.map((_, i) => `$${i + 1}`);
    const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    const rows = await pg.query(sql, vals);
    return rows[0];
  }
  const db = getSqlite();
  const cols = Object.keys(data);
  const vals = Object.values(data);
  const placeholders = cols.map(() => '?');
  const result = db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders.join(', ')})`).run(...vals);
  return { id: result.lastInsertRowid, ...data };
}

export async function dbUpdate(table: string, id: string, data: Record<string, unknown>): Promise<unknown> {
  if (USE_SUPABASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const supaDb = require('./supabase-db');
    return supaDb.update(table, id, data);
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const entries = Object.entries(data);
    const setClauses = entries.map(([col], i) => `${col} = $${i + 1}`);
    const vals = [...entries.map(([, v]) => v), id];
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1} RETURNING *`;
    const rows = await pg.query(sql, vals);
    return rows[0];
  }
  const db = getSqlite();
  const entries = Object.entries(data);
  const setClauses = entries.map(([col]) => `${col} = ?`);
  const vals = [...entries.map(([, v]) => v), id];
  db.prepare(`UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = ?`).run(...vals);
  return { id, ...data };
}

export async function dbDelete(table: string, id: string): Promise<void> {
  if (USE_SUPABASE) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const supaDb = require('./supabase-db');
    return supaDb.remove(table, id);
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    await pg.run(`DELETE FROM ${table} WHERE id = $1`, [id]);
    return;
  }
  getSqlite().prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
}

export async function dbGet(table: string, id: string): Promise<unknown> {
  if (USE_SUPABASE) {
    const client = getSupabase();
    const { data } = await client.from(table).select('*').eq('id', id).single();
    return data;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    return pg.get(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  }
  return getSqlite().prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
}

// ─── Legacy API (full backward compatibility) ───

export async function saveMessage(agentId: string, role: 'user' | 'assistant', content: string) {
  if (USE_SUPABASE) return getSupabase().from('conversations').insert({ agent_id: agentId, role, content });
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.run('INSERT INTO conversations (agent_id, role, content) VALUES ($1, $2, $3)', [agentId, role, content]); }
  return getSqlite().prepare('INSERT INTO conversations (agent_id, role, content) VALUES (?, ?, ?)').run(agentId, role, content);
}
export async function getConversationHistory(agentId: string, limit = 20) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('conversations').select('*').eq('agent_id', agentId).order('created_at', { ascending: false }).limit(limit);
    return (data || []).reverse();
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const rows = await pg.query('SELECT * FROM conversations WHERE agent_id = $1 ORDER BY created_at DESC LIMIT $2', [agentId, limit]);
    return (rows || []).reverse();
  }
  return getSqlite().prepare('SELECT * FROM conversations WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?').all(agentId, limit).reverse();
}
export async function saveMeeting(topic: string, topicType: string, participants: string[], messages: unknown[], summary?: string, actionItems?: unknown) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('meetings').insert({ topic, topic_type: topicType, participants, messages, summary, action_items: actionItems }).select().single();
    return data;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const id = crypto.randomUUID();
    await pg.run('INSERT INTO meetings (id, topic, topic_type, participants, messages, summary, action_items) VALUES ($1, $2, $3, $4, $5, $6, $7)', [id, topic, topicType, JSON.stringify(participants), JSON.stringify(messages), summary || null, JSON.stringify(actionItems) || null]);
    return { id, topic, topic_type: topicType, participants, messages, summary, action_items: actionItems };
  }
  const db = getSqlite(); const id = crypto.randomUUID();
  db.prepare('INSERT INTO meetings (id, topic, topic_type, participants, messages, summary, action_items) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, topic, topicType, JSON.stringify(participants), JSON.stringify(messages), summary || null, JSON.stringify(actionItems) || null);
  return { id, topic, topic_type: topicType, participants, messages, summary, action_items: actionItems };
}
export async function getMeetings(limit = 10) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('meetings').select('*').order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const rows = await pg.query('SELECT * FROM meetings ORDER BY created_at DESC LIMIT $1', [limit]);
    return (rows || []).map((r: Record<string, unknown>) => ({ ...r, participants: typeof r.participants === 'string' ? JSON.parse(r.participants) : r.participants, messages: typeof r.messages === 'string' ? JSON.parse(r.messages) : r.messages, action_items: typeof r.action_items === 'string' ? JSON.parse(r.action_items) : r.action_items }));
  }
  return getSqlite().prepare('SELECT * FROM meetings ORDER BY created_at DESC LIMIT ?').all(limit).map((r: Record<string, unknown>) => ({ ...r, participants: JSON.parse(r.participants as string || '[]'), messages: JSON.parse(r.messages as string || '[]'), action_items: r.action_items ? JSON.parse(r.action_items as string) : null }));
}
export async function saveReport(agentId: string, title: string, content: string, reportType = 'general', meetingId?: string) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('reports').insert({ agent_id: agentId, title, content, report_type: reportType, meeting_id: meetingId }).select().single();
    return data;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const id = crypto.randomUUID();
    await pg.run('INSERT INTO reports (id, agent_id, title, content, report_type, meeting_id) VALUES ($1, $2, $3, $4, $5, $6)', [id, agentId, title, content, reportType, meetingId || null]);
    return { id, agent_id: agentId, title, content, report_type: reportType, meeting_id: meetingId, status: 'pending' };
  }
  const db = getSqlite(); const id = crypto.randomUUID();
  db.prepare('INSERT INTO reports (id, agent_id, title, content, report_type, meeting_id) VALUES (?, ?, ?, ?, ?, ?)').run(id, agentId, title, content, reportType, meetingId || null);
  return { id, agent_id: agentId, title, content, report_type: reportType, meeting_id: meetingId, status: 'pending' };
}
export async function getPendingReports() {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('reports').select('*').eq('status', 'pending').order('created_at', { ascending: false });
    return data || [];
  }
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.query('SELECT * FROM reports WHERE status = $1 ORDER BY created_at DESC', ['pending']); }
  return getSqlite().prepare('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC').all('pending');
}
export async function updateReportStatus(reportId: string, status: 'approved' | 'rejected') {
  if (USE_SUPABASE) return getSupabase().from('reports').update({ status, reviewed_at: new Date().toISOString() }).eq('id', reportId);
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.run('UPDATE reports SET status = $1, reviewed_at = NOW() WHERE id = $2', [status, reportId]); }
  return getSqlite().prepare('UPDATE reports SET status = ?, reviewed_at = datetime("now") WHERE id = ?').run(status, reportId);
}
export async function addMemory(agentId: string, memoryType: string, content: string, importance = 5, sourceId?: string) {
  if (USE_SUPABASE) return getSupabase().from('agent_memory').insert({ agent_id: agentId, memory_type: memoryType, content, importance, source_id: sourceId });
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.run('INSERT INTO agent_memory (agent_id, memory_type, content, importance, source_id) VALUES ($1, $2, $3, $4, $5)', [agentId, memoryType, content, importance, sourceId || null]); }
  return getSqlite().prepare('INSERT INTO agent_memory (agent_id, memory_type, content, importance, source_id) VALUES (?, ?, ?, ?, ?)').run(agentId, memoryType, content, importance, sourceId || null);
}
export async function getAgentMemories(agentId: string, limit = 10) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('agent_memory').select('*').eq('agent_id', agentId).order('importance', { ascending: false }).order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.query('SELECT * FROM agent_memory WHERE agent_id = $1 ORDER BY importance DESC, created_at DESC LIMIT $2', [agentId, limit]); }
  return getSqlite().prepare('SELECT * FROM agent_memory WHERE agent_id = ? ORDER BY importance DESC, created_at DESC LIMIT ?').all(agentId, limit);
}
export async function enqueueChat(agentId: string, message: string, model?: string) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('chat_queue').insert({ agent_id: agentId, message, model, status: 'pending' }).select().single();
    return data;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const rows = await pg.query('INSERT INTO chat_queue (agent_id, message, model) VALUES ($1, $2, $3) RETURNING *', [agentId, message, model || null]);
    return rows[0];
  }
  const result = getSqlite().prepare('INSERT INTO chat_queue (agent_id, message, model) VALUES (?, ?, ?)').run(agentId, message, model || null);
  return { id: result.lastInsertRowid, agent_id: agentId, message, status: 'pending' };
}
export async function dequeueChat() {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('chat_queue').select('*').eq('status', 'pending').order('created_at', { ascending: true }).limit(1);
    if (data?.[0]) await getSupabase().from('chat_queue').update({ status: 'processing' }).eq('id', data[0].id);
    return data?.[0] || null;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const rows = await pg.query('SELECT * FROM chat_queue WHERE status = $1 ORDER BY created_at ASC LIMIT 1', ['pending']);
    if (rows[0]) await pg.run('UPDATE chat_queue SET status = $1 WHERE id = $2', ['processing', rows[0].id]);
    return rows[0] || null;
  }
  const db = getSqlite();
  const row = db.prepare('SELECT * FROM chat_queue WHERE status = ? ORDER BY created_at ASC LIMIT 1').get('pending');
  if (row) db.prepare('UPDATE chat_queue SET status = ? WHERE id = ?').run('processing', (row as Record<string, unknown>).id);
  return row || null;
}
export async function completeChat(id: number | string, response: string) {
  if (USE_SUPABASE) return getSupabase().from('chat_queue').update({ status: 'done', response, processed_at: new Date().toISOString() }).eq('id', id);
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.run('UPDATE chat_queue SET status = $1, response = $2, processed_at = NOW() WHERE id = $3', ['done', response, id]); }
  return getSqlite().prepare('UPDATE chat_queue SET status = ?, response = ?, processed_at = datetime("now") WHERE id = ?').run('done', response, id);
}
export async function getDecisions(status?: string, limit = 20) {
  if (USE_SUPABASE) {
    let q = getSupabase().from('decisions').select('*');
    if (status) q = q.eq('status', status);
    const { data } = await q.order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    return status
      ? pg.query('SELECT * FROM decisions WHERE status = $1 ORDER BY created_at DESC LIMIT $2', [status, limit])
      : pg.query('SELECT * FROM decisions ORDER BY created_at DESC LIMIT $1', [limit]);
  }
  const db = getSqlite();
  return status ? db.prepare('SELECT * FROM decisions WHERE status = ? ORDER BY created_at DESC LIMIT ?').all(status, limit) : db.prepare('SELECT * FROM decisions ORDER BY created_at DESC LIMIT ?').all(limit);
}
export async function saveDecision(decision: Record<string, unknown>) {
  if (USE_SUPABASE) { const { data } = await getSupabase().from('decisions').insert(decision).select().single(); return data; }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const id = (decision.id as string) || crypto.randomUUID();
    await pg.run('INSERT INTO decisions (id, title, description, type, status, priority, source_agent, trigger_source, trigger_agent_id, trigger_data, progress, analysis, verification, counsel_summary, final_decision) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)',
      [id, decision.title, decision.description || null, decision.type || 'general', decision.status || 'pending', decision.priority || 'normal', decision.source_agent || null, decision.trigger_source || null, decision.trigger_agent_id || null, decision.trigger_data ? JSON.stringify(decision.trigger_data) : null, decision.progress ? JSON.stringify(decision.progress) : null, decision.analysis || null, decision.verification || null, decision.counsel_summary || null, decision.final_decision || null]);
    return { id, ...decision };
  }
  const db = getSqlite(); const id = (decision.id as string) || crypto.randomUUID();
  db.prepare('INSERT INTO decisions (id, title, description, type, status, priority, source_agent, trigger_source, trigger_agent_id, trigger_data, progress, analysis, verification, counsel_summary, final_decision) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(id, decision.title, decision.description || null, decision.type || 'general', decision.status || 'pending', decision.priority || 'normal', decision.source_agent || null, decision.trigger_source || null, decision.trigger_agent_id || null, decision.trigger_data ? JSON.stringify(decision.trigger_data) : null, decision.progress ? JSON.stringify(decision.progress) : null, decision.analysis || null, decision.verification || null, decision.counsel_summary || null, decision.final_decision || null);
  return { id, ...decision };
}
export async function updateDecision(id: string, updates: Record<string, unknown>) {
  if (USE_SUPABASE) { const { data } = await getSupabase().from('decisions').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single(); return data; }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const entries = Object.entries(updates);
    const setClauses = entries.map(([col], i) => `${col} = $${i + 1}`);
    setClauses.push(`updated_at = NOW()`);
    const vals = [...entries.map(([, v]) => v), id];
    await pg.run(`UPDATE decisions SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1}`, vals);
    return { id, ...updates };
  }
  const db = getSqlite(); const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); const values = Object.values(updates);
  db.prepare(`UPDATE decisions SET ${fields}, updated_at = datetime('now') WHERE id = ?`).run(...values, id);
  return { id, ...updates };
}
export function getBackendType(): 'supabase' | 'sqlite' | 'postgres' {
  return getDbProvider();
}

// Directives
export async function getDirectives(limit = 20) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('directives').select('*').order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const rows = await pg.query('SELECT * FROM directives ORDER BY created_at DESC LIMIT $1', [limit]);
    return (rows || []).map((r: Record<string, unknown>) => ({ ...r, assignees: typeof r.assignees === 'string' ? JSON.parse(r.assignees) : r.assignees }));
  }
  return getSqlite().prepare('SELECT * FROM directives ORDER BY created_at DESC LIMIT ?').all(limit).map((r: Record<string, unknown>) => ({ ...r, assignees: JSON.parse((r.assignees as string) || '[]') }));
}
export async function saveDirective(title: string, description: string, assignees: unknown[], priority = 'normal') {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('directives').insert({ title, content: description, assignees, priority }).select().single();
    return data;
  }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const id = crypto.randomUUID();
    await pg.run('INSERT INTO directives (id, title, content, assignees, priority) VALUES ($1, $2, $3, $4, $5)', [id, title, description, JSON.stringify(assignees), priority]);
    return { id, title, content: description, assignees, priority, status: 'pending' };
  }
  const db = getSqlite(); const id = crypto.randomUUID();
  db.prepare('INSERT INTO directives (id, title, content, assignees, priority) VALUES (?, ?, ?, ?, ?)').run(id, title, description, JSON.stringify(assignees), priority);
  return { id, title, content: description, assignees, priority, status: 'pending' };
}
export async function updateDirective(id: string, updates: Record<string, unknown>) {
  if (USE_SUPABASE) { return getSupabase().from('directives').update(updates).eq('id', id); }
  if (USE_POSTGRES) {
    const pg = getPostgres();
    const entries = Object.entries(updates);
    const setClauses = entries.map(([col], i) => `${col} = $${i + 1}`);
    const vals = [...entries.map(([, v]) => v), id];
    await pg.run(`UPDATE directives SET ${setClauses.join(', ')} WHERE id = $${entries.length + 1}`, vals);
    return { id, ...updates };
  }
  const db = getSqlite(); const fields = Object.keys(updates).map(k => `${k} = ?`).join(', '); const values = Object.values(updates);
  db.prepare(`UPDATE directives SET ${fields} WHERE id = ?`).run(...values, id);
  return { id, ...updates };
}

// Reports (additional)
export async function getReports(limit = 20) {
  if (USE_SUPABASE) {
    const { data } = await getSupabase().from('reports').select('*').order('created_at', { ascending: false }).limit(limit);
    return data || [];
  }
  if (USE_POSTGRES) { const pg = getPostgres(); return pg.query('SELECT * FROM reports ORDER BY created_at DESC LIMIT $1', [limit]); }
  return getSqlite().prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT ?').all(limit);
}
