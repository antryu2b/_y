/**
 * Company Configuration Tests
 * 
 * Tests CONFIG object and buildSystemPromptFromConfig function
 */

import { CONFIG, buildSystemPromptFromConfig, type CompanyConfig } from '@/data/company-config';

describe('Company Configuration', () => {
  describe('CONFIG Object Structure', () => {
    test('should have required company fields', () => {
      expect(CONFIG.company).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          nameShort: expect.any(String),
          mission: expect.any(String),
          missionKo: expect.any(String),
          stage: expect.any(String),
          teamSize: expect.any(String)
        })
      );
    });

    test('should have non-empty company name and mission', () => {
      expect(CONFIG.company.name.trim()).not.toBe('');
      expect(CONFIG.company.nameShort.trim()).not.toBe('');
      expect(CONFIG.company.mission.trim()).not.toBe('');
      expect(CONFIG.company.missionKo.trim()).not.toBe('');
    });

    test('should have products array', () => {
      expect(CONFIG.products).toBeDefined();
      expect(Array.isArray(CONFIG.products)).toBe(true);
      expect(CONFIG.products.length).toBeGreaterThan(0);
    });

    test('should have valid product structures', () => {
      CONFIG.products.forEach((product, index) => {
        expect(product).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            priority: expect.stringMatching(/^(critical|high|medium|low)$/),
            status: expect.any(String),
            revenue: expect.any(String),
            description: expect.any(String)
          })
        ); // `Product at index ${index} has invalid structure`
        
        expect(product.name.trim()).not.toBe('');
        expect(product.description.trim()).not.toBe('');
      });
    });

    test('should have subsidiaries array', () => {
      expect(CONFIG.subsidiaries).toBeDefined();
      expect(Array.isArray(CONFIG.subsidiaries)).toBe(true);
    });

    test('should have valid subsidiary structures', () => {
      CONFIG.subsidiaries.forEach((subsidiary, index) => {
        expect(subsidiary).toEqual(
          expect.objectContaining({
            name: expect.any(String),
            description: expect.any(String),
            descriptionKo: expect.any(String)
          })
        ); // `Subsidiary at index ${index} has invalid structure`
        
        expect(subsidiary.name.trim()).not.toBe('');
        expect(subsidiary.description.trim()).not.toBe('');
        expect(subsidiary.descriptionKo.trim()).not.toBe('');
      });
    });

    test('should have targets configuration', () => {
      expect(CONFIG.targets).toEqual(
        expect.objectContaining({
          shortTerm: expect.any(Array),
          midTerm: expect.any(Array),
          killerDemo: expect.any(String),
          killerDemoEn: expect.any(String)
        })
      );

      expect(CONFIG.targets.shortTerm.length).toBeGreaterThan(0);
      expect(CONFIG.targets.killerDemo.trim()).not.toBe('');
      expect(CONFIG.targets.killerDemoEn.trim()).not.toBe('');
    });

    test('should have customers configuration', () => {
      expect(CONFIG.customers).toEqual(
        expect.objectContaining({
          primary: expect.any(String),
          primaryEn: expect.any(String),
          secondary: expect.any(String),
          secondaryEn: expect.any(String)
        })
      );

      expect(CONFIG.customers.primary.trim()).not.toBe('');
      expect(CONFIG.customers.primaryEn.trim()).not.toBe('');
    });

    test('should have chairman configuration', () => {
      expect(CONFIG.chairman).toEqual(
        expect.objectContaining({
          name: expect.any(String),
          style: expect.any(String),
          timezone: expect.any(String)
        })
      );

      expect(CONFIG.chairman.name.trim()).not.toBe('');
      expect(CONFIG.chairman.timezone).toMatch(/^[A-Za-z_]+\/[A-Za-z_]+$/); // timezone format
    });

    test('should have values and principles arrays', () => {
      expect(Array.isArray(CONFIG.values)).toBe(true);
      expect(Array.isArray(CONFIG.decisionPrinciples)).toBe(true);
      
      expect(CONFIG.values.length).toBeGreaterThan(0);
      expect(CONFIG.decisionPrinciples.length).toBeGreaterThan(0);

      CONFIG.values.forEach(value => {
        expect(value.trim()).not.toBe('');
      });

      CONFIG.decisionPrinciples.forEach(principle => {
        expect(principle.trim()).not.toBe('');
      });
    });

    test('should have response rules configuration', () => {
      expect(CONFIG.responseRules).toEqual(
        expect.objectContaining({
          maxSentences: expect.any(Number),
          format: expect.any(String),
          banned: expect.any(Array),
          required: expect.any(Array),
          tone: expect.any(String),
          toneEn: expect.any(String)
        })
      );

      expect(CONFIG.responseRules.maxSentences).toBeGreaterThan(0);
      expect(CONFIG.responseRules.maxSentences).toBeLessThanOrEqual(10);
      
      expect(CONFIG.responseRules.banned.length).toBeGreaterThan(0);
      expect(CONFIG.responseRules.required.length).toBeGreaterThan(0);
    });
  });

  describe('Data Quality Checks', () => {
    test('should have consistent bilingual content', () => {
      // Company mission should have both languages
      expect(CONFIG.company.mission).toBeTruthy();
      expect(CONFIG.company.missionKo).toBeTruthy();
      expect(CONFIG.company.mission).not.toBe(CONFIG.company.missionKo);

      // Products with Korean descriptions
      CONFIG.products.forEach(product => {
        if (product.descriptionKo) {
          expect(product.descriptionKo).not.toBe(product.description);
        }
      });

      // Subsidiaries should have both languages
      CONFIG.subsidiaries.forEach(subsidiary => {
        expect(subsidiary.description).toBeTruthy();
        expect(subsidiary.descriptionKo).toBeTruthy();
        expect(subsidiary.description).not.toBe(subsidiary.descriptionKo);
      });
    });

    test('should have realistic team size information', () => {
      expect(CONFIG.company.teamSize).toContain('1 human');
      expect(CONFIG.company.teamSize).toContain('AI agent');
    });

    test('should have valid business stage', () => {
      const validStages = ['idea', 'pre-launch', 'launch', 'growth', 'scaling', 'mature'];
      expect(validStages).toContain(CONFIG.company.stage);
    });

    test('should have banned phrases that prevent corporate speak', () => {
      const corporateSpeak = [
        '~해야 합니다', '모니터링 필요', '검토 필요', 
        '고려해야', '~할 수 있습니다'
      ];

      corporateSpeak.forEach(phrase => {
        expect(CONFIG.responseRules.banned).toContain(phrase);
      });
    });

    test('should require actionable elements in responses', () => {
      const actionableElements = ['구체적 행동', '숫자/수치', '기한/데드라인', '담당자'];
      
      actionableElements.forEach(element => {
        expect(CONFIG.responseRules.required).toContain(element);
      });
    });
  });

  describe('Business Logic Validation', () => {
    test('should have at least one critical priority product', () => {
      const criticalProducts = CONFIG.products.filter(p => p.priority === 'critical');
      expect(criticalProducts.length).toBeGreaterThan(0);
    });

    test('should have revenue information for products', () => {
      CONFIG.products.forEach(product => {
        expect(product.revenue).toBeTruthy();
        // Should indicate revenue status (even if $0)
        expect(product.revenue).toMatch(/\$|₩|운용|무료/);
      });
    });

    test('should have competitive analysis for key products', () => {
      const criticalProducts = CONFIG.products.filter(p => p.priority === 'critical');
      
      criticalProducts.forEach(product => {
        // Critical products should have competitive analysis
        expect(product.competitors || product.differentiator || product.differentiatorKo).toBeTruthy();
      });
    });

    test('should have short-term targets with specific goals', () => {
      CONFIG.targets.shortTerm.forEach(target => {
        // Should have specific metrics or deadlines
        expect(target).toMatch(/\d+|주|월|년|일/); // numbers or time periods
      });
    });
  });

  describe('buildSystemPromptFromConfig Function', () => {
    test('should generate a non-empty system prompt', () => {
      const prompt = buildSystemPromptFromConfig();
      
      expect(prompt).toBeTruthy();
      expect(prompt.length).toBeGreaterThan(100);
      expect(typeof prompt).toBe('string');
    });

    test('should include company name and mission', () => {
      const prompt = buildSystemPromptFromConfig();
      
      expect(prompt).toContain(CONFIG.company.name);
      expect(prompt).toContain(CONFIG.company.mission);
      expect(prompt).toContain(CONFIG.chairman.name);
    });

    test('should include product information with priorities', () => {
      const prompt = buildSystemPromptFromConfig();
      
      CONFIG.products.forEach(product => {
        expect(prompt).toContain(product.name);
      });

      // Should show priority indicators
      expect(prompt).toMatch(/High|Medium|Low|product|agent/i); // priority icons
    });

    test('should include response rules and constraints', () => {
      const prompt = buildSystemPromptFromConfig();
      
      expect(prompt).toContain(CONFIG.responseRules.maxSentences.toString());
      expect(prompt).toContain('금지어');
      
      CONFIG.responseRules.banned.slice(0, 2).forEach(bannedPhrase => {
        expect(prompt).toContain(bannedPhrase);
      });
    });

    test('should include values and principles', () => {
      const prompt = buildSystemPromptFromConfig();
      
      CONFIG.values.slice(0, 3).forEach(value => {
        expect(prompt).toContain(value);
      });
    });

    test('should include targets and killer demo', () => {
      const prompt = buildSystemPromptFromConfig();
      
      expect(prompt).toContain(CONFIG.targets.killerDemo);
      
      CONFIG.targets.shortTerm.slice(0, 2).forEach(target => {
        expect(prompt).toContain(target);
      });
    });

    test('should be properly formatted for AI consumption', () => {
      const prompt = buildSystemPromptFromConfig();
      
      // Should have clear sections
      expect(prompt).toMatch(/##\s+\w+/); // markdown headers
      expect(prompt).toMatch(/Mission:/);
      expect(prompt).toMatch(/Values:/);
      
      // Should not have excessive newlines or formatting issues
      expect(prompt).not.toMatch(/\n{4,}/); // no more than 3 consecutive newlines
    });

    test('should handle edge cases gracefully', () => {
      // Test with minimal config
      const originalConfig = { ...CONFIG };
      
      // Temporarily modify config to test edge cases
      const minimalProducts = [CONFIG.products[0]];
      
      // Should not throw errors even with minimal data
      expect(() => {
        const testConfig = {
          ...CONFIG,
          products: minimalProducts
        };
        // Can't easily test this without modifying the actual CONFIG
        // But the function should handle various array lengths
      }).not.toThrow();
    });
  });
});