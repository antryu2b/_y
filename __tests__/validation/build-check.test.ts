/**
 * Build / Project Structure Validation Tests
 * 
 * Ensures the project has required files, scripts, and config.
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');

describe('Build & Project Structure', () => {
  describe('package.json scripts', () => {
    let pkg: any;

    beforeAll(() => {
      const content = fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8');
      pkg = JSON.parse(content);
    });

    const requiredScripts = ['dev', 'build', 'start', 'chat-worker'];

    for (const script of requiredScripts) {
      test(`has "${script}" script`, () => {
        expect(pkg.scripts).toHaveProperty(script);
        expect(typeof pkg.scripts[script]).toBe('string');
        expect(pkg.scripts[script].length).toBeGreaterThan(0);
      });
    }

    test('has test script', () => {
      expect(pkg.scripts).toHaveProperty('test');
    });
  });

  describe('Required project files', () => {
    test('LICENSE file exists', () => {
      expect(fs.existsSync(path.join(ROOT, 'LICENSE'))).toBe(true);
    });

    test('README.md exists and has content', () => {
      const readmePath = path.join(ROOT, 'README.md');
      expect(fs.existsSync(readmePath)).toBe(true);
      const content = fs.readFileSync(readmePath, 'utf-8');
      expect(content.length).toBeGreaterThan(100);
    });

    test('.env.example exists', () => {
      expect(fs.existsSync(path.join(ROOT, '.env.example'))).toBe(true);
    });

    test('.gitignore exists', () => {
      expect(fs.existsSync(path.join(ROOT, '.gitignore'))).toBe(true);
    });
  });

  describe('.gitignore coverage', () => {
    let gitignore: string;

    beforeAll(() => {
      gitignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf-8');
    });

    test('ignores node_modules', () => {
      expect(gitignore).toMatch(/node_modules/);
    });

    test('ignores .next/', () => {
      expect(gitignore).toMatch(/\.next/);
    });

    test('ignores env files', () => {
      expect(gitignore).toMatch(/\.env/);
    });
  });
});
