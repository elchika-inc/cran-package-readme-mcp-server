import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { SearchPackagesParams, SearchPackagesResponse, PackageSearchResult } from '../types/index.js';

export async function searchPackages(params: SearchPackagesParams): Promise<SearchPackagesResponse> {
  try {
    // Validate parameters
    const query = validateSearchQuery(params.query);
    const limit = validateLimit(params.limit);
    const quality = params.quality;
    const popularity = params.popularity;

    logger.debug(`Searching packages with query: "${query}", limit: ${limit}, quality: ${quality}, popularity: ${popularity}`);

    // Check cache first
    const cacheKey = createCacheKey.searchResults(query, limit);
    const cached = cache.get<SearchPackagesResponse>(cacheKey);
    if (cached) {
      logger.debug(`Using cached search results for: ${query}`);
      return cached;
    }

    // Search packages using CRAN API
    const searchResults = await cranApi.searchPackages(query, limit);

    // Transform the results to our format with mock scoring
    const packages: PackageSearchResult[] = searchResults.map((pkg, index) => {
      // Generate mock scores based on position and package characteristics
      const baseScore = Math.max(0.1, 1 - (index / searchResults.length));
      const qualityScore = Math.min(1, baseScore + (pkg.description.length > 100 ? 0.1 : 0));
      const popularityScore = Math.min(1, baseScore + (pkg.name.length < 10 ? 0.1 : 0));
      const maintenanceScore = Math.min(1, baseScore + 0.1);
      const finalScore = (qualityScore + popularityScore + maintenanceScore) / 3;

      return {
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        keywords: [], // CRAN doesn't provide keywords
        author: pkg.author || 'Unknown',
        publisher: pkg.maintainer,
        maintainers: [pkg.maintainer],
        score: {
          final: finalScore,
          detail: {
            quality: qualityScore,
            popularity: popularityScore,
            maintenance: maintenanceScore,
          },
        },
        searchScore: baseScore,
      };
    });

    // Apply quality and popularity filters
    let filteredPackages = packages;
    if (quality !== undefined) {
      filteredPackages = filteredPackages.filter(pkg => pkg.score.detail.quality >= quality);
    }
    if (popularity !== undefined) {
      filteredPackages = filteredPackages.filter(pkg => pkg.score.detail.popularity >= popularity);
    }

    const result: SearchPackagesResponse = {
      query,
      total: filteredPackages.length,
      packages: filteredPackages,
    };

    // Cache the result
    cache.set(cacheKey, result, 900 * 1000); // Cache for 15 minutes

    logger.info(`Found ${packages.length} packages for query: "${query}"`);
    return result;
  } catch (error) {
    handleApiError(error, `search packages with query "${params.query}"`);
  }
}