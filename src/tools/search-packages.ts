import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { logger } from '../utils/logger.js';
import { validateSearchQuery, validateLimit } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import type { SearchPackagesParams, SearchPackagesResponse, PackageSearchResult } from '../types/index.js';

function calculateSearchRelevance(name: string, description: string, query: string): number {
  const queryLower = query.toLowerCase();
  const nameLower = name.toLowerCase();
  const descriptionLower = description.toLowerCase();
  
  // Exact name match gets highest score
  if (nameLower === queryLower) return 1.0;
  
  // Name starts with query gets high score
  if (nameLower.startsWith(queryLower)) return 0.9;
  
  // Name contains query gets medium score
  if (nameLower.includes(queryLower)) return 0.7;
  
  // Description contains query gets lower score
  if (descriptionLower.includes(queryLower)) return 0.5;
  
  // Fuzzy matching for typos/partial matches
  const nameDistance = levenshteinDistance(nameLower, queryLower);
  const maxLength = Math.max(nameLower.length, queryLower.length);
  const similarity = 1 - (nameDistance / maxLength);
  
  return Math.max(0.1, similarity * 0.4);
}

function calculateQualityScore(pkg: any): number {
  let score = 0.5; // Base score
  
  // Long description indicates more documentation
  if (pkg.description && pkg.description.length > 100) score += 0.2;
  if (pkg.description && pkg.description.length > 200) score += 0.1;
  
  // Has title indicates structured package
  if (pkg.title && pkg.title.length > 10) score += 0.1;
  
  // License indicates proper packaging
  if (pkg.license && pkg.license !== 'Unknown') score += 0.1;
  
  return Math.min(1.0, score);
}

function calculatePopularityScore(pkg: any, index: number, totalResults: number): number {
  // CRAN search results are ordered by relevance, early results are more popular
  const positionScore = Math.max(0.1, 1 - (index / totalResults));
  
  // Shorter names tend to be more established packages
  const nameScore = pkg.name.length <= 8 ? 0.2 : 0.1;
  
  // Common R package prefixes indicate ecosystem integration
  const prefixScore = /^(r|R|tidyr?|dplyr?|ggplot?)/.test(pkg.name) ? 0.1 : 0;
  
  return Math.min(1.0, positionScore * 0.7 + nameScore + prefixScore);
}

function calculateMaintenanceScore(pkg: any): number {
  let score = 0.5; // Base score
  
  // Recent publication date indicates active maintenance
  if (pkg.published && pkg.published !== 'Unknown') {
    try {
      const pubDate = new Date(pkg.published);
      const daysSincePublish = (Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSincePublish < 365) score += 0.3; // Published within a year
      else if (daysSincePublish < 730) score += 0.2; // Published within 2 years
      else if (daysSincePublish < 1095) score += 0.1; // Published within 3 years
    } catch {
      // Invalid date, use base score
    }
  }
  
  // Has maintainer indicates active project
  if (pkg.maintainer && pkg.maintainer !== 'Unknown') score += 0.2;
  
  return Math.min(1.0, score);
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

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

    // Transform the results to our format with improved scoring
    const packages: PackageSearchResult[] = searchResults.map((pkg, index) => {
      // Calculate more realistic scores based on actual package characteristics
      const searchRelevance = calculateSearchRelevance(pkg.name, pkg.description, query);
      const qualityScore = calculateQualityScore(pkg);
      const popularityScore = calculatePopularityScore(pkg, index, searchResults.length);
      const maintenanceScore = calculateMaintenanceScore(pkg);
      const finalScore = (qualityScore * 0.4 + popularityScore * 0.3 + maintenanceScore * 0.2 + searchRelevance * 0.1);

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
        searchScore: searchRelevance,
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