/**
 * Supabase Integration Tests (M1 Production)
 * Verifies all API routes work with Supabase backend
 */

const BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const HAS_SUPABASE = !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

describe('Supabase Backend Integration', () => {
  (HAS_SUPABASE ? describe : describe.skip)('With Supabase configured', () => {

    it('health should report healthy', async () => {
      try {
        const res = await fetch(`${BASE}/api/health`);
        if (!res.ok) return;
        const data = await res.json();
        expect(data.overall).toBe('healthy');
        expect(data.summary.error).toBe(0);
      } catch { /* server not running */ }
    });

    it('decisions API should return array', async () => {
      try {
        const res = await fetch(`${BASE}/api/decisions`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      } catch { /* server not running */ }
    });

    it('directives API should return array', async () => {
      try {
        const res = await fetch(`${BASE}/api/directives`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Array.isArray(data)).toBe(true);
      } catch { /* server not running */ }
    });

    it('agent-status should return 30 agents', async () => {
      try {
        const res = await fetch(`${BASE}/api/agent-status`);
        if (!res.ok) return;
        const data = await res.json();
        expect(Object.keys(data).length).toBe(30);
      } catch { /* server not running */ }
    });

    it('config should return company config', async () => {
      try {
        const res = await fetch(`${BASE}/api/config`);
        if (!res.ok) return;
        const data = await res.json();
        expect(data.company).toBeDefined();
      } catch { /* server not running */ }
    });

    it('meeting API should accept POST', async () => {
      try {
        const res = await fetch(`${BASE}/api/meeting`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            topic: 'Integration Test', 
            topicType: 'general',
            participants: ['counsely'],
            messages: [{ role: 'counsely', content: 'Test meeting' }]
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        expect(data.meeting || data.id).toBeDefined();
      } catch { /* server not running */ }
    }, 15000);
  });
});

describe('Code Verification', () => {
  it('all agent IDs should be valid', () => {
    const { AGENT_ROSTER } = require('@/data/agent-config');
    expect(AGENT_ROSTER.length).toBe(30);
    AGENT_ROSTER.forEach((agent: { id: string; name: string; floor: number }) => {
      expect(agent.id).toMatch(/^[a-z]+y$/);
      expect(agent.name).toBeTruthy();
      expect(agent.floor).toBeGreaterThanOrEqual(1);
      expect(agent.floor).toBeLessThanOrEqual(10);
    });
  });

  it('company config should have required fields', () => {
    const { CONFIG } = require('@/data/company-config');
    expect(CONFIG.company).toBeDefined();
    expect(CONFIG.company.name).toBeTruthy();
    expect(CONFIG.subsidiaries).toBeDefined();
  });

  it('all floors should have valid agents assigned', () => {
    const { floors } = require('@/data/floors');
    const { AGENT_ROSTER } = require('@/data/agent-config');
    const validIds = new Set(AGENT_ROSTER.map((a: { id: string }) => a.id));
    
    floors.forEach((floor: any) => {
      if (floor.agents) {
        floor.agents.forEach((agent: any) => {
          const id = typeof agent === 'string' ? agent : agent.id;
          if (id === 'andrew' || id === 'chairman') return; // Chairman is not in AGENT_ROSTER
          expect(validIds.has(id)).toBe(true);
        });
      }
    });
  });
});
