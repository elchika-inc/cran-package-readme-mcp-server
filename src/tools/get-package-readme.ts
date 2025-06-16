import { cache, createCacheKey } from '../services/cache.js';
import { cranApi } from '../services/cran-api.js';
import { githubApi } from '../services/github-api.js';
import { readmeParser } from '../services/readme-parser.js';
import { logger } from '../utils/logger.js';
import { validatePackageName, validateBoolean } from '../utils/validators.js';
import { handleApiError } from '../utils/error-handler.js';
import { searchPackages } from './search-packages.js';
import type { GetPackageReadmeParams, PackageReadmeResponse, UsageExample, InstallationInfo, PackageBasicInfo, RepositoryInfo } from '../types/index.js';

export async function getPackageReadme(params: GetPackageReadmeParams): Promise<PackageReadmeResponse> {
  try {
    // Validate parameters
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

    // First, search to verify package exists
    logger.debug(`Searching for package existence: ${packageName}`);
    const searchResult = await searchPackages({ query: packageName, limit: 10 });
    
    // Check if the exact package name exists in search results
    const exactMatch = searchResult.packages.find(pkg => pkg.name === packageName);
    if (!exactMatch) {
      logger.warn(`Package '${packageName}' not found in CRAN registry`);
      return {
        package_name: packageName,
        version: version,
        description: '',
        readme_content: '',
        usage_examples: [],
        installation: { cran: `install.packages("${packageName}")` },
        basic_info: {
          name: packageName,
          version: version,
          title: '',
          description: '',
          author: '',
          maintainer: '',
          license: '',
        },
        exists: false,
      };
    }
    
    logger.debug(`Package found in search results: ${packageName}`);

    // Get package information from CRAN
    const packageInfo = await cranApi.getPackageInfo(packageName);
    
    // Get README content
    let readmeContent = '';
    let usageExamples: UsageExample[] = [];

    // Try to get README from GitHub if URL is available
    if (packageInfo.URL) {
      const urls = packageInfo.URL.split(',').map(url => url.trim());
      
      for (const url of urls) {
        if (url.includes('github.com')) {
          readmeContent = await githubApi.getReadmeContent(url) || '';
          if (readmeContent) {break;}
        }
      }
    }

    // If no README found, create a basic one
    if (!readmeContent) {
      readmeContent = createBasicReadme(packageName, packageInfo.Version, packageInfo.Title, packageInfo.Description);
    }

    // Parse usage examples if requested
    if (includeExamples && readmeContent) {
      usageExamples = readmeParser.parseUsageExamples(readmeContent);
    }

    // Create installation info
    const installation: InstallationInfo = {
      cran: `install.packages("${packageName}")`,
      devtools: packageInfo.URL && packageInfo.URL.includes('github.com') 
        ? `devtools::install_github("${extractGitHubPath(packageInfo.URL)}")`
        : undefined,
      remotes: `remotes::install_cran("${packageName}")`,
    };

    // Create basic info
    const basicInfo: PackageBasicInfo = {
      name: packageName,
      version: packageInfo.Version,
      title: packageInfo.Title,
      description: packageInfo.Description,
      author: packageInfo.Author,
      maintainer: packageInfo.Maintainer,
      license: packageInfo.License,
    };

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

    const result: PackageReadmeResponse = {
      package_name: packageName,
      version: packageInfo.Version,
      description: packageInfo.Description,
      readme_content: readmeContent,
      usage_examples: usageExamples,
      installation,
      basic_info: basicInfo,
      repository,
      exists: true,
    };

    // Cache the result
    cache.set(cacheKey, result, 3600 * 1000); // Cache for 1 hour

    logger.info(`Successfully retrieved README for ${packageName}`);
    return result;
  } catch (error) {
    handleApiError(error, `get package README for ${params.package_name}`);
  }
}

function createBasicReadme(packageName: string, version: string, title: string, description: string): string {
  return `# ${packageName}: ${title}

${description}

## Installation

You can install the released version of ${packageName} from [CRAN](https://CRAN.R-project.org) with:

\`\`\`r
install.packages("${packageName}")
\`\`\`

## Usage

\`\`\`r
library(${packageName})

# Basic usage example
# Add your usage code here
\`\`\`

## Version

Current version: ${version}

## More Information

For more information, please visit the package documentation on CRAN.
`;
}

function extractGitHubPath(url: string): string {
  try {
    const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}