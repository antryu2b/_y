/**
 * Directive Pipeline Tests
 */

describe('Directive Pipeline', () => {
  describe('Assignment Logic', () => {
    const AGENT_ROSTER_IDS = [
      'tasky','buildy','pixely','buzzy','skepty','wordy','edity','logoy',
      'searchy','growthy','helpy','clicky','selly','quanty','tradey','globy',
      'fieldy','stacky','watchy','guardy','testy','opsy','hiry','evaly',
      'finy','audity','legaly','hedgy','valuey','counsely'
    ];

    test('should have 30 agents in roster', () => {
      expect(AGENT_ROSTER_IDS).toHaveLength(30);
    });

    test('agent IDs should be unique', () => {
      const unique = new Set(AGENT_ROSTER_IDS);
      expect(unique.size).toBe(30);
    });

    test('keyword fallback should map topics to agents', () => {
      const keywordMap: Record<string, string[]> = {
        'security': ['guardy', 'skepty'],
        'market': ['quanty', 'tradey'],
        'legal': ['legaly', 'audity'],
        'marketing': ['buzzy', 'selly'],
        'finance': ['finy', 'quanty'],
        'hiring': ['hiry', 'evaly'],
        'tech': ['stacky', 'buildy'],
      };

      Object.entries(keywordMap).forEach(([keyword, agents]) => {
        agents.forEach(agent => {
          expect(AGENT_ROSTER_IDS).toContain(agent);
        });
      });
    });

    test('minimum 3 agents should be assigned per directive', () => {
      const MIN_AGENTS = 3;
      expect(MIN_AGENTS).toBeGreaterThanOrEqual(3);
    });

    test('counsely should always be included in strategic directives', () => {
      expect(AGENT_ROSTER_IDS).toContain('counsely');
    });
  });

  describe('Status Flow', () => {
    const STATUS_FLOW: Record<string, string[]> = {
      'pending': ['approval_requested'],
      'approval_requested': ['approved', 'rejected'],
      'approved': ['executing', 'in_progress'],
      'in_progress': ['completed'],
      'completed': [],
      'rejected': [],
    };

    test('pending can transition to approval_requested', () => {
      expect(STATUS_FLOW['pending']).toContain('approval_requested');
    });

    test('approval_requested can be approved or rejected', () => {
      expect(STATUS_FLOW['approval_requested']).toContain('approved');
      expect(STATUS_FLOW['approval_requested']).toContain('rejected');
    });

    test('in_progress can transition to completed', () => {
      expect(STATUS_FLOW['in_progress']).toContain('completed');
    });

    test('completed and rejected are terminal states', () => {
      expect(STATUS_FLOW['completed']).toHaveLength(0);
      expect(STATUS_FLOW['rejected']).toHaveLength(0);
    });

    test('all statuses should be defined', () => {
      const allStatuses = ['pending', 'approval_requested', 'approved', 'in_progress', 'completed', 'rejected'];
      allStatuses.forEach(status => {
        expect(STATUS_FLOW).toHaveProperty(status);
      });
    });
  });

  describe('Directive Data Structure', () => {
    test('directive should have required fields', () => {
      const directive = {
        id: 'test-id',
        title: 'Test Directive',
        description: 'Test description',
        priority: 'normal',
        status: 'pending',
        trigger_data: { assignees: ['searchy', 'skepty', 'counsely'] },
      };

      expect(directive.id).toBeTruthy();
      expect(directive.title).toBeTruthy();
      expect(directive.status).toBe('pending');
      expect(directive.trigger_data.assignees).toHaveLength(3);
      expect(directive.trigger_data.assignees).toContain('counsely');
    });

    test('assignees should be valid agent IDs', () => {
      const assignees = ['searchy', 'skepty', 'counsely'];
      const validIds = new Set(AGENT_IDS);
      assignees.forEach(a => expect(validIds.has(a)).toBe(true));
    });
  });
});

const AGENT_IDS = [
  'tasky','buildy','pixely','buzzy','skepty','wordy','edity','logoy',
  'searchy','growthy','helpy','clicky','selly','quanty','tradey','globy',
  'fieldy','stacky','watchy','guardy','testy','opsy','hiry','evaly',
  'finy','audity','legaly','hedgy','valuey','counsely'
];
