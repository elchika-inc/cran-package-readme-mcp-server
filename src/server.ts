import { BasePackageServer, ToolDefinition } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import {
  GetPackageReadmeParams,
  GetPackageInfoParams,
  SearchPackagesParams,
} from './types/index.js';

const TOOL_DEFINITIONS: Record<string, ToolDefinition> = {
  get_readme_from_cran: {
    name: 'get_readme_from_cran',
    description: 'Get package README and usage examples from CRAN',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the CRAN package (e.g., "ggplot2", "dplyr")',
        },
        version: {
          type: 'string',
          description: 'Version to retrieve (default: "latest")',
        },
        include_examples: {
          type: 'boolean',
          description: 'Whether to include usage examples (default: true)',
          default: true,
        }
      },
      required: ['package_name'],
    },
  },
  get_package_info_from_cran: {
    name: 'get_package_info_from_cran',
    description: 'Get package basic information and dependencies from CRAN',
    inputSchema: {
      type: 'object',
      properties: {
        package_name: {
          type: 'string',
          description: 'The name of the CRAN package (e.g., "ggplot2", "dplyr")',
        },
        include_dependencies: {
          type: 'boolean',
          description: 'Whether to include dependencies (default: true)',
          default: true,
        },
        include_dev_dependencies: {
          type: 'boolean',
          description: 'Whether to include development dependencies (default: false)',
          default: false,
        }
      },
      required: ['package_name'],
    },
  },
  search_packages_from_cran: {
    name: 'search_packages_from_cran',
    description: 'Search for packages in CRAN',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 20)',
          default: 20,
          minimum: 1,
          maximum: 100,
        },
        quality: {
          type: 'number',
          description: 'Minimum quality score (0-1)',
          minimum: 0,
          maximum: 1,
        },
        popularity: {
          type: 'number',
          description: 'Minimum popularity score (0-1)',
          minimum: 0,
          maximum: 1,
        }
      },
      required: ['query'],
    },
  },
} as const;

export class CranPackageReadmeMcpServer extends BasePackageServer {
  constructor() {
    super({
      name: 'cran-package-readme-mcp',
      version: '1.0.0',
    });
  }

  protected getToolDefinitions(): Record<string, ToolDefinition> {
    return TOOL_DEFINITIONS;
  }

  protected async handleToolCall(name: string, args: unknown): Promise<unknown> {
    switch (name) {
      case 'get_readme_from_cran':
        return await getPackageReadme(this.validateGetPackageReadmeParams(args));
      
      case 'get_package_info_from_cran':
        return await getPackageInfo(this.validateGetPackageInfoParams(args));
      
      case 'search_packages_from_cran':
        return await searchPackages(this.validateSearchPackagesParams(args));
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private validateGetPackageReadmeParams(args: unknown): GetPackageReadmeParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    if (params.version !== undefined && typeof params.version !== 'string') {
      throw new Error('version must be a string');
    }

    if (params.include_examples !== undefined && typeof params.include_examples !== 'boolean') {
      throw new Error('include_examples must be a boolean');
    }

    const result: GetPackageReadmeParams = {
      package_name: params.package_name,
    };
    
    if (params.version !== undefined) {
      result.version = params.version as string;
    }
    
    if (params.include_examples !== undefined) {
      result.include_examples = params.include_examples as boolean;
    }
    
    return result;
  }

  private validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.package_name || typeof params.package_name !== 'string') {
      throw new Error('package_name is required and must be a string');
    }

    if (params.include_dependencies !== undefined && typeof params.include_dependencies !== 'boolean') {
      throw new Error('include_dependencies must be a boolean');
    }

    if (params.include_dev_dependencies !== undefined && typeof params.include_dev_dependencies !== 'boolean') {
      throw new Error('include_dev_dependencies must be a boolean');
    }

    const result: GetPackageInfoParams = {
      package_name: params.package_name,
    };
    
    if (params.include_dependencies !== undefined) {
      result.include_dependencies = params.include_dependencies as boolean;
    }
    
    if (params.include_dev_dependencies !== undefined) {
      result.include_dev_dependencies = params.include_dev_dependencies as boolean;
    }
    
    return result;
  }

  private validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.query || typeof params.query !== 'string') {
      throw new Error('query is required and must be a string');
    }

    if (params.limit !== undefined) {
      if (typeof params.limit !== 'number' || params.limit < 1 || params.limit > 100) {
        throw new Error('limit must be a number between 1 and 100');
      }
    }

    if (params.quality !== undefined) {
      if (typeof params.quality !== 'number' || params.quality < 0 || params.quality > 1) {
        throw new Error('quality must be a number between 0 and 1');
      }
    }

    if (params.popularity !== undefined) {
      if (typeof params.popularity !== 'number' || params.popularity < 0 || params.popularity > 1) {
        throw new Error('popularity must be a number between 0 and 1');
      }
    }

    const result: SearchPackagesParams = {
      query: params.query,
    };
    
    if (params.limit !== undefined) {
      result.limit = params.limit as number;
    }

    if (params.quality !== undefined) {
      result.quality = params.quality as number;
    }

    if (params.popularity !== undefined) {
      result.popularity = params.popularity as number;
    }
    
    return result;
  }
}

export default CranPackageReadmeMcpServer;