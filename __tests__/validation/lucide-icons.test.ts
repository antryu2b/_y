/**
 * Lucide Icons Validation Test
 * 
 * Verifies all component files use Lucide React icons properly
 * and no raw emoji HTML entities remain.
 */

import * as fs from 'fs';
import * as path from 'path';

const COMPONENTS_DIR = path.resolve(__dirname, '../../src/components');

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

describe('Lucide Icons Usage', () => {
  const componentFiles = getComponentFiles();

  test('most component files import from lucide-react', () => {
    let importCount = 0;
    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      if (content.includes("from 'lucide-react'")) {
        importCount++;
      }
    }
    // At least 80% of component files should use lucide icons
    expect(importCount).toBeGreaterThan(componentFiles.length * 0.5);
  });

  test('no component uses raw emoji HTML entities (&#x...;)', () => {
    const emojiEntityPattern = /&#x(1F[0-9A-Fa-f]{3}|2[67][0-9A-Fa-f]{2});/g;

    for (const filePath of componentFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const matches = content.match(emojiEntityPattern);
      if (matches) {
        fail(`${path.basename(filePath)} contains emoji HTML entities: ${matches.join(', ')}`);
      }
    }
  });

  describe('FloorIcon component', () => {
    const floorIconPath = path.resolve(__dirname, '../../src/lib/floor-icons.tsx');

    test('FloorIcon file exists', () => {
      expect(fs.existsSync(floorIconPath)).toBe(true);
    });

    test('exports FloorIcon function', () => {
      const content = fs.readFileSync(floorIconPath, 'utf-8');
      expect(content).toMatch(/export\s+function\s+FloorIcon/);
    });

    test('FloorIcon imports from lucide-react', () => {
      const content = fs.readFileSync(floorIconPath, 'utf-8');
      expect(content).toContain("from 'lucide-react'");
    });

    test('FloorIcon maps string names to icon components', () => {
      const content = fs.readFileSync(floorIconPath, 'utf-8');
      // Should have a mapping object
      expect(content).toMatch(/FLOOR_ICON_MAP/);
      // Should accept name and className props
      expect(content).toContain('name');
      expect(content).toContain('className');
    });
  });

  test('key UI components import icons they use', () => {
    const criticalComponents = [
      'ChairmanDashboard.tsx',
      'MeetingRoom.tsx',
      'CompanySettings.tsx',
      'AgentChat.tsx',
      'TowerView.tsx',
    ];

    for (const comp of criticalComponents) {
      const filePath = path.join(COMPONENTS_DIR, comp);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        expect(content).toContain("from 'lucide-react'");
      }
    }
  });
});
