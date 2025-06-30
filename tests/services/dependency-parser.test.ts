import { describe, it, expect } from 'vitest';
import { DependencyParser } from '../../src/services/dependency-parser.js';

describe('DependencyParser (Simple Tests)', () => {
  describe('parseDependencyString', () => {
    it('should parse dependency string correctly', () => {
      const depString = 'R (>= 3.5.0), methods, utils, grDevices';
      const result = DependencyParser.parseDependencyString(depString);
      
      expect(result).toEqual(['R', 'methods', 'utils', 'grDevices']);
    });

    it('should handle empty dependency string', () => {
      const result = DependencyParser.parseDependencyString('');
      
      expect(result).toEqual([]);
    });

    it('should handle complex version requirements', () => {
      const depString = 'Rcpp (>= 1.0.0), RcppEigen (>= 0.3.3.0), methods';
      const result = DependencyParser.parseDependencyString(depString);
      
      expect(result).toEqual(['Rcpp', 'RcppEigen', 'methods']);
    });

    it('should handle whitespace correctly', () => {
      const depString = '  R  ,  methods  ,  utils  ';
      const result = DependencyParser.parseDependencyString(depString);
      
      expect(result).toEqual(['R', 'methods', 'utils']);
    });

    it('should handle single dependency', () => {
      const depString = 'R (>= 4.0.0)';
      const result = DependencyParser.parseDependencyString(depString);
      
      expect(result).toEqual(['R']);
    });
  });
});