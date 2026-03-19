/**
 * Emoji-Free Validation Test
 * 
 * Ensures no emoji characters remain in rendered component JSX.
 * Excludes comments, console statements, and test files.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

// Comprehensive emoji regex pattern
const EMOJI_PATTERN = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{231A}-\u{231B}\u{23E9}-\u{23F3}\u{23F8}-\u{23FA}\u{25AA}-\u{25AB}\u{25B6}\u{25C0}\u{25FB}-\u{25FE}\u{2614}-\u{2615}\u{2648}-\u{2653}\u{267F}\u{2693}\u{26A1}\u{26AA}-\u{26AB}\u{26BD}-\u{26BE}\u{26C4}-\u{26C5}\u{26CE}\u{26D4}\u{26EA}\u{26F2}-\u{26F3}\u{26F5}\u{26FA}\u{26FD}\u{2702}\u{2705}\u{2708}-\u{270D}\u{270F}]/gu;

function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed.startsWith('//') ||
    trimmed.startsWith('*') ||
    trimmed.startsWith('/*') ||
    trimmed.includes('console.log') ||
    trimmed.includes('console.warn') ||
    trimmed.includes('console.error')
  );
}

function getComponentFiles(): string[] {
  const files: string[] = [];
  const entries = fs.readdirSync(COMPONENTS_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.tsx')) {
      files.push(path.join(COMPONENTS_DIR, entry.name));
    }
  }
  return files;
}

describe('Emoji-Free Components', () => {
  const componentFiles = getComponentFiles();

  test('found component files to scan', () => {
    expect(componentFiles.length).toBeGreaterThan(10);
  });

  for (const filePath of componentFiles) {
    const fileName = path.basename(filePath);

    test(`${fileName} contains no emoji in rendered code`, () => {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const violations: string[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (isSkippableLine(line)) continue;

        const matches = line.match(EMOJI_PATTERN);
        if (matches) {
          violations.push(
            `Line ${i + 1}: found ${matches.join(', ')} in: ${line.trim().substring(0, 80)}`
          );
        }
      }

      expect(violations).toEqual([]);
    });
  }

  test('total emoji count across all components is 0', () => {
    let totalEmoji = 0;
    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        if (isSkippableLine(line)) continue;
        const matches = line.match(EMOJI_PATTERN);
        if (matches) totalEmoji += matches.length;
      }
    }
    expect(totalEmoji).toBe(0);
  });
});
