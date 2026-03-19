/**
 * Data Consistency Integration Tests
 * 
 * Ensures all data sources (agent-config, floors, personas, company-registry)
 * are consistent with each other.
 */

import { AGENT_ROSTER } from '@/data/agent-config';
import { floors } from '@/data/floors';
import { agentPersonas } from '@/data/personas';
import { ALL_AGENTS } from '@/lib/company-registry';
import * as fs from 'fs';
import * as path from 'path';

describe('Data Consistency', () => {
  const rosterIds = new Set(AGENT_ROSTER.map(a => a.id));
  const floorAgentIds = new Set(
    floors.flatMap(f => f.agents.map(a => a.id)).filter(id => id !== 'andrew')
  );
  const personaIds = new Set(Object.keys(agentPersonas));
  const registryAgentIds = new Set(ALL_AGENTS);

  describe('Agent roster ↔ Floor assignments', () => {
    test('all agents in AGENT_ROSTER have floor assignment', () => {
      const missingFromFloors: string[] = [];
      for (const id of rosterIds) {
        if (!floorAgentIds.has(id)) {
          missingFromFloors.push(id);
        }
      }
      expect(missingFromFloors).toEqual([]);
    });

    test('all agents in floors exist in AGENT_ROSTER', () => {
      const missingFromRoster: string[] = [];
      for (const id of floorAgentIds) {
        if (!rosterIds.has(id)) {
          missingFromRoster.push(id);
        }
      }
      expect(missingFromRoster).toEqual([]);
    });
  });

  describe('Agent roster ↔ Personas', () => {
    test('all agents in personas.ts match AGENT_ROSTER IDs', () => {
      const missingFromRoster: string[] = [];
      for (const id of personaIds) {
        if (!rosterIds.has(id)) {
          missingFromRoster.push(id);
        }
      }
      expect(missingFromRoster).toEqual([]);
    });

    test('all AGENT_ROSTER agents have persona', () => {
      const missingPersona: string[] = [];
      for (const id of rosterIds) {
        if (!personaIds.has(id)) {
          missingPersona.push(id);
        }
      }
      expect(missingPersona).toEqual([]);
    });
  });

  describe('Counts', () => {
    test('floor count equals 10', () => {
      expect(floors).toHaveLength(10);
    });

    test('agent count equals 30', () => {
      expect(AGENT_ROSTER).toHaveLength(30);
    });

    test('ALL_AGENTS in company-registry has 30 entries', () => {
      expect(ALL_AGENTS).toHaveLength(30);
    });
  });

  describe('No orphan agents', () => {
    test('no agents in floors but not in roster', () => {
      const orphans: string[] = [];
      for (const id of floorAgentIds) {
        if (!rosterIds.has(id)) {
          orphans.push(`${id} (in floors, not in roster)`);
        }
      }
      expect(orphans).toEqual([]);
    });

    test('no agents in roster but not in floors', () => {
      const orphans: string[] = [];
      for (const id of rosterIds) {
        if (!floorAgentIds.has(id)) {
          orphans.push(`${id} (in roster, not in floors)`);
        }
      }
      expect(orphans).toEqual([]);
    });

    test('no agents in company-registry but not in roster', () => {
      const orphans: string[] = [];
      for (const id of registryAgentIds) {
        if (!rosterIds.has(id)) {
          orphans.push(`${id} (in registry, not in roster)`);
        }
      }
      expect(orphans).toEqual([]);
    });

    test('no agents in roster but not in company-registry', () => {
      const orphans: string[] = [];
      for (const id of rosterIds) {
        if (!registryAgentIds.has(id)) {
          orphans.push(`${id} (in roster, not in registry)`);
        }
      }
      expect(orphans).toEqual([]);
    });
  });

  describe('AGENT_FLOOR mapping in UserCompanyDashboard', () => {
    test('covers all 30 agents', () => {
      const dashboardPath = path.resolve(__dirname, '../../src/components/UserCompanyDashboard.tsx');
      const content = fs.readFileSync(dashboardPath, 'utf-8');

      // Extract AGENT_FLOOR entries
      const match = content.match(/const AGENT_FLOOR[^{]*{([^}]+)}/);
      expect(match).toBeTruthy();

      const mapContent = match![1];
      // Extract agent IDs from the mapping
      const agentIds = mapContent.match(/(\w+)\s*:/g)?.map(m => m.replace(':', '').trim()) || [];

      const missingFromFloorMap: string[] = [];
      for (const id of rosterIds) {
        if (!agentIds.includes(id)) {
          missingFromFloorMap.push(id);
        }
      }
      expect(missingFromFloorMap).toEqual([]);
    });
  });

  describe('Floor structure', () => {
    test('floors are numbered 1-10', () => {
      const levels = floors.map(f => f.level).sort((a, b) => a - b);
      expect(levels).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    });

    test('every floor has at least one agent', () => {
      for (const floor of floors) {
        expect(floor.agents.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('total non-chairman agents across all floors equals 30', () => {
      const total = floors.reduce(
        (sum, f) => sum + f.agents.filter(a => a.id !== 'andrew').length,
        0
      );
      expect(total).toBe(30);
    });
  });
});
