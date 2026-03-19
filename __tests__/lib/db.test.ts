/**
 * Database Abstraction Layer Tests
 * Tests SQLite backend directly
 */
import { getBackendType } from '@/lib/db';

describe('Database Layer', () => {
  it('should default to sqlite when no Supabase env vars', () => {
    // In test environment, Supabase vars should be empty
    expect(getBackendType()).toBe('sqlite');
  });
});

describe('SQLite Tables', () => {
  it('should initialize all required tables', () => {
    const { getDb } = require('@/lib/sqlite');
    const db = getDb();
    
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
    ).all().map((r: { name: string }) => r.name);
    
    expect(tables).toContain('conversations');
    expect(tables).toContain('meetings');
    expect(tables).toContain('reports');
    expect(tables).toContain('agent_memory');
    expect(tables).toContain('chat_queue');
    expect(tables).toContain('decisions');
    expect(tables).toContain('directives');
  });

  it('should insert and retrieve a directive', async () => {
    const { saveDirective, getDirectives } = require('@/lib/db');
    
    await saveDirective('Test Title', 'Test Description', ['counsely'], 'high');
    const directives = await getDirectives(1);
    
    expect(directives.length).toBeGreaterThanOrEqual(1);
    expect(directives[0].title).toBe('Test Title');
  });

  it('should insert and retrieve a decision', async () => {
    const { saveDecision, getDecisions } = require('@/lib/db');
    
    await saveDecision({ title: 'Test Decision', type: 'general', status: 'pending' });
    const decisions = await getDecisions(undefined, 1);
    
    expect(decisions.length).toBeGreaterThanOrEqual(1);
  });

  it('should save and retrieve messages', async () => {
    const { saveMessage, getConversationHistory } = require('@/lib/db');
    
    await saveMessage('counsely', 'user', 'Hello');
    await saveMessage('counsely', 'assistant', 'Hi there');
    const history = await getConversationHistory('counsely', 5);
    
    expect(history.length).toBeGreaterThanOrEqual(2);
  });
});
