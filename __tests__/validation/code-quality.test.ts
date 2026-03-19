/**
 * Code Quality Validation Tests
 * 
 * Scans source files for common issues:
 * - Hardcoded API keys
 * - console.log in production routes
 * - API route exports
 * - Agent config consistency
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');

function findFiles(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findFiles(full, ext));
    } else if (ext.some(e => entry.name.endsWith(e))) {
      results.push(full);
    }
  }
  return results;
}

describe('Code Quality', () => {
  describe('No hardcoded API keys', () => {
    const patterns = [
      { name: 'Google API key', regex: /AIzaSy[A-Za-z0-9_-]{33}/ },
      // Note: eyJhbG matches Supabase anon keys which are public by design — excluded
      // { name: 'JWT token', regex: /eyJhbG[A-Za-z0-9_-]{20,}/ },
      { name: 'Anthropic key', regex: /sk-ant-[A-Za-z0-9_-]{20,}/ },
      { name: 'PDL key', regex: /pdl_live[A-Za-z0-9_-]{20,}/ },
    ];

    const sourceFiles = findFiles(SRC, ['.ts', '.tsx']);

    test('should have source files to scan', () => {
      expect(sourceFiles.length).toBeGreaterThan(0);
    });

    for (const pattern of patterns) {
      test(`no ${pattern.name} in source files`, () => {
        const violations: string[] = [];
        for (const file of sourceFiles) {
          const content = fs.readFileSync(file, 'utf-8');
          if (pattern.regex.test(content)) {
            violations.push(path.relative(ROOT, file));
          }
        }
        expect(violations).toEqual([]);
      });
    }
  });

  describe('No console.log in production API routes', () => {
    const apiDir = path.join(SRC, 'app', 'api');
    const apiFiles = findFiles(apiDir, ['.ts', '.tsx']);

    test('should have API route files', () => {
      expect(apiFiles.length).toBeGreaterThan(0);
    });

    test('no console.log in API routes (except diagnose)', () => {
      // diagnose route has intentional logging for GitHub analysis debugging
      const violations: { file: string; line: number }[] = [];
      for (const file of apiFiles) {
        const relPath = path.relative(ROOT, file);
        // Allow console.log in diagnose route (debugging heavy analysis)
        if (relPath.includes('diagnose')) continue;

        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          // Skip commented lines
          const trimmed = line.trim();
          if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
          if (/console\.log\(/.test(line)) {
            violations.push({ file: relPath, line: idx + 1 });
          }
        });
      }
      expect(violations).toEqual([]);
    });
  });

  describe('API routes export HTTP methods', () => {
    const apiDir = path.join(SRC, 'app', 'api');
    const routeFiles = findFiles(apiDir, ['.ts']).filter(f => f.endsWith('route.ts'));

    test('should have route files', () => {
      expect(routeFiles.length).toBeGreaterThan(0);
    });

    test('each route exports at least one HTTP method', () => {
      const httpMethods = /export\s+(async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/;
      const violations: string[] = [];
      for (const file of routeFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        if (!httpMethods.test(content)) {
          violations.push(path.relative(ROOT, file));
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('Agent roster integrity', () => {
    // Dynamic import to use module resolution
    let AGENT_ROSTER: any[];

    beforeAll(async () => {
      const mod = await import('@/data/agent-config');
      AGENT_ROSTER = mod.AGENT_ROSTER;
    });

    test('no duplicate agent IDs', () => {
      const ids = AGENT_ROSTER.map((a: any) => a.id);
      const seen = new Set<string>();
      const dupes: string[] = [];
      for (const id of ids) {
        if (seen.has(id)) dupes.push(id);
        seen.add(id);
      }
      expect(dupes).toEqual([]);
    });

    test('all agent images exist in public/agents/', () => {
      const agentsDir = path.join(ROOT, 'public', 'agents');
      const missing: string[] = [];
      for (const agent of AGENT_ROSTER) {
        const imagePath = (agent as any).number + '-' + (agent as any).id + '.png';
        const fullPath = path.join(agentsDir, imagePath);
        if (!fs.existsSync(fullPath)) {
          missing.push(`${(agent as any).id}: ${imagePath}`);
        }
      }
      expect(missing).toEqual([]);
    });
  });

  describe('No dead imports', () => {
    const componentFiles = findFiles(path.join(SRC, 'components'), ['.ts', '.tsx']);
    const pageFiles = findFiles(path.join(SRC, 'app'), ['.ts', '.tsx']).filter(f => !f.includes('/api/'));

    const allFiles = [...componentFiles, ...pageFiles];

    test('no imports of known deleted files', () => {
      // Known deleted/deprecated file patterns
      const deadImports = [
        /from\s+['"].*SimulationPanel['"]/,
        /from\s+['"].*URLDiagnosis['"]/,
      ];

      const violations: { file: string; pattern: string }[] = [];
      for (const file of allFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        for (const pattern of deadImports) {
          if (pattern.test(content)) {
            // Check if the file actually uses (imports) the component, not just defines it
            const relPath = path.relative(ROOT, file);
            // Skip the actual definition files themselves
            if (relPath.includes('SimulationPanel') || relPath.includes('URLDiagnosis')) continue;
            violations.push({ file: relPath, pattern: pattern.source });
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });
});
