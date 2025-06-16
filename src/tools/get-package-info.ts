import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { GetPackageInfoParams, PackageInfoResponse, RepositoryInfo } from '../types/index.js';

export async function getPackageInfo(params: GetPackageInfoParams): Promise<PackageInfoResponse> {
  try {
    // Validate parameters
    const packageName = validatePackageName(params.package_name);
    const includeDependencies = validateBoolean(params.include_dependencies, 'include_dependencies') ?? true;
    const includeSystemRequirements = validateBoolean(params.include_system_requirements, 'include_system_requirements') ?? false;

    logger.debug(`Getting package info for ${packageName}`);

    // Check cache first
    const cacheKey = createCacheKey.packageInfo(packageName);
    const cached = cache.get<PackageInfoResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached info for ${packageName}`);
      return cached;
    }

    // Get package information from CRAN
    const packageInfo = await cranApi.getPackageInfo(packageName);

    // Get dependencies if requested
    let dependencies: string[] | undefined;
    if (includeDependencies) {
      dependencies = await cranApi.getPackageDependencies(packageName);
    }

    // Get system requirements if requested
    let systemRequirements: string | undefined;
    if (includeSystemRequirements && packageInfo.NeedsCompilation) {
      systemRequirements = packageInfo.NeedsCompilation === 'yes' ? 'Compilation required' : 'No compilation required';
    }

    // Create repository info
    let repository: RepositoryInfo | undefined;
    if (packageInfo.URL) {
      const githubUrl = packageInfo.URL.split(',').find(url => url.trim().includes('github.com'));
      if (githubUrl) {
        repository = {
          type: 'git',
          url: githubUrl.trim(),
          bugreports: packageInfo.BugReports,
        };
      }
    }

    const result: PackageInfoResponse = {
      package_name: packageName,
      latest_version: packageInfo.Version,
      title: packageInfo.Title,
      description: packageInfo.Description,
      author: packageInfo.Author,
      maintainer: packageInfo.Maintainer,
      license: packageInfo.License,
      dependencies,
      system_requirements: systemRequirements,
      repository,
    };

    // Cache the result
    cache.set(cacheKey, result, 1800 * 1000); // Cache for 30 minutes

    logger.info(`Successfully retrieved info for ${packageName}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package info for ${params.package_name}`);
  }
}