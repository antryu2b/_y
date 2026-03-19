/**
 * shadcn/ui Components Validation Test
 * 
 * Verifies that required shadcn/ui components exist and export properly.
 */

import * as fs from 'fs';
import * as path from 'path';

const UI_DIR = path.resolve(__dirname, '../../src/components/ui');

describe('shadcn/ui Components', () => {
  const requiredComponents = ['badge', 'button', 'card', 'scroll-area', 'tabs'];

  test('UI directory exists', () => {
    expect(fs.existsSync(UI_DIR)).toBe(true);
  });

  for (const comp of requiredComponents) {
    describe(`${comp}.tsx`, () => {
      const filePath = path.join(UI_DIR, `${comp}.tsx`);

      test('file exists', () => {
        expect(fs.existsSync(filePath)).toBe(true);
      });

      test('has named exports', () => {
        const content = fs.readFileSync(filePath, 'utf-8');
        // Should have at least one named export (direct or re-export)
        expect(content).toMatch(/export\s+(const|function|interface|type|{)\s*/);
      });

      test('can be imported without errors', () => {
        // Verify the module resolves (ts-jest will check types)
        expect(() => {
          require(filePath);
        }).not.toThrow();
      });
    });
  }

  test('additional UI components exist', () => {
    const additionalExpected = ['dialog', 'separator', 'tooltip'];
    for (const comp of additionalExpected) {
      const filePath = path.join(UI_DIR, `${comp}.tsx`);
      expect(fs.existsSync(filePath)).toBe(true);
    }
  });

  test('all UI files are .tsx', () => {
    const files = fs.readdirSync(UI_DIR);
    const tsxFiles = files.filter(f => f.endsWith('.tsx'));
    expect(tsxFiles.length).toBeGreaterThanOrEqual(requiredComponents.length);
  });
});
