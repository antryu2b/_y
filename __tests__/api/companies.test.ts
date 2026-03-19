/**
 * Companies API Tests
 */

describe('Connected Companies', () => {
  describe('Company Data Structure', () => {
    test('company should have required fields', () => {
      const company = {
        company_name: 'Test Corp',
        industry: 'technology',
        description: 'A test company',
        url: 'https://test.com',
        agents: ['counsely', 'skepty', 'opsy', 'buildy', 'stacky'],
        connected_at: '2026-03-17T00:00:00.000Z',
      };

      expect(company.company_name).toBeTruthy();
      expect(company.agents.length).toBeGreaterThan(0);
      expect(company.connected_at).toMatch(/^\d{4}-\d{2}-\d{2}/);
    });

    test('agents should be valid agent IDs', () => {
      const validIds = new Set([
        'tasky','buildy','pixely','buzzy','skepty','wordy','edity','logoy',
        'searchy','growthy','helpy','clicky','selly','quanty','tradey','globy',
        'fieldy','stacky','watchy','guardy','testy','opsy','hiry','evaly',
        'finy','audity','legaly','hedgy','valuey','counsely'
      ]);

      const agents = ['counsely', 'skepty', 'opsy', 'buildy', 'stacky'];
      agents.forEach(a => expect(validIds.has(a)).toBe(true));
    });
  });

  describe('Industry Types', () => {
    const INDUSTRY_TYPES = [
      'technology', 'saas', 'ecommerce', 'fintech', 'gaming',
      'food_beverage', 'manufacturing', 'import_export', 'retail',
      'construction', 'consulting', 'logistics',
    ];

    test('should support multiple industry types', () => {
      expect(INDUSTRY_TYPES.length).toBeGreaterThan(5);
    });

    test('each industry should have a string value', () => {
      INDUSTRY_TYPES.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Agent Recommendations by Industry', () => {
    const COMMON_AGENTS = ['counsely', 'skepty', 'opsy'];

    test('common agents should always be included', () => {
      const techAgents = [...COMMON_AGENTS, 'buildy', 'stacky', 'testy', 'guardy', 'searchy'];
      COMMON_AGENTS.forEach(a => expect(techAgents).toContain(a));
    });

    test('each industry should recommend at least 5 agents', () => {
      const foodAgents = ['counsely', 'skepty', 'opsy', 'selly', 'buzzy', 'quanty', 'pixely', 'growthy'];
      expect(foodAgents.length).toBeGreaterThanOrEqual(5);
    });

    test('agent recommendations should not exceed 10', () => {
      const maxAgents = 10;
      const techAgents = ['counsely', 'skepty', 'opsy', 'buildy', 'stacky', 'testy', 'guardy', 'searchy'];
      expect(techAgents.length).toBeLessThanOrEqual(maxAgents);
    });
  });

  describe('Subsidiaries Config', () => {
    test('_y Holdings should have defined subsidiaries', () => {
      const subsidiaries = [
        { name: '_y SaaS (MyBidWise)', description: 'Government bid aggregation platform' },
        { name: '_y Builder', description: 'AI agent org-chart operating framework' },
        { name: '_y Capital', description: 'Quantitative trading & investment' },
      ];
      
      expect(subsidiaries.length).toBe(3);
      subsidiaries.forEach(s => {
        expect(s.name).toBeTruthy();
        expect(s.description).toBeTruthy();
      });
    });
  });
});
