import { describe, it, expect } from 'vitest';
import { 
  validatePackageName, 
  validateSearchQuery, 
  validateLimit, 
  validateBoolean,
  isValidUrl,
  sanitizeString
} from '../../src/utils/validators.js';
import { CranPackageReadmeMcpError } from '../../src/types/index.js';

describe('validators', () => {
  describe('validatePackageName', () => {
    it('should accept valid package names', () => {
      expect(() => validatePackageName('ggplot2')).not.toThrow();
      expect(() => validatePackageName('dplyr')).not.toThrow();
      expect(() => validatePackageName('data.table')).not.toThrow();
      expect(() => validatePackageName('R.utils')).not.toThrow();
      expect(() => validatePackageName('package123')).not.toThrow();
    });

    it('should reject non-string package names', () => {
      expect(() => validatePackageName(undefined)).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName(null)).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName(123)).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName({})).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName([])).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName(true)).toThrow(CranPackageReadmeMcpError);
    });

    it('should reject empty package names', () => {
      expect(() => validatePackageName('')).toThrow(CranPackageReadmeMcpError);
      expect(() => validatePackageName('   ')).toThrow(CranPackageReadmeMcpError);
    });

    it('should throw correct error messages', () => {
      expect(() => validatePackageName(123)).toThrow('Package name must be a string');
      expect(() => validatePackageName('')).toThrow('Package name cannot be empty');
    });

    it('should throw with correct error codes', () => {
      try {
        validatePackageName(123);
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_PACKAGE_NAME');
      }

      try {
        validatePackageName('');
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_PACKAGE_NAME');
      }
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      expect(() => validateSearchQuery('ggplot')).not.toThrow();
      expect(() => validateSearchQuery('data visualization')).not.toThrow();
      expect(() => validateSearchQuery('plot')).not.toThrow();
      expect(() => validateSearchQuery('a')).not.toThrow();
    });

    it('should reject non-string search queries', () => {
      expect(() => validateSearchQuery(undefined)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery(null)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery(123)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery({})).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery([])).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery(true)).toThrow(CranPackageReadmeMcpError);
    });

    it('should reject empty search queries', () => {
      expect(() => validateSearchQuery('')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateSearchQuery('   ')).toThrow(CranPackageReadmeMcpError);
    });

    it('should throw correct error messages', () => {
      expect(() => validateSearchQuery(123)).toThrow('Search query must be a string');
      expect(() => validateSearchQuery('')).toThrow('Search query cannot be empty');
    });

    it('should throw with correct error codes', () => {
      try {
        validateSearchQuery(123);
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_SEARCH_QUERY');
      }

      try {
        validateSearchQuery('');
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_SEARCH_QUERY');
      }
    });
  });

  describe('validateLimit', () => {
    it('should accept valid limits', () => {
      expect(() => validateLimit(1)).not.toThrow();
      expect(() => validateLimit(10)).not.toThrow();
      expect(() => validateLimit(50)).not.toThrow();
      expect(() => validateLimit(100)).not.toThrow();
    });

    it('should accept undefined limit (uses default)', () => {
      expect(() => validateLimit(undefined)).not.toThrow();
    });

    it('should reject non-number limits', () => {
      expect(() => validateLimit('10')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit({})).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit([])).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit(true)).toThrow(CranPackageReadmeMcpError);
    });

    it('should reject limits less than 1', () => {
      expect(() => validateLimit(0)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit(-1)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit(-10)).toThrow(CranPackageReadmeMcpError);
    });

    it('should reject limits greater than 100', () => {
      expect(() => validateLimit(101)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit(1000)).toThrow(CranPackageReadmeMcpError);
    });

    it('should reject non-integer limits', () => {
      expect(() => validateLimit(1.5)).toThrow(CranPackageReadmeMcpError);
      expect(() => validateLimit(10.7)).toThrow(CranPackageReadmeMcpError);
    });

    it('should throw correct error messages', () => {
      expect(() => validateLimit('10')).toThrow('Limit must be a number');
      expect(() => validateLimit(0)).toThrow('Limit must be at least 1');
      expect(() => validateLimit(101)).toThrow('Limit cannot exceed 100');
      expect(() => validateLimit(1.5)).toThrow('Limit must be an integer');
    });

    it('should throw with correct error codes', () => {
      try {
        validateLimit('10');
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_LIMIT');
      }

      try {
        validateLimit(0);
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_LIMIT');
      }
    });
  });

  describe('validateBoolean', () => {
    it('should accept valid boolean values', () => {
      expect(validateBoolean(true, 'test field')).toBe(true);
      expect(validateBoolean(false, 'test field')).toBe(false);
    });

    it('should accept undefined and null (returns undefined)', () => {
      expect(validateBoolean(undefined, 'test field')).toBeUndefined();
      expect(validateBoolean(null, 'test field')).toBeUndefined();
    });

    it('should reject non-boolean values', () => {
      expect(() => validateBoolean('true', 'test field')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateBoolean(1, 'test field')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateBoolean(0, 'test field')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateBoolean({}, 'test field')).toThrow(CranPackageReadmeMcpError);
      expect(() => validateBoolean([], 'test field')).toThrow(CranPackageReadmeMcpError);
    });

    it('should throw correct error message with field name', () => {
      expect(() => validateBoolean('true', 'include examples')).toThrow('include examples must be a boolean');
    });

    it('should throw with correct error code', () => {
      try {
        validateBoolean('true', 'test field');
      } catch (error) {
        expect(error).toBeInstanceOf(CranPackageReadmeMcpError);
        expect((error as CranPackageReadmeMcpError).code).toBe('INVALID_PARAMETER');
      }
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://github.com/owner/repo')).toBe(true);
      expect(isValidUrl('http://example.com')).toBe(true);
      expect(isValidUrl('https://cran.r-project.org/package=ggplot2')).toBe(true);
      expect(isValidUrl('ftp://ftp.example.com/file.txt')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('github.com/owner/repo')).toBe(false); // Missing protocol
      expect(isValidUrl('')).toBe(false);
      expect(isValidUrl('http://')).toBe(false);
    });
  });

  describe('sanitizeString', () => {
    it('should sanitize valid strings', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
      expect(sanitizeString('normal string')).toBe('normal string');
    });

    it('should remove control characters', () => {
      expect(sanitizeString('hello\x00world\x1F')).toBe('helloworld');
      expect(sanitizeString('test\x7Fstring')).toBe('teststring');
    });

    it('should handle non-string input', () => {
      expect(sanitizeString(123)).toBe('');
      expect(sanitizeString(null)).toBe('');
      expect(sanitizeString(undefined)).toBe('');
      expect(sanitizeString({})).toBe('');
      expect(sanitizeString([])).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeString('')).toBe('');
      expect(sanitizeString('   ')).toBe('');
    });
  });
});