export interface UsageExample {
  title: string;
  description?: string | undefined;
  code: string;
  language: string; // 'r', 'bash', etc.
}

export interface InstallationInfo {
  cran: string;      // "install.packages('package')"
  devtools?: string | undefined; // "devtools::install_github('user/repo')"
  remotes?: string | undefined;  // "remotes::install_cran('package')"
}

export interface AuthorInfo {
  name: string;
  email?: string;
  role?: string[];
}

export interface RepositoryInfo {
  type: string;
  url: string;
  bugreports?: string | undefined;
}

export interface DownloadStats {
  last_day: number;
  last_week: number;
  last_month: number;
}

export interface PackageBasicInfo {
  name: string;
  version: string;
  title: string;
  description: string;
  author?: string | AuthorInfo[] | undefined;
  maintainer: string;
  license: string;
  keywords?: string[] | undefined;
}

export interface PackageSearchResult {
  name: string;
  version: string;
  description: string;
  keywords: string[];
  author: string;
  publisher: string;
  maintainers: string[];
  score: {
    final: number;
    detail: {
      quality: number;
      popularity: number;  
      maintenance: number;
    };
  };
  searchScore: number;
}

export interface CranPackageSearchResult {
  name: string;
  version: string;
  title: string;
  description: string;
  author?: string;
  maintainer: string;
  license: string;
  published: string;
}

// Tool Parameters
export interface GetPackageReadmeParams {
  package_name: string;    // Package name (required)
  version?: string;        // Version (optional, default: "latest")
  include_examples?: boolean; // Whether to include examples (optional, default: true)
}

export interface GetPackageInfoParams {
  package_name: string;
  include_dependencies?: boolean; // Whether to include dependencies (default: true)
  include_dev_dependencies?: boolean; // Whether to include development dependencies (default: false)
}

export interface SearchPackagesParams {
  query: string;          // Search query
  limit?: number;         // Max results (default: 20)
  quality?: number;       // Minimum quality score (0-1)
  popularity?: number;    // Minimum popularity score (0-1)
}

// Tool Responses
export interface PackageReadmeResponse {
  package_name: string;
  version: string;
  description: string;
  readme_content: string;
  usage_examples: UsageExample[];
  installation: InstallationInfo;
  basic_info: PackageBasicInfo;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface PackageInfoResponse {
  package_name: string;
  latest_version: string;
  description: string;
  author: string;
  license: string;
  keywords: string[];
  dependencies?: Record<string, string> | undefined;
  dev_dependencies?: Record<string, string> | undefined;
  download_stats: DownloadStats;
  repository?: RepositoryInfo | undefined;
  exists: boolean;
}

export interface SearchPackagesResponse {
  query: string;
  total: number;
  packages: PackageSearchResult[];
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  ttl?: number;
  maxSize?: number;
}

// CRAN API Types
export interface CranPackageInfo {
  name: string;           // Computed field for convenience
  Package: string;
  Version: string;
  Priority?: string;
  Title: string;
  Description: string;
  Author?: string;
  Maintainer: string;
  License: string;
  URL?: string;
  BugReports?: string;
  Depends?: string;
  Imports?: string;
  Suggests?: string;
  LinkingTo?: string;
  Encoding?: string;
  Language?: string;
  NeedsCompilation?: string;
  Repository?: string;
  'Date/Publication'?: string;
  Packaged?: string;
  Built?: string;
  MD5sum?: string;
  crandb_file_date?: string;
  date?: string;
  releases?: {
    [version: string]: string;
  };
  timeline?: {
    [version: string]: string;
  };
}

export interface CranSearchResult {
  name: string;
  title: string;
  description: string;
  version: string;
  author: string;
  maintainer: string;
  license: string;
  published: string;
}

// GitHub API Types (for README fetching)
export interface GitHubReadmeResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content: string;
  encoding: string;
  _links: {
    self: string;
    git: string;
    html: string;
  };
}

// Error Types
export class CranPackageReadmeMcpError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'CranPackageReadmeMcpError';
  }
}

export class PackageNotFoundError extends CranPackageReadmeMcpError {
  constructor(packageName: string) {
    super(`Package '${packageName}' not found`, 'PACKAGE_NOT_FOUND', 404);
  }
}

export class RateLimitError extends CranPackageReadmeMcpError {
  constructor(service: string, retryAfter?: number) {
    super(`Rate limit exceeded for ${service}`, 'RATE_LIMIT_EXCEEDED', 429, { retryAfter });
  }
}

export class NetworkError extends CranPackageReadmeMcpError {
  constructor(message: string, originalError?: Error) {
    super(`Network error: ${message}`, 'NETWORK_ERROR', undefined, originalError);
  }
}