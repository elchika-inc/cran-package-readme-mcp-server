import { describe, it, expect } from 'vitest';
import { PackageExistenceChecker } from '../../src/services/package-existence-checker.js';

describe('PackageExistenceChecker (Simple)', () => {
  const checker = new PackageExistenceChecker();

  describe('basic functionality', () => {
    it('should have checkExists method', () => {
      expect(typeof checker.checkExists).toBe('function');
    });

    it('should return Promise from checkExists', () => {
      const result = checker.checkExists('test-package');
      expect(result).toBeInstanceOf(Promise);
    });

    it('should be instantiable', () => {
      const newChecker = new PackageExistenceChecker();
      expect(newChecker).toBeInstanceOf(PackageExistenceChecker);
      expect(typeof newChecker.checkExists).toBe('function');
    });
  });

  describe('singleton instance', () => {
    it('should provide a default instance', async () => {
      const module = await import('../../src/services/package-existence-checker.js');
      const { packageExistenceChecker } = module;
      
      expect(packageExistenceChecker).toBeInstanceOf(PackageExistenceChecker);
      expect(typeof packageExistenceChecker.checkExists).toBe('function');
    });

    it('should have consistent interface', async () => {
      const module = await import('../../src/services/package-existence-checker.js');
      const { packageExistenceChecker } = module;
      
      const result = packageExistenceChecker.checkExists('test');
      expect(result).toBeInstanceOf(Promise);
    });
  });

  describe('error handling structure', () => {
    it('should handle different input types without throwing synchronously', () => {
      // These should not throw immediately, but may return rejected promises
      expect(() => checker.checkExists('')).not.toThrow();
      expect(() => checker.checkExists('valid-name')).not.toThrow();
      expect(() => checker.checkExists('package.with.dots')).not.toThrow();
    });
  });
});