import { logger } from './logger.js';
import type { CranPackageReadmeMcpError, NetworkError, PackageNotFoundError, RateLimitError } from '../types/index.js';

export function handleApiError(error: unknown, context: string): never {
  logger.error(`API error in ${context}`, { error });

  if (error instanceof Error) {
    // Check for specific HTTP status codes
    if ('status' in error || 'statusCode' in error) {
      const status = (error as { status?: number; statusCode?: number }).status || 
                    (error as { status?: number; statusCode?: number }).statusCode;
      
      switch (status) {
        case 404:
          throw new Error(`Resource not found in ${context}`);
        case 429:
          throw new Error(`Rate limit exceeded for ${context}`);
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error(`Service unavailable for ${context}`);
        default:
          throw new Error(`API error in ${context}: ${error.message}`);
      }
    }
    
    // Network-related errors
    if (error.message.includes('ENOTFOUND') || 
        error.message.includes('ECONNREFUSED') || 
        error.message.includes('ETIMEDOUT')) {
      throw new Error(`Network error in ${context}: ${error.message}`);
    }
    
    throw new Error(`Error in ${context}: ${error.message}`);
  }
  
  throw new Error(`Unknown error in ${context}: ${String(error)}`);
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof Error && 
         (error.name === 'NetworkError' || 
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ECONNREFUSED') ||
          error.message.includes('ETIMEDOUT'));
}

export function isPackageNotFoundError(error: unknown): error is PackageNotFoundError {
  return error instanceof Error && 
         (error.name === 'PackageNotFoundError' || 
          error.message.includes('not found'));
}

export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof Error && 
         (error.name === 'RateLimitError' || 
          error.message.includes('rate limit') ||
          error.message.includes('429'));
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  
  return 'Unknown error occurred';
}

export function sanitizeErrorForLogging(error: unknown): unknown {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error as CranPackageReadmeMcpError).code && { code: (error as CranPackageReadmeMcpError).code },
      ...(error as CranPackageReadmeMcpError).statusCode && { statusCode: (error as CranPackageReadmeMcpError).statusCode },
    };
  }
  
  return error;
}