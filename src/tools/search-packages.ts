import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { SearchPackagesParams, SearchPackagesResponse, CranPackageSearchResult } from '../types/index.js';

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  try {
    // Validate parameters
    const query = validateSearchQuery(params.query);
    const limit = validateLimit(params.limit);

    logger.debug(`Searching packages with query: "${query}", limit: ${limit}`);

    // Check cache first
    const cacheKey = createCacheKey.searchResults(query, limit);
    const cached = cache.get<SearchPackagesResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached search results for: ${query}`);
      return cached;
    }

    // Search packages using CRAN API
    const searchResults = await cranApi.searchPackages(query, limit);

    // Transform the results to our format
    const packages: CranPackageSearchResult[] = searchResults.map(pkg => ({
      name: pkg.name,
      version: pkg.version,
      title: pkg.title,
      description: pkg.description,
      author: pkg.author,
      maintainer: pkg.maintainer,
      license: pkg.license,
      published: pkg.published,
    }));

    const result: SearchPackagesResponse = {
      query,
      total: packages.length, // CRAN API doesn't provide total count
      packages,
    };

    // Cache the result
    cache.set(cacheKey, result, 900 * 1000); // Cache for 15 minutes

    logger.info(`Found ${packages.length} packages for query: "${query}"`);
    return result;
  } catch (error) {
    handleApiError(error, `search packages with query "${params.query}"`);
  }
}