/**
 * Feature Connectivity Test
 * 
 * Verifies that major UI components reference the correct API endpoints
 * by reading file content and checking for API path strings.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

function readComponent(name: string): string {
  const filePath = path.join(COMPONENTS_DIR, name);
  return fs.readFileSync(filePath, 'utf-8');
}

describe('Feature Connectivity - API Endpoint References', () => {
  describe('MeetingRoom', () => {
    const content = readComponent('MeetingRoom.tsx');

    test('references /api/meeting endpoint', () => {
      expect(content).toContain('/api/meeting');
    });

    test('references /api/simulate endpoint', () => {
      expect(content).toContain('/api/simulate');
    });
  });

  describe('CompanySettings', () => {
    const content = readComponent('CompanySettings.tsx');

    test('references /api/diagnose endpoint', () => {
      expect(content).toContain('/api/diagnose');
    });

    test('references /api/companies endpoint', () => {
      expect(content).toContain('/api/companies');
    });
  });

  describe('ChairmanDashboard', () => {
    const content = readComponent('ChairmanDashboard.tsx');

    test('references /api/decisions endpoint', () => {
      expect(content).toContain('/api/decisions');
    });

    test('references /api/directive paths', () => {
      const hasDirective = 
        content.includes('/api/directive/assign') ||
        content.includes('/api/directive/execute') ||
        content.includes('/api/directive/complete') ||
        content.includes('/api/directives');
      expect(hasDirective).toBe(true);
    });
  });

  describe('AgentChat', () => {
    const content = readComponent('AgentChat.tsx');

    test('references /api/chat endpoint', () => {
      expect(content).toContain('/api/chat');
    });
  });

  describe('GlassPanel', () => {
    const content = readComponent('GlassPanel.tsx');

    test('references API routes for data fetching', () => {
      const hasSupabase = 
        content.includes('fetch') ||
        content.includes('/api/') ||
        content.includes('handleReport');
      expect(hasSupabase).toBe(true);
    });
  });

  describe('Cross-component consistency', () => {
    test('API routes referenced by components actually exist as route files', () => {
      const apiDir = path.resolve(__dirname, '../../src/app/api');
      const apiPaths = [
        'meeting/route.ts',
        'simulate/route.ts',
        'diagnose/route.ts',
        'companies/route.ts',
        'decisions/route.ts',
        'directive/assign/route.ts',
        'directive/execute/route.ts',
        'chat/route.ts',
        'health/route.ts',
        'directives/route.ts',
      ];

      for (const apiPath of apiPaths) {
        const fullPath = path.join(apiDir, apiPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });
  });
});
