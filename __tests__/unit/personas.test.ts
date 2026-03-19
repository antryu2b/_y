/**
 * Personas Tests (M4 adapted)
 * Validates agent configuration and persona setup.
 */

import { AGENT_ROSTER } from '@/data/agent-config';
import { agentPersonas, SYSTEM_PROMPT_PREFIX } from '@/data/personas';

const AGENT_IDS = AGENT_ROSTER.map(a => a.id);

describe('Personas', () => {
  test('should have exactly 30 agent IDs', () => {
    expect(AGENT_IDS).toHaveLength(30);
  });

  test('agentPersonas is exported as object', () => {
    expect(typeof agentPersonas).toBe('object');
  });

  test('SYSTEM_PROMPT_PREFIX is a non-empty string', () => {
    expect(typeof SYSTEM_PROMPT_PREFIX).toBe('string');
    expect(SYSTEM_PROMPT_PREFIX.length).toBeGreaterThan(50);
  });

  test('SYSTEM_PROMPT_PREFIX contains company info', () => {
    expect(SYSTEM_PROMPT_PREFIX).toContain('agent');
  });

  describe('Agent roster', () => {
    for (const id of AGENT_IDS) {
      test(`${id} has required fields`, () => {
        const agent = AGENT_ROSTER.find(a => a.id === id);
        expect(agent).toBeDefined();
        expect(agent!.name).toBeTruthy();
        expect(agent!.floor).toBeGreaterThanOrEqual(1);
        expect(agent!.floor).toBeLessThanOrEqual(10);
      });
    }
  });
});
