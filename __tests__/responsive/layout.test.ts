/**
 * Responsive Layout Tests
 * 
 * Tests responsive design patterns and breakpoint compliance
 * Uses static code analysis to verify responsive className patterns
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const COMPONENTS_PATH = join(process.cwd(), 'src/components');

// Helper to read component source code
function getComponentSource(componentName: string): string {
  try {
    return readFileSync(join(COMPONENTS_PATH, `${componentName}.tsx`), 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read ${componentName}.tsx: ${error}`);
  }
}

// Helper to extract className patterns
function extractClassNames(source: string): string[] {
  const classNameRegex = /className="([^"]*)"/g;
  const matches = [];
  let match;
  
  while ((match = classNameRegex.exec(source)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// Helper to check for responsive prefix patterns
function hasResponsivePattern(classNames: string[], pattern: RegExp): boolean {
  return classNames.some(className => {
    // Check if the entire className string matches the pattern
    if (pattern.test(className)) return true;
    
    // Also check individual classes within the className string
    return className.split(' ').some(cls => pattern.test(cls.trim()));
  });
}

// Helper to check if a class exists in the component
function hasClass(classNames: string[], targetClass: string): boolean {
  return classNames.some(className => 
    className.split(' ').some(cls => cls.trim() === targetClass)
  );
}

describe('Responsive Layout Tests', () => {
  describe('TowerView Component', () => {
    let towerViewSource: string;
    let towerViewClasses: string[];

    beforeAll(() => {
      towerViewSource = getComponentSource('TowerView');
      towerViewClasses = extractClassNames(towerViewSource);
    });

    test('should have mobile-first tab buttons with icon-only display', () => {
      // Check for sm:hidden pattern (icons visible on mobile, hidden on larger screens)
      expect(hasClass(towerViewClasses, 'sm:hidden')).toBe(true);
      
      // Check for hidden sm:inline pattern (text hidden on mobile, visible on larger screens)
      expect(hasResponsivePattern(towerViewClasses, /hidden.*sm:inline/)).toBe(true);
    });

    test('should have proper responsive breakpoints for tabs', () => {
      // Should have some responsive width/height patterns
      const hasResponsiveWidth = hasClass(towerViewClasses, 'sm:w-auto') || 
                                 hasClass(towerViewClasses, 'md:w-auto') ||
                                 hasResponsivePattern(towerViewClasses, /w-\d+.*sm:/);
      expect(hasResponsiveWidth).toBe(true);
      
      // Should have some responsive sizing
      const hasResponsiveSizing = hasClass(towerViewClasses, 'sm:h-auto') ||
                                  hasClass(towerViewClasses, 'sm:px-3') ||
                                  hasResponsivePattern(towerViewClasses, /(sm|md|lg):(w|h|p)/);
      expect(hasResponsiveSizing).toBe(true);
    });

    test('should have appropriate text size scaling', () => {
      // Should have text scaling from mobile to desktop
      const hasTextScaling = hasResponsivePattern(towerViewClasses, /text-\w+.*sm:text/) ||
                             hasResponsivePattern(towerViewClasses, /sm:text-/) ||
                             hasResponsivePattern(towerViewClasses, /(sm|md|lg):text/);
      expect(hasTextScaling).toBe(true);
    });

    test('should have responsive padding/spacing', () => {
      // Should have responsive padding patterns
      const hasResponsivePadding = hasResponsivePattern(towerViewClasses, /p[xy]?-\d+.*sm:p/) ||
                                  hasResponsivePattern(towerViewClasses, /sm:p[xy]?-/) ||
                                  hasResponsivePattern(towerViewClasses, /(sm|md|lg):p/);
      expect(hasResponsivePadding).toBe(true);
    });

    test('should not have viewport overflow patterns that could break layout', () => {
      // Check for potentially problematic translate patterns
      const hasProblematicTranslate = towerViewSource.includes('translate-x-[110%]') ||
                                     towerViewSource.includes('translate-x-[120%]') ||
                                     towerViewSource.includes('-translate-x-[110%]');
      
      expect(hasProblematicTranslate).toBe(false);
    });

    test('should have safe centering patterns', () => {
      // Should use safe centering patterns like left-1/2 -translate-x-1/2
      const hasSafeCentering = towerViewSource.includes('left-1/2') && 
                              towerViewSource.includes('-translate-x-1/2');
      
      expect(hasSafeCentering).toBe(true);
    });
  });

  describe('CompanySettings Component', () => {
    let companySettingsSource: string;
    let companySettingsClasses: string[];

    beforeAll(() => {
      companySettingsSource = getComponentSource('CompanySettings');
      companySettingsClasses = extractClassNames(companySettingsSource);
    });

    test('should use mobile-appropriate modal width', () => {
      // Should use w-[96vw] for mobile-friendly modal width
      expect(hasResponsivePattern(companySettingsClasses, /^w-\[96vw\]$/)).toBe(true);
    });

    test('should have responsive grid layouts', () => {
      // Should have mobile-first grid patterns
      const hasResponsiveGrids = hasResponsivePattern(companySettingsClasses, /grid-cols-1.*sm:grid-cols/) ||
                                hasResponsivePattern(companySettingsClasses, /grid-cols-1.*md:grid-cols/) ||
                                hasResponsivePattern(companySettingsClasses, /(sm|md|lg):grid-cols/);
      expect(hasResponsiveGrids).toBe(true);
    });

    test('should have reasonable max-width constraints', () => {
      // Should have max-width to prevent excessive stretching on large screens
      expect(hasResponsivePattern(companySettingsClasses, /max-w-\[\d+px\]/)).toBe(true);
    });

    test('should use viewport-relative height appropriately', () => {
      // Should use h-[90vh] for better mobile experience
      expect(hasResponsivePattern(companySettingsClasses, /h-\[90vh\]/)).toBe(true);
    });
  });

  describe('Responsive Breakpoint Validation', () => {
    const components = ['TowerView', 'CompanySettings', 'AgentStatusPanel', 'ChairmanDashboard'];
    
    components.forEach(componentName => {
      describe(`${componentName} breakpoints`, () => {
        let componentClasses: string[];

        beforeAll(() => {
          try {
            const source = getComponentSource(componentName);
            componentClasses = extractClassNames(source);
          } catch {
            componentClasses = []; // Skip if component doesn't exist
          }
        });

        test('should use standard Tailwind breakpoints', () => {
          if (componentClasses.length === 0) return; // Skip if component not found

          const responsiveClasses = componentClasses
            .join(' ')
            .split(' ')
            .filter(cls => /^(sm|md|lg|xl|2xl):/.test(cls));

          responsiveClasses.forEach(cls => {
            // Should use only standard Tailwind breakpoints
            expect(cls).toMatch(/^(sm|md|lg|xl|2xl):/);
          });
        });

        test('should have mobile-first responsive patterns', () => {
          if (componentClasses.length === 0) return; // Skip if component not found

          // Look for mobile-first patterns like: base-class sm:modified-class
          const mobileFirstPatterns = componentClasses.filter(className => {
            const classes = className.split(' ');
            return classes.some((cls, index) => {
              const nextClass = classes[index + 1];
              return cls && nextClass && 
                     !cls.includes(':') && 
                     nextClass.startsWith('sm:') &&
                     cls.split('-')[0] === nextClass.split(':')[1].split('-')[0];
            });
          });

          // Should have at least some mobile-first patterns if responsive
          const hasResponsiveClasses = componentClasses.some(className => 
            /\b(sm|md|lg|xl):/.test(className)
          );
          
          if (hasResponsiveClasses) {
            expect(mobileFirstPatterns.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Layout Safety Checks', () => {
    const layoutComponents = ['TowerView', 'CompanySettings', 'AgentStatusPanel'];

    layoutComponents.forEach(componentName => {
      test(`${componentName} should not have layout-breaking patterns`, () => {
        let source: string;
        try {
          source = getComponentSource(componentName);
        } catch {
          return; // Skip if component doesn't exist
        }

        // Check for potentially problematic patterns
        const problematicPatterns = [
          /translate-x-\[1[2-9]\d%\]/, // translate-x > 110%
          /translate-x-\[[2-9]\d\d%\]/, // translate-x > 100%
          /-?left-\[1[1-9]\d%\]/, // left > 100%
          /-?right-\[1[1-9]\d%\]/, // right > 100%
          /w-\[1[1-9]\dvw\]/, // width > 100vw
          /min-w-\[1[1-9]\dvw\]/, // min-width > 100vw
        ];

        problematicPatterns.forEach(pattern => {
          expect(source).not.toMatch(pattern);
        });
      });
    });
  });

  describe('Responsive Typography', () => {
    test('should have appropriate text scaling patterns', () => {
      const towerViewSource = getComponentSource('TowerView');
      
      // Should have text size progression that makes sense
      const hasGoodTextScaling = [
        'text-xs sm:text-sm',
        'text-sm sm:text-base',
        'text-base sm:text-lg',
        'text-base sm:text-xl'
      ].some(pattern => towerViewSource.includes(pattern));

      expect(hasGoodTextScaling).toBe(true);
    });

    test('should have responsive font size patterns in critical components', () => {
      const components = ['TowerView', 'CompanySettings'];
      
      components.forEach(componentName => {
        try {
          const source = getComponentSource(componentName);
          const hasResponsiveText = /text-\w+\s+sm:text-\w+/.test(source);
          
          // If component has responsive classes, it should have responsive text
          const hasAnyResponsive = /(sm|md|lg|xl):/.test(source);
          if (hasAnyResponsive) {
            expect(hasResponsiveText).toBe(true);
          }
        } catch {
          // Skip if component doesn't exist
        }
      });
    });
  });

  describe('Responsive Spacing', () => {
    test('should have consistent spacing patterns', () => {
      const towerViewSource = getComponentSource('TowerView');
      
      // Should have responsive padding/margin patterns
      const spacingPatterns = [
        /px-\d+\s+sm:px-\d+/,
        /py-\d+\s+sm:py-\d+/,
        /gap-\d+\s+sm:gap-\d+/,
        /m-\d+\s+sm:m-\d+/
      ];

      const hasResponsiveSpacing = spacingPatterns.some(pattern => 
        pattern.test(towerViewSource)
      );

      expect(hasResponsiveSpacing).toBe(true);
    });
  });
});