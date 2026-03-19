/**
 * Floors Configuration Tests
 * 
 * Tests floors data structure and agent distribution across floors
 */

import { floors, type Floor, type Agent } from '@/data/floors';

describe('Floors Configuration', () => {
  describe('Floor Structure', () => {
    test('should have exactly 10 floors', () => {
      expect(floors).toHaveLength(10);
    });

    test('should have all required fields for each floor', () => {
      floors.forEach((floor, index) => {
        expect(floor).toEqual(
          expect.objectContaining({
            level: expect.any(Number),
            label: expect.any(String),
            emoji: expect.any(String),
            department: expect.any(String),
            departmentEn: expect.any(String),
            deptShort: expect.any(String),
            deptShortEn: expect.any(String),
            color: expect.any(String),
            agents: expect.any(Array)
          })
        ); // `Floor at index ${index} is missing required fields`
      });
    });

    test('should have levels 1-10 without gaps', () => {
      const levels = floors.map(floor => floor.level).sort((a, b) => a - b);
      const expectedLevels = Array.from({ length: 10 }, (_, i) => i + 1);
      
      expect(levels).toEqual(expectedLevels);
    });

    test('should have unique floor levels', () => {
      const levels = floors.map(floor => floor.level);
      const uniqueLevels = new Set(levels);
      
      expect(uniqueLevels.size).toBe(levels.length);
    });

    test('should have valid hex colors', () => {
      floors.forEach(floor => {
        expect(floor.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    test('should have non-empty department names', () => {
      floors.forEach(floor => {
        expect(floor.department.trim()).not.toBe('');
        expect(floor.departmentEn.trim()).not.toBe('');
        expect(floor.deptShort.trim()).not.toBe('');
        expect(floor.deptShortEn.trim()).not.toBe('');
      });
    });
  });

  describe('Agent Distribution', () => {
    test('should have at least one agent per floor', () => {
      floors.forEach(floor => {
        expect(floor.agents.length).toBeGreaterThan(0);
      });
    });

    test('should have properly structured agents', () => {
      floors.forEach(floor => {
        floor.agents.forEach((agent, agentIndex) => {
          expect(agent).toEqual(
            expect.objectContaining({
              id: expect.any(String),
              number: expect.any(String),
              name: expect.any(String),
              image: expect.any(String),
              department: expect.any(String),
              floor: expect.any(Number),
              role: expect.any(String),
              status: expect.stringMatching(/^(working|meeting|idle)$/)
            })
          ); // `Agent at index ${agentIndex} on floor ${floor.level} has invalid structure`
          
          // Agent's floor should match the floor they're on
          expect(agent.floor).toBe(floor.level);
        });
      });
    });

    test('should have unique agent IDs across all floors', () => {
      const allAgentIds: string[] = [];
      
      floors.forEach(floor => {
        floor.agents.forEach(agent => {
          allAgentIds.push(agent.id);
        });
      });

      const uniqueIds = new Set(allAgentIds);
      expect(uniqueIds.size).toBe(allAgentIds.length);
    });

    test('should have unique agent numbers across all floors', () => {
      const allAgentNumbers: string[] = [];
      
      floors.forEach(floor => {
        floor.agents.forEach(agent => {
          allAgentNumbers.push(agent.number);
        });
      });

      const uniqueNumbers = new Set(allAgentNumbers);
      expect(uniqueNumbers.size).toBe(allAgentNumbers.length);
    });

    test('should have proper image paths', () => {
      floors.forEach(floor => {
        floor.agents.forEach(agent => {
          expect(agent.image).toMatch(/^\/agents\/\d+-.+\.png$/);
          
          // Image path should start with agent number and be a PNG file
          expect(agent.image).toContain(`/agents/${agent.number}-`);
          expect(agent.image).toContain('.png');
        });
      });
    });
  });

  describe('Organizational Structure', () => {
    test('should have Chairman office on top floor (10F)', () => {
      const topFloor = floors.find(floor => floor.level === 10);
      expect(topFloor).toBeDefined();
      expect(topFloor!.department).toContain("Chairman");
    });

    test('should have lobby/entrance on ground floor (1F)', () => {
      const groundFloor = floors.find(floor => floor.level === 1);
      expect(groundFloor).toBeDefined();
      expect(groundFloor!.department.toLowerCase()).toContain("lobby");
    });

    test('should have reasonable agent distribution', () => {
      // No floor should have too many agents (organizational limits)
      floors.forEach(floor => {
        expect(floor.agents.length).toBeLessThanOrEqual(10);
      });

      // Total agents should be reasonable for a company
      const totalAgents = floors.reduce((sum, floor) => sum + floor.agents.length, 0);
      expect(totalAgents).toBeGreaterThan(10);
      expect(totalAgents).toBeLessThanOrEqual(50);
    });

    test('should have consistent department assignment', () => {
      floors.forEach(floor => {
        floor.agents.forEach(agent => {
          // Agent department should match floor department or be a subdivision
          const floorDept = floor.department.toLowerCase();
          const agentDept = agent.department.toLowerCase();
          
          // Allow for exact match or agent dept contains floor dept keywords
          const isValidAssignment = agentDept === floorDept || 
                                   floorDept.includes(agentDept) ||
                                   agentDept.includes(floorDept) ||
                                   // Special case for subdivisions like "_y Capital", "_y SaaS"
                                   (floorDept.includes("_y") && agentDept.includes("_y"));
          
          expect(isValidAssignment).toBe(true);
        });
      });
    });
  });

  describe('Data Consistency', () => {
    test('should have consistent emoji/icon patterns', () => {
      floors.forEach(floor => {
        // Emoji should be a non-empty string (Lucide icon name)
        expect(floor.emoji.trim()).not.toBe('');
        expect(floor.emoji).toMatch(/^[a-z-]+$/); // Lucide icon naming pattern
      });
    });

    test('should have proper floor labels', () => {
      floors.forEach(floor => {
        // Floor label should follow pattern like "1F", "2F", etc.
        expect(floor.label).toBe(`${floor.level}F`);
      });
    });

    test('should have bilingual department names', () => {
      floors.forEach(floor => {
        // Both Korean and English department names should exist and differ
        expect(floor.department).toBeTruthy();
        expect(floor.departmentEn).toBeTruthy();
        
        // Short versions should also exist
        expect(floor.deptShort).toBeTruthy();
        expect(floor.deptShortEn).toBeTruthy();
        
        // Short versions should be shorter than full names
        expect(floor.deptShort.length).toBeLessThanOrEqual(floor.department.length);
        expect(floor.deptShortEn.length).toBeLessThanOrEqual(floor.departmentEn.length);
      });
    });
  });

  describe('Floor Hierarchy Logic', () => {
    test('should have strategic departments on higher floors', () => {
      const strategicKeywords = ['chairman', 'planning', 'coordination'];
      const strategicFloors = floors.filter(floor => 
        strategicKeywords.some(keyword => 
          floor.department.toLowerCase().includes(keyword)
        )
      );

      // Strategic departments should be on higher floors (7-10)
      strategicFloors.forEach(floor => {
        expect(floor.level).toBeGreaterThanOrEqual(7);
      });
    });

    test('should have operational departments on lower floors', () => {
      const operationalKeywords = ['lobby', 'operations', 'saas'];
      const operationalFloors = floors.filter(floor => 
        operationalKeywords.some(keyword => 
          floor.department.toLowerCase().includes(keyword)
        )
      );

      // Operational departments should be on lower floors (1-5)
      operationalFloors.forEach(floor => {
        expect(floor.level).toBeLessThanOrEqual(5);
      });
    });
  });
});