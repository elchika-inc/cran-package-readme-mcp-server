import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { readmeParser } from '../services/readme-parser.js';
import { packageExistenceChecker } from '../services/package-existence-checker.js';
import { readmeContentResolver } from '../services/readme-content-resolver.js';
import { packageResponseBuilder } from '../services/package-response-builder.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { GetPackageReadmeParams, PackageReadmeResponse, UsageExample } from '../types/index.js';

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  try {
    const packageName = validatePackageName(params.package_name);
    const version = params.version || 'latest';
    const includeExamples = validateBoolean(params.include_examples, 'include_examples') ?? true;

    logger.debug(`Getting package README for ${packageName} version ${version}`);

    // Check cache first
    const cacheKey = createCacheKey.packageReadme(packageName, version);
    const cached = cache.get<PackageReadmeResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached README for ${packageName}`);
      return cached;
    }

    // Check if package exists
    const packageExists = await packageExistenceChecker.checkExists(packageName);
    if (!packageExists) {
      logger.warn(`Package '${packageName}' not found in CRAN registry`);
      return packageResponseBuilder.buildNotFoundResponse(packageName, version);
    }

    // Get package information from CRAN
    const packageInfo = await cranApi.getPackageInfo(packageName);
    
    // Resolve README content
    const readmeContent = await readmeContentResolver.resolveContent(packageInfo);

    // Parse usage examples if requested
    let usageExamples: UsageExample[] = [];
    if (includeExamples && readmeContent) {
      usageExamples = readmeParser.parseUsageExamples(readmeContent);
    }

    // Build response
    const result = packageResponseBuilder.buildSuccessResponse(
      packageName,
      packageInfo,
      readmeContent,
      usageExamples
    );

    // Cache the result
    cache.set(cacheKey, result, 3600 * 1000); // Cache for 1 hour

    logger.info(`Successfully retrieved README for ${packageName}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package README for ${params.package_name}`);
  }
}

