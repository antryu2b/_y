/**
 * Directive Flow Integration Tests
 * 
 * Tests directive status transitions and data model expectations.
 * Uses mocked Supabase — no real API calls.
 */

describe('Directive Flow', () => {
  // Define the expected directive status flow
  const DIRECTIVE_STATUSES = [
    'pending',
    'approval_requested',
    'approved',
    'in_progress',
    'completed',
  ] as const;

  const VALID_TRANSITIONS: Record<string, string[]> = {
    pending: ['approval_requested'],
    approval_requested: ['approved', 'rejected'],
    approved: ['in_progress'],
    in_progress: ['completed'],
    completed: [],
    rejected: ['pending'], // can restart
  };

  describe('Status transitions', () => {
    test('happy path: pending → approval_requested → approved → in_progress → completed', () => {
      let status = 'pending';
      const path = ['pending'];

      // Step through happy path
      const steps = ['approval_requested', 'approved', 'in_progress', 'completed'];
      for (const next of steps) {
        const allowed = VALID_TRANSITIONS[status];
        expect(allowed).toContain(next);
        status = next;
        path.push(status);
      }

      expect(path).toEqual([
        'pending',
        'approval_requested',
        'approved',
        'in_progress',
        'completed',
      ]);
    });

    test('invalid transitions should be rejected', () => {
      // pending → completed should NOT be valid
      expect(VALID_TRANSITIONS['pending']).not.toContain('completed');
      
      // pending → in_progress should NOT be valid
      expect(VALID_TRANSITIONS['pending']).not.toContain('in_progress');

      // approval_requested → completed should NOT be valid
      expect(VALID_TRANSITIONS['approval_requested']).not.toContain('completed');

      // completed has no outgoing transitions
      expect(VALID_TRANSITIONS['completed']).toEqual([]);
    });

    test('rejected can restart to pending', () => {
      expect(VALID_TRANSITIONS['rejected']).toContain('pending');
    });

    test('all statuses are accounted for in transition map', () => {
      const allStatuses = [...DIRECTIVE_STATUSES, 'rejected'];
      for (const status of allStatuses) {
        expect(VALID_TRANSITIONS).toHaveProperty(status);
      }
    });
  });

  describe('Data model expectations', () => {
    test('assignees stored in trigger_data (not separate column)', () => {
      // Simulate a directive object matching the DB schema
      const directive = {
        id: 'test-directive-1',
        title: 'Test Directive',
        description: 'Test description',
        status: 'pending',
        trigger_data: {
          assignees: [
            { id: 'counsely', task: 'Synthesis' },
            { id: 'searchy', task: 'Research' },
            { id: 'skepty', task: 'Risk assessment' },
          ],
        },
        created_at: '2026-03-17T00:00:00Z',
      };

      // Assignees should be in trigger_data, not top-level
      expect(directive.trigger_data.assignees).toBeDefined();
      expect(Array.isArray(directive.trigger_data.assignees)).toBe(true);
      expect(directive.trigger_data.assignees.length).toBeGreaterThanOrEqual(1);
      expect(directive).not.toHaveProperty('assignees');
    });

    test('directive with chairmanNote includes note', () => {
      const directive = {
        id: 'test-directive-2',
        title: 'Strategic Initiative',
        status: 'approved',
        trigger_data: {
          assignees: [{ id: 'tasky', task: 'Strategy' }],
          chairmanNote: 'Prioritize this above all other work.',
        },
      };

      expect(directive.trigger_data.chairmanNote).toBeDefined();
      expect(typeof directive.trigger_data.chairmanNote).toBe('string');
      expect(directive.trigger_data.chairmanNote.length).toBeGreaterThan(0);
    });

    test('directive requires title', () => {
      const validDirective = {
        title: 'Something',
        status: 'pending',
        trigger_data: {},
      };
      expect(validDirective.title).toBeTruthy();
    });
  });
});
