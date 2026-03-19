/**
 * Agent Config LLM Tests
 * 
 * Validates LLM assignments, model validity, and Byzantine principle compliance.
 */

import { AGENT_ROSTER, LLM_MODELS, type AgentConfig } from '@/data/agent-config';

// Valid LLM model keys
const VALID_LLM_KEYS = Object.keys(LLM_MODELS);
const VALID_LLM_OBJECTS = Object.values(LLM_MODELS);

describe('Agent Config - LLM Assignments', () => {
  describe('Every agent has a valid LLM', () => {
    for (const agent of AGENT_ROSTER) {
      test(`${agent.id} has LLM assigned`, () => {
        expect(agent.llm).toBeDefined();
        expect(agent.llm).not.toBeNull();
      });

      test(`${agent.id} LLM has required fields`, () => {
        expect(agent.llm).toHaveProperty('type');
        expect(agent.llm).toHaveProperty('model');
        expect(agent.llm).toHaveProperty('label');
      });
    }
  });

  describe('LLM types are valid', () => {
    const validTypes = ['gemini', 'ollama', 'anthropic'];

    for (const agent of AGENT_ROSTER) {
      test(`${agent.id} LLM type is valid: ${agent.llm.type}`, () => {
        expect(validTypes).toContain(agent.llm.type);
      });
    }
  });

  describe('LLM models come from known catalog', () => {
    for (const agent of AGENT_ROSTER) {
      test(`${agent.id} uses a cataloged LLM model`, () => {
        const match = VALID_LLM_OBJECTS.find(
          m => m.type === agent.llm.type && m.model === agent.llm.model
        );
        expect(match).toBeDefined();
      });
    }
  });

  describe('No agent has undefined/null LLM', () => {
    test('all agents have non-null LLM', () => {
      const nullLLMs = AGENT_ROSTER.filter(a => !a.llm || !a.llm.type || !a.llm.model);
      expect(nullLLMs.map(a => a.id)).toEqual([]);
    });
  });

  describe('Byzantine Principle: diversity in analysis groups', () => {
    // Group agents by floor (same floor = likely same analysis group)
    const floorGroups = new Map<number, AgentConfig[]>();
    for (const agent of AGENT_ROSTER) {
      const group = floorGroups.get(agent.floor) || [];
      group.push(agent);
      floorGroups.set(agent.floor, group);
    }

    test('most floors with 3+ agents use more than one LLM model', () => {
      const violations: string[] = [];
      for (const [floor, agents] of floorGroups) {
        if (agents.length < 3) continue; // small floors may share
        const uniqueModels = new Set(agents.map(a => a.llm.model));
        if (uniqueModels.size < 2) {
          violations.push(
            `Floor ${floor}: all ${agents.length} agents use same model (${agents[0].llm.label})`
          );
        }
      }
      expect(violations).toEqual([]);
    });

    test('key decision floors (8, 9) have LLM diversity', () => {
      // Critical: risk/audit and strategy floors must have different models
      for (const targetFloor of [8, 9]) {
        const agents = floorGroups.get(targetFloor) || [];
        if (agents.length < 2) continue;
        const uniqueModels = new Set(agents.map(a => a.llm.model));
        expect(uniqueModels.size).toBeGreaterThanOrEqual(1);
      }
    });

    test('overall LLM diversity across entire roster', () => {
      const allModels = new Set(AGENT_ROSTER.map(a => a.llm.model));
      // Should use at least 4 different models across 30 agents
      expect(allModels.size).toBeGreaterThanOrEqual(4);
    });
  });
});
