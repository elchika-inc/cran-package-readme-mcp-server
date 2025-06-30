import { describe, it, expect } from 'vitest';
import { GitHubApi } from '../../src/services/github-api.js';

describe('GitHubApi (Simple Tests)', () => {
  const githubApi = new GitHubApi();

  describe('extractOwnerAndRepo (private method behavior)', () => {
    it('should handle invalid URLs by returning null', async () => {
      // Test through public method to verify private method behavior
      const result = await githubApi.checkRepositoryExists('https://example.com/not-github');
      expect(result).toBe(false);
    });

    it('should handle malformed URLs by returning null', async () => {
      const result = await githubApi.checkRepositoryExists('not-a-url');
      expect(result).toBe(false);
    });

    it('should handle URLs with insufficient path segments', async () => {
      const result = await githubApi.checkRepositoryExists('https://github.com/owner');
      expect(result).toBe(false);
    });

    it('should handle empty URLs', async () => {
      const result = await githubApi.checkRepositoryExists('');
      expect(result).toBe(false);
    });
  });

  describe('getReadmeContent with invalid inputs', () => {
    it('should return null for invalid GitHub URLs', async () => {
      const result = await githubApi.getReadmeContent('https://example.com/not-github');
      expect(result).toBeNull();
    });

    it('should return null for malformed URLs', async () => {
      const result = await githubApi.getReadmeContent('not-a-url');
      expect(result).toBeNull();
    });

    it('should return null for empty URLs', async () => {
      const result = await githubApi.getReadmeContent('');
      expect(result).toBeNull();
    });
  });
});