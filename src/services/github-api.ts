import { logger } from '../utils/logger.js';
// import { handleApiError } from '../utils/error-handler.js'; // Currently unused
import type { GitHubReadmeResponse } from '../types/index.js';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export class GitHubApi {
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'cran-package-readme-mcp-server/1.0.0',
          'Accept': 'application/vnd.github.v3+json',
          ...options.headers,
        },
      });

      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private extractOwnerAndRepo(url: string): { owner: string; repo: string } | null {
    try {
      const parsedUrl = new URL(url);
      
      if (parsedUrl.hostname !== 'github.com') {
        return null;
      }

      const pathParts = parsedUrl.pathname.split('/').filter(part => part.length > 0);
      
      if (pathParts.length < 2) {
        return null;
      }

      return {
        owner: pathParts[0],
        repo: pathParts[1].replace(/\.git$/, ''), // Remove .git extension if present
      };
    } catch {
      return null;
    }
  }

  async getReadmeContent(repositoryUrl: string): Promise<string | null> {
    try {
      const repoInfo = this.extractOwnerAndRepo(repositoryUrl);
      
      if (!repoInfo) {
        logger.debug(`Invalid GitHub URL: ${repositoryUrl}`);
        return null;
      }

      const readmeUrl = `${GITHUB_API_BASE_URL}/repos/${repoInfo.owner}/${repoInfo.repo}/readme`;
      
      logger.debug(`Fetching README from: ${readmeUrl}`);

      const response = await this.fetchWithTimeout(readmeUrl);

      if (response.status === 404) {
        logger.debug(`README not found for ${repoInfo.owner}/${repoInfo.repo}`);
        return null;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as GitHubReadmeResponse;
      
      if (data.encoding === 'base64') {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        logger.debug(`Fetched README content (${content.length} chars) for ${repoInfo.owner}/${repoInfo.repo}`);
        return content;
      }

      logger.warn(`Unexpected encoding for README: ${data.encoding}`);
      return null;
    } catch (error) {
      logger.debug(`Failed to fetch README from ${repositoryUrl}:`, error);
      return null;
    }
  }

  async checkRepositoryExists(repositoryUrl: string): Promise<boolean> {
    try {
      const repoInfo = this.extractOwnerAndRepo(repositoryUrl);
      
      if (!repoInfo) {
        return false;
      }

      const repoUrl = `${GITHUB_API_BASE_URL}/repos/${repoInfo.owner}/${repoInfo.repo}`;
      
      const response = await this.fetchWithTimeout(repoUrl, {
        method: 'HEAD', // Only check if repo exists, don't fetch content
      });

      return response.ok;
    } catch (error) {
      logger.debug(`Failed to check repository existence for ${repositoryUrl}:`, error);
      return false;
    }
  }
}

export const githubApi = new GitHubApi();