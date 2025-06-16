import { CranPackageReadmeMcpError } from '../types/index.js';

export function validatePackageName(packageName: unknown): string {
  if (typeof packageName !== 'string') {
    throw new CranPackageReadmeMcpError(
      'Package name must be a string',
      'INVALID_PACKAGE_NAME'
    );
  }

  if (packageName.trim().length === 0) {
    throw new CranPackageReadmeMcpError(
      'Package name cannot be empty',
      'INVALID_PACKAGE_NAME'
    );
  }

  // R package names can contain letters, numbers, dots, and underscores
  const validNameRegex = /^[a-zA-Z][a-zA-Z0-9._]*$/;
  if (!validNameRegex.test(packageName)) {
    throw new CranPackageReadmeMcpError(
      'Package name contains invalid characters. Must start with a letter and contain only letters, numbers, dots, and underscores',
      'INVALID_PACKAGE_NAME'
    );
  }

  return packageName.trim();
}

export function validateSearchQuery(query: unknown): string {
  if (typeof query !== 'string') {
    throw new CranPackageReadmeMcpError(
      'Search query must be a string',
      'INVALID_SEARCH_QUERY'
    );
  }

  if (query.trim().length === 0) {
    throw new CranPackageReadmeMcpError(
      'Search query cannot be empty',
      'INVALID_SEARCH_QUERY'
    );
  }

  if (query.length > 200) {
    throw new CranPackageReadmeMcpError(
      'Search query is too long (maximum 200 characters)',
      'INVALID_SEARCH_QUERY'
    );
  }

  return query.trim();
}

export function validateLimit(limit: unknown): number {
  if (limit === undefined || limit === null) {
    return 20; // Default limit
  }

  if (typeof limit !== 'number') {
    throw new CranPackageReadmeMcpError(
      'Limit must be a number',
      'INVALID_LIMIT'
    );
  }

  if (!Number.isInteger(limit)) {
    throw new CranPackageReadmeMcpError(
      'Limit must be an integer',
      'INVALID_LIMIT'
    );
  }

  if (limit < 1) {
    throw new CranPackageReadmeMcpError(
      'Limit must be at least 1',
      'INVALID_LIMIT'
    );
  }

  if (limit > 100) {
    throw new CranPackageReadmeMcpError(
      'Limit cannot exceed 100',
      'INVALID_LIMIT'
    );
  }

  return limit;
}

export function validateBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== 'boolean') {
    throw new CranPackageReadmeMcpError(
      `${fieldName} must be a boolean`,
      'INVALID_PARAMETER'
    );
  }

  return value;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function sanitizeString(str: unknown): string {
  if (typeof str !== 'string') {
    return '';
  }
  
  return str.trim().replace(/[\x00-\x1F\x7F]/g, ''); // Remove control characters
}