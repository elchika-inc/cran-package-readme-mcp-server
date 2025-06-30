import { logger } from '../utils/logger.js';
import type { CranSearchResult, CranPackageInfo } from '../types/index.js';

const CRANDB_BASE_URL = 'https://crandb.r-pkg.org';
const REQUEST_TIMEOUT = 10000; // 10 seconds

export class PackageSearch {
  private static async fetchWithTimeout(url: string, options: RequestInit = {}): Promise<Response> {
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

  private static async getAllPackages(): Promise<string[]> {
    const packagesUrl = `${CRANDB_BASE_URL}/-/all`;
    const response = await this.fetchWithTimeout(packagesUrl);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as Record<string, { name: string }>;
    return Object.keys(data);
  }

  private static async getPackageInfo(packageName: string): Promise<CranPackageInfo> {
    const packageUrl = `${CRANDB_BASE_URL}/${encodeURIComponent(packageName)}`;
    const response = await this.fetchWithTimeout(packageUrl);

    if (response.status === 404) {
      throw new Error(`Package '${packageName}' not found`);
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as CranPackageInfo;
    data.name = packageName;
    return data;
  }

  static async searchPackages(query: string, limit: number = 20): Promise<CranSearchResult[]> {
    try {
      // CRAN doesn't have a native search API, so we'll implement basic search
      // by fetching all packages and filtering
      const allPackages = await this.getAllPackages();
      
      const queryLower = query.toLowerCase();
      const matchingPackages = allPackages
        .filter(pkg => pkg.toLowerCase().includes(queryLower))
        .slice(0, limit);

      logger.debug(`Found ${matchingPackages.length} matching packages for query: ${query}`);

      // Fetch detailed info for matching packages in parallel
      const results = await Promise.allSettled(
        matchingPackages.map(async (packageName) => {
          const packageInfo = await this.getPackageInfo(packageName);
          return {
            name: packageInfo.Package,
            title: packageInfo.Title,
            description: packageInfo.Description,
            version: packageInfo.Version,
            author: packageInfo.Author || 'Unknown',
            maintainer: packageInfo.Maintainer,
            license: packageInfo.License,
            published: packageInfo['Date/Publication'] || packageInfo.date || 'Unknown',
          };
        })
      );

      // Filter successful results
      return results
        .filter((result): result is PromiseFulfilledResult<CranSearchResult> => 
          result.status === 'fulfilled'
        )
        .map(result => result.value);
    } catch (error) {
      logger.error('Error searching packages', { error, query });
      throw error;
    }
  }
}