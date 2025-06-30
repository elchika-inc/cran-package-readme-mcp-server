import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { DependencyParser } from '../services/dependency-parser.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { GetPackageInfoParams, PackageInfoResponse, RepositoryInfo, DownloadStats } from '../types/index.js';

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  try {
    // Validate parameters
    const packageName = validatePackageName(params.package_name);
    const includeDependencies = validateBoolean(params.include_dependencies, 'include_dependencies') ?? true;
    const includeDevDependencies = validateBoolean(params.include_dev_dependencies, 'include_dev_dependencies') ?? false;

    logger.debug(`Getting package info for ${packageName}`);

    // Check cache first
    const cacheKey = createCacheKey.packageInfo(packageName);
    const cached = cache.get<PackageInfoResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached info for ${packageName}`);
      return cached;
    }

    // Try to get package information from CRAN
    let packageInfo;
    try {
      packageInfo = await cranApi.getPackageInfo(packageName);
    } catch (error) {
      logger.warn(`Package '${packageName}' not found in CRAN registry`);
      return {
        package_name: packageName,
        latest_version: '',
        description: '',
        author: '',
        license: '',
        keywords: [],
        download_stats: { last_day: 0, last_week: 0, last_month: 0 },
        exists: false,
      };
    }

    // Get dependencies if requested
    let dependencies: Record<string, string> | undefined;
    let devDependencies: Record<string, string> | undefined;
    
    if (includeDependencies) {
      const deps = await cranApi.getPackageDependencies(packageName);
      if (deps.length > 0) {
        dependencies = {};
        deps.forEach(dep => {
          dependencies![dep] = '*'; // CRAN doesn't provide specific version constraints
        });
      }
    }

    // CRAN doesn't typically have dev dependencies like npm, but we can include Suggests
    if (includeDevDependencies && packageInfo.Suggests) {
      const suggests = DependencyParser.parseDependencyString(packageInfo.Suggests);
      if (suggests.length > 0) {
        devDependencies = {};
        suggests.forEach((dep: string) => {
          devDependencies![dep] = '*';
        });
      }
    }

    // Create repository info
    let repository: RepositoryInfo | undefined;
    if (packageInfo.URL) {
      const githubUrl = packageInfo.URL.split(',').find(url => typeof url === 'string' && url.trim().includes('github.com'));
      if (githubUrl && typeof githubUrl === 'string') {
        repository = {
          type: 'git',
          url: githubUrl.trim(),
          bugreports: packageInfo.BugReports,
        };
      }
    }

    // Create download stats (CRAN doesn't provide download stats, so we use placeholder)
    const downloadStats: DownloadStats = {
      last_day: 0,
      last_week: 0,
      last_month: 0,
    };

    const result: PackageInfoResponse = {
      package_name: packageName,
      latest_version: packageInfo.Version,
      description: packageInfo.Description,
      author: packageInfo.Author || '',
      license: packageInfo.License,
      keywords: [], // CRAN doesn't have keywords like npm
      dependencies,
      dev_dependencies: devDependencies,
      download_stats: downloadStats,
      repository,
      exists: true,
    };

    // Cache the result
    cache.set(cacheKey, result, 1800 * 1000); // Cache for 30 minutes

    logger.info(`Successfully retrieved info for ${packageName}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package info for ${params.package_name}`);
  }
}