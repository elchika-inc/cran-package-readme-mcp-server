import { describe, it, expect } from 'vitest';
import { 
  handleApiError, 
  isNetworkError, 
  isPackageNotFoundError, 
  isRateLimitError, 
  extractErrorMessage, 
  sanitizeErrorForLogging 
} from '../../src/utils/error-handler.js';

describe('Error Handler (Simple)', () => {
  describe('handleApiError', () => {
    it('should handle basic errors with context', () => {
      const error = new Error('Test error');
      
      expect(() => {
        handleApiError(error, 'test operation');
      }).toThrow('Error in test operation: Test error');
    });

    it('should handle HTTP 404 errors', () => {
      const error = new Error('Not found');
      (error as any).status = 404;
      
      expect(() => {
        handleApiError(error, 'package lookup');
      }).toThrow('Resource not found in package lookup');
    });

    it('should handle HTTP 429 errors', () => {
      const error = new Error('Too many requests');
      (error as any).status = 429;
      
      expect(() => {
        handleApiError(error, 'API call');
      }).toThrow('Rate limit exceeded for API call');
    });

    it('should handle server errors (500, 502, 503, 504)', () => {
      const serverStatuses = [500, 502, 503, 504];
      
      serverStatuses.forEach(status => {
        const error = new Error('Server error');
        (error as any).status = status;
        
        expect(() => {
          handleApiError(error, 'server call');
        }).toThrow('Service unavailable for server call');
      });
    });

    it('should handle network errors', () => {
      const networkError = new Error('ENOTFOUND some-host');
      
      expect(() => {
        handleApiError(networkError, 'network call');
      }).toThrow('Network error in network call: ENOTFOUND some-host');
    });

    it('should handle unknown non-Error values', () => {
      expect(() => {
        handleApiError('string error', 'test');
      }).toThrow('Unknown error in test: string error');

      expect(() => {
        handleApiError(null, 'test');
      }).toThrow('Unknown error in test: null');

      expect(() => {
        handleApiError(undefined, 'test');
      }).toThrow('Unknown error in test: undefined');
    });
  });

  describe('isNetworkError', () => {
    it('should identify network errors', () => {
      const networkErrors = [
        new Error('ENOTFOUND host'),
        new Error('ECONNREFUSED'),
        new Error('ETIMEDOUT'),
      ];

      networkErrors.forEach(error => {
        expect(isNetworkError(error)).toBe(true);
      });
    });

    it('should identify NetworkError by name', () => {
      const error = new Error('Network failed');
      error.name = 'NetworkError';
      
      expect(isNetworkError(error)).toBe(true);
    });

    it('should not identify non-network errors', () => {
      const regularError = new Error('Regular error');
      
      expect(isNetworkError(regularError)).toBe(false);
      expect(isNetworkError('string')).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  describe('isPackageNotFoundError', () => {
    it('should identify package not found errors', () => {
      const notFoundError = new Error('Package not found');
      
      expect(isPackageNotFoundError(notFoundError)).toBe(true);
    });

    it('should identify by name', () => {
      const error = new Error('Some error');
      error.name = 'PackageNotFoundError';
      
      expect(isPackageNotFoundError(error)).toBe(true);
    });

    it('should not identify non-package errors', () => {
      const regularError = new Error('Regular error');
      
      expect(isPackageNotFoundError(regularError)).toBe(false);
    });
  });

  describe('isRateLimitError', () => {
    it('should identify rate limit errors', () => {
      const rateLimitErrors = [
        new Error('rate limit exceeded'),
        new Error('429 Too Many Requests'),
      ];

      rateLimitErrors.forEach(error => {
        expect(isRateLimitError(error)).toBe(true);
      });
    });

    it('should identify by name', () => {
      const error = new Error('Some error');
      error.name = 'RateLimitError';
      
      expect(isRateLimitError(error)).toBe(true);
    });

    it('should not identify non-rate-limit errors', () => {
      const regularError = new Error('Regular error');
      
      expect(isRateLimitError(regularError)).toBe(false);
    });
  });

  describe('extractErrorMessage', () => {
    it('should extract message from Error objects', () => {
      const error = new Error('Test message');
      
      expect(extractErrorMessage(error)).toBe('Test message');
    });

    it('should handle string errors', () => {
      expect(extractErrorMessage('String error')).toBe('String error');
    });

    it('should handle objects with message property', () => {
      const errorObj = { message: 'Object error' };
      
      expect(extractErrorMessage(errorObj)).toBe('Object error');
    });

    it('should handle unknown error types', () => {
      expect(extractErrorMessage(null)).toBe('Unknown error occurred');
      expect(extractErrorMessage(undefined)).toBe('Unknown error occurred');
      expect(extractErrorMessage(123)).toBe('Unknown error occurred');
    });
  });

  describe('sanitizeErrorForLogging', () => {
    it('should sanitize Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Stack trace';
      
      const sanitized = sanitizeErrorForLogging(error);
      
      expect(sanitized).toEqual({
        name: 'Error',
        message: 'Test error',
        stack: 'Stack trace',
      });
    });

    it('should handle errors with additional properties', () => {
      const error = new Error('Custom error') as any;
      error.code = 'CUSTOM_CODE';
      error.statusCode = 404;
      
      const sanitized = sanitizeErrorForLogging(error);
      
      expect(sanitized).toEqual({
        name: 'Error',
        message: 'Custom error',
        stack: error.stack,
        code: 'CUSTOM_CODE',
        statusCode: 404,
      });
    });

    it('should handle non-Error values', () => {
      expect(sanitizeErrorForLogging('string')).toBe('string');
      expect(sanitizeErrorForLogging(null)).toBe(null);
      expect(sanitizeErrorForLogging({ custom: 'object' })).toEqual({ custom: 'object' });
    });
  });
});