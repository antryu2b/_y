/**
 * Agent Configuration Tests
 * 
 * Tests AGENT_ROSTER data integrity and structure validation
 */

import { AGENT_ROSTER, LLM_MODELS, type AgentConfig, type AgentTier } from '@/data/agent-config';

describe('Agent Configuration', () => {
  describe('AGENT_ROSTER', () => {
    test('should contain exactly 30 agents', () => {
      expect(AGENT_ROSTER).toHaveLength(30);
    });

    test('should have all required fields for each agent', () => {
      AGENT_ROSTER.forEach((agent, index) => {
        expect(agent).toEqual(
          expect.objectContaining({
            id: expect.any(String),
            number: expect.any(String),
            name: expect.any(String),
            tier: expect.stringMatching(/^(C|Director|Manager|Staff)$/),
            floor: expect.any(Number),
            department: expect.any(String),
            reportTo: expect.any(String),
            llm: expect.objectContaining({
              type: expect.stringMatching(/^(gemini|ollama|anthropic)$/),
              model: expect.any(String),
              label: expect.any(String)
            }),
            role: expect.stringMatching(/^(analyst|reviewer|executor|synthesizer|strategist)$/),
            desc: expect.any(String)
          })
        ); // `Agent at index ${index} is missing required fields`
      });
    });

    test('should have unique agent IDs', () => {
      const ids = AGENT_ROSTER.map(agent => agent.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    test('should have unique agent numbers', () => {
      const numbers = AGENT_ROSTER.map(agent => agent.number);
      const uniqueNumbers = new Set(numbers);
      expect(uniqueNumbers.size).toBe(numbers.length);
    });

    test('should have all agents on floors 1-10', () => {
      AGENT_ROSTER.forEach(agent => {
        expect(agent.floor).toBeGreaterThanOrEqual(1);
        expect(agent.floor).toBeLessThanOrEqual(10);
      });
    });

    test('should have valid LLM configurations', () => {
      AGENT_ROSTER.forEach(agent => {
        expect(agent.llm).toBeDefined();
        expect(agent.llm.type).toMatch(/^(gemini|ollama|anthropic)$/);
        expect(agent.llm.model).toBeTruthy();
        expect(agent.llm.label).toBeTruthy();
      });
    });

    test('should have valid tier hierarchy', () => {
      const validTiers: AgentTier[] = ['C', 'Director', 'Manager', 'Staff'];
      AGENT_ROSTER.forEach(agent => {
        expect(validTiers).toContain(agent.tier);
      });
    });

    test('should have valid reportTo relationships', () => {
      const allIds = AGENT_ROSTER.map(a => a.id);
      allIds.push('chairman'); // Add chairman as valid reportTo

      AGENT_ROSTER.forEach(agent => {
        expect(allIds).toContain(agent.reportTo);
      });
    });

    test('should have at least one agent per floor', () => {
      const floorsWithAgents = new Set(AGENT_ROSTER.map(agent => agent.floor));
      
      // Check that we have agents on floors 1-10
      for (let floor = 1; floor <= 10; floor++) {
        expect(floorsWithAgents).toContain(floor);
      }
    });
  });

  describe('LLM_MODELS', () => {
    test('should have all required LLM model configurations', () => {
      const requiredModels = ['deepseek_r1', 'qwen3_32b', 'claude_opus', 'claude_sonnet', 'gemini_flash'];
      
      requiredModels.forEach(modelKey => {
        expect(LLM_MODELS).toHaveProperty(modelKey);
        expect(LLM_MODELS[modelKey as keyof typeof LLM_MODELS]).toEqual(
          expect.objectContaining({
            type: expect.stringMatching(/^(gemini|ollama|anthropic)$/),
            model: expect.any(String),
            label: expect.any(String)
          })
        );
      });
    });
  });

  describe('Agent Distribution', () => {
    test('should have proper tier distribution', () => {
      const tierCounts = AGENT_ROSTER.reduce((acc, agent) => {
        acc[agent.tier] = (acc[agent.tier] || 0) + 1;
        return acc;
      }, {} as Record<AgentTier, number>);

      // Should have fewer C-level than others (hierarchy principle)
      expect(tierCounts.C).toBeLessThan(10);
      expect(tierCounts.C).toBeGreaterThan(0);
      
      // Should have some agents in each tier
      expect(tierCounts.Director).toBeGreaterThan(0);
      expect(tierCounts.Manager).toBeGreaterThan(0);
      expect(tierCounts.Staff).toBeGreaterThan(0);
    });

    test('should have Byzantine Generals compliance (different LLMs for different tiers)', () => {
      const llmsByTier = AGENT_ROSTER.reduce((acc, agent) => {
        if (!acc[agent.tier]) acc[agent.tier] = new Set();
        acc[agent.tier].add(agent.llm.model);
        return acc;
      }, {} as Record<AgentTier, Set<string>>);

      // C-Suite and Director should use different models (Byzantine principle)
      const cModels = llmsByTier.C;
      const directorModels = llmsByTier.Director;
      
      if (cModels && directorModels) {
        const overlap = [...cModels].filter(model => directorModels.has(model));
        // Some overlap is acceptable but there should be diversity
        expect(cModels.size + directorModels.size - overlap.length).toBeGreaterThan(1);
      }
    });
  });
});