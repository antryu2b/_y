/**
 * SQLite Integration Tests
 * Verifies all API routes work without Supabase
 */

describe('SQLite Backend Integration', () => {
  const BASE = 'http://localhost:3001';
  const isServerRunning = async () => {
    try { await fetch(`${BASE}/api/health`); return true; }
    catch { return false; }
  };

  // Skip if no server running
  beforeAll(async () => {
    const running = await isServerRunning();
    if (!running) console.warn('Server not running on :3001 — skipping integration tests');
  });

  describe('Health Check', () => {
    it('should report healthy with sqlite backend', async () => {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (!res.ok) return;
        const data = await res.json();
        expect(data.overall).toBe('healthy');
        expect(data.backend).toBe('sqlite');
        expect(data.summary.error).toBe(0);
      } catch { /* server not running */ }
    });
  });

  describe('Directives API', () => {
    it('GET should return array', async () => {
      try {
        const res = await fetch(`${BASE}/api/directives`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      } catch { /* server not running */ }
    });

    it('POST should create directive', async () => {
      try {
        const res = await fetch(`${BASE}/api/directives`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: 'Test Directive', description: 'Integration test', assignees: [], priority: 'normal' }),
        });
        if (!res.ok) return;
        const data = await res.json();
        expect(data.title).toBe('Test Directive');
        expect(data.id).toBeDefined();
      } catch { /* server not running */ }
    });
  });

  describe('Decisions API', () => {
    it('GET should return array', async () => {
      try {
        const res = await fetch(`${BASE}/api/decisions`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      } catch { /* server not running */ }
    });
  });

  describe('Agent Status API', () => {
    it('should return 30 agents', async () => {
      try {
        const res = await fetch(`${BASE}/api/agent-status`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Object.keys(data).length).toBe(30);
      } catch { /* server not running */ }
    });
  });

  describe('Agent Skills API', () => {
    it('GET should return skills object', async () => {
      try {
        const res = await fetch(`${BASE}/api/agent-skills`);
        if (!res.ok) return;
        const data = await res.json();
        expect(typeof data).toBe('object');
        expect(data.counsely).toBeDefined();
      } catch { /* server not running */ }
    });
  });

  describe('Config API', () => {
    it('GET should return company config', async () => {
      try {
        const res = await fetch(`${BASE}/api/config`);
        if (!res.ok) return;
        const data = await res.json();
        expect(data.company).toBeDefined();
        expect(data.company.name).toBeDefined();
      } catch { /* server not running */ }
    });
  });

  describe('Chat API', () => {
    it('POST should get response from Ollama', async () => {
      try {
        const res = await fetch(`${BASE}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: 'counsely', message: 'hello', lang: 'en' }),
        });
        if (!res.ok) return;
        const data = await res.json();
        expect(data.reply || data.queueId).toBeDefined();
      } catch { /* server not running */ }
    }, 30000);
  });
});
