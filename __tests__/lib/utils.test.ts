/**
 * Utils Tests
 * 
 * Tests utility functions including cn() function
 */

import { cn } from '@/lib/utils';

describe('Utility Functions', () => {
  describe('cn() function', () => {
    test('should merge class names correctly', () => {
      const result = cn('flex', 'items-center', 'justify-center');
      expect(result).toBe('flex items-center justify-center');
    });

    test('should handle empty strings and undefined values', () => {
      const result = cn('flex', '', undefined, 'items-center', null);
      expect(result).toBe('flex items-center');
    });

    test('should handle conditional classes', () => {
      const isActive = true;
      const isDisabled = false;
      
      const result = cn(
        'base-class',
        isActive && 'active-class',
        isDisabled && 'disabled-class'
      );
      
      expect(result).toBe('base-class active-class');
    });

    test('should handle arrays of classes', () => {
      const result = cn(['flex', 'items-center'], 'justify-center');
      expect(result).toBe('flex items-center justify-center');
    });

    test('should handle Tailwind CSS conflicts correctly', () => {
      // Test that twMerge resolves conflicting classes
      const result = cn('px-2 px-4'); // px-4 should override px-2
      expect(result).toBe('px-4');
    });

    test('should handle complex conditional logic', () => {
      const size = 'large';
      const variant = 'primary';
      const disabled = false;
      
      const result = cn(
        'button-base',
        {
          'text-sm px-2 py-1': size === 'small',
          'text-base px-3 py-2': size === 'medium',
          'text-lg px-4 py-3': size === 'large'
        },
        {
          'bg-blue-500 text-white': variant === 'primary',
          'bg-gray-500 text-white': variant === 'secondary',
          'bg-transparent border': variant === 'outline'
        },
        disabled && 'opacity-50 cursor-not-allowed'
      );
      
      expect(result).toContain('button-base');
      expect(result).toContain('text-lg px-4 py-3');
      expect(result).toContain('bg-blue-500 text-white');
      expect(result).not.toContain('opacity-50');
    });

    test('should handle responsive classes correctly', () => {
      const result = cn(
        'w-full sm:w-auto',
        'text-sm sm:text-base lg:text-lg',
        'hidden sm:block'
      );
      
      expect(result).toContain('w-full sm:w-auto');
      expect(result).toContain('text-sm sm:text-base lg:text-lg');
      expect(result).toContain('hidden sm:block');
    });

    test('should handle hover, focus, and state modifiers', () => {
      const result = cn(
        'bg-blue-500 hover:bg-blue-600',
        'focus:outline-none focus:ring-2 focus:ring-blue-500',
        'active:bg-blue-700',
        'disabled:opacity-50'
      );
      
      expect(result).toContain('bg-blue-500 hover:bg-blue-600');
      expect(result).toContain('focus:outline-none focus:ring-2 focus:ring-blue-500');
      expect(result).toContain('active:bg-blue-700');
      expect(result).toContain('disabled:opacity-50');
    });

    test('should preserve custom CSS classes', () => {
      const result = cn(
        'flex items-center',
        'custom-component-class',
        'another-custom-class'
      );
      
      expect(result).toContain('flex items-center');
      expect(result).toContain('custom-component-class');
      expect(result).toContain('another-custom-class');
    });

    test('should handle dark mode classes correctly', () => {
      const result = cn(
        'bg-white dark:bg-gray-900',
        'text-gray-900 dark:text-white',
        'border-gray-200 dark:border-gray-700'
      );
      
      expect(result).toContain('bg-white dark:bg-gray-900');
      expect(result).toContain('text-gray-900 dark:text-white');
      expect(result).toContain('border-gray-200 dark:border-gray-700');
    });

    test('should merge conflicting background colors correctly', () => {
      const result = cn('bg-red-500', 'bg-blue-500');
      expect(result).toBe('bg-blue-500'); // Should keep the last one
    });

    test('should merge conflicting text colors correctly', () => {
      const result = cn('text-red-500', 'text-blue-500');
      expect(result).toBe('text-blue-500'); // Should keep the last one
    });

    test('should merge conflicting padding correctly', () => {
      const result = cn('p-2', 'p-4', 'px-6');
      expect(result).toBe('p-4 px-6'); // px-6 should override p-4's horizontal padding
    });

    test('should merge conflicting margin correctly', () => {
      const result = cn('m-2', 'm-4', 'mt-6');
      expect(result).toBe('m-4 mt-6'); // mt-6 should override m-4's top margin
    });

    test('should handle edge cases gracefully', () => {
      // Test with no arguments
      expect(cn()).toBe('');
      
      // Test with only falsy values
      expect(cn(false, null, undefined, '')).toBe('');
      
      // Test with only whitespace
      expect(cn('   ', '\t', '\n')).toBe('');
      
      // Test with duplicate classes
      expect(cn('flex flex flex')).toBe('flex');
    });

    test('should be performant with many classes', () => {
      const manyClasses = Array.from({ length: 100 }, (_, i) => `class-${i}`);
      
      const start = performance.now();
      const result = cn(...manyClasses);
      const end = performance.now();
      
      expect(result).toContain('class-0');
      expect(result).toContain('class-99');
      expect(end - start).toBeLessThan(10); // Should complete in less than 10ms
    });

    test('should handle typical component use cases', () => {
      // Button component
      const buttonClasses = cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        'bg-primary text-primary-foreground hover:bg-primary/90',
        'h-10 px-4 py-2'
      );
      
      expect(buttonClasses).toBeTruthy();
      expect(buttonClasses.length).toBeGreaterThan(50);
      
      // Card component
      const cardClasses = cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm'
      );
      
      expect(cardClasses).toBe('rounded-lg border bg-card text-card-foreground shadow-sm');
      
      // Input component
      const inputClasses = cn(
        'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
        'text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50'
      );
      
      expect(inputClasses).toBeTruthy();
      expect(inputClasses.length).toBeGreaterThan(100);
    });
  });

  describe('TypeScript Integration', () => {
    test('should accept various input types', () => {
      // Should accept strings
      expect(() => cn('class1', 'class2')).not.toThrow();
      
      // Should accept arrays
      expect(() => cn(['class1', 'class2'])).not.toThrow();
      
      // Should accept objects
      expect(() => cn({ active: true, disabled: false })).not.toThrow();
      
      // Should accept mixed types
      expect(() => cn('base', ['responsive', 'flex'], { active: true })).not.toThrow();
    });

    test('should have correct return type', () => {
      const result = cn('test');
      expect(typeof result).toBe('string');
    });
  });
});