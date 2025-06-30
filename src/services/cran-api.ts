import { logger } from '../utils/logger.js';
import { handleApiError } from '../utils/error-handler.js';
import { DependencyParser } from './dependency-parser.js';
import { PackageSearch } from './package-search.js';
import type { CranPackageInfo, CranSearchResult } from '../types/index.js';

const CRANDB_BASE_URL = 'https://crandb.r-pkg.org';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export class CranApi {
  private async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'User-Agent': 'cran-package-readme-mcp-server/1.0.0',
          'Accept': 'application/json',
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

  async getPackageInfo(packageName: string): Promise<CranPackageInfo> {
    try {
      const packageUrl = `${CRANDB_BASE_URL}/${encodeURIComponent(packageName)}`;
      
      logger.debug(`Fetching package info: ${packageUrl}`);

      const response = await this.fetchWithTimeout(packageUrl);

      if (response.status === 404) {
        throw new Error(`Package '${packageName}' not found`);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as CranPackageInfo;
      
      // Add the name field for convenience
      data.name = packageName;
      
      logger.debug(`Fetched package info for: ${packageName}`);

      return data;
    } catch (error) {
      handleApiError(error, `CRAN package info for ${packageName}`);
    }
  }

  async getAllPackages(): Promise<string[]> {
    try {
      const packagesUrl = `${CRANDB_BASE_URL}/-/all`;
      
      logger.debug(`Fetching all packages: ${packagesUrl}`);

      const response = await this.fetchWithTimeout(packagesUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json() as Record<string, { name: string }>;
      const packageNames = Object.keys(data);
      
      logger.debug(`Fetched ${packageNames.length} packages`);
      return packageNames;
    } catch (error) {
      handleApiError(error, 'CRAN all packages');
    }
  }

  async searchPackages(query: string, limit: number = 20): Promise<CranSearchResult[]> {
    try {
      return await PackageSearch.searchPackages(query, limit);
    } catch (error) {
      handleApiError(error, 'CRAN search');
    }
  }

  async getPackageVersions(packageName: string): Promise<string[]> {
    try {
      const packageInfo = await this.getPackageInfo(packageName);
      
      if (packageInfo.timeline) {
        return Object.keys(packageInfo.timeline).sort();
      }
      
      if (packageInfo.releases) {
        return Object.keys(packageInfo.releases).sort();
      }
      
      // If no version history is available, return current version
      return [packageInfo.Version];
    } catch (error) {
      handleApiError(error, `versions for ${packageName}`);
    }
  }

  async getLatestVersion(packageName: string): Promise<string> {
    try {
      const packageInfo = await this.getPackageInfo(packageName);
      return packageInfo.Version;
    } catch (error) {
      handleApiError(error, `latest version for ${packageName}`);
    }
  }

  async getPackageDependencies(packageName: string): Promise<string[]> {
    try {
      const packageInfo = await this.getPackageInfo(packageName);
      return DependencyParser.parsePackageDependencies(packageInfo);
    } catch (error) {
      handleApiError(error, `dependencies for ${packageName}`);
    }
  }
}

export const cranApi = new CranApi();