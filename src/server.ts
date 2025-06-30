import { BasePackageServer, ToolDefinition } from '@elchika-inc/package-readme-shared';
import { getPackageReadme } from './tools/get-package-readme.js';
import { getPackageInfo } from './tools/get-package-info.js';
import { searchPackages } from './tools/search-packages.js';
import { ParameterValidators } from './utils/parameter-validators.js';
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
        return await getPackageReadme(ParameterValidators.validateGetPackageReadmeParams(args));
      
      case 'get_package_info_from_cran':
        return await getPackageInfo(ParameterValidators.validateGetPackageInfoParams(args));
      
      case 'search_packages_from_cran':
        return await searchPackages(ParameterValidators.validateSearchPackagesParams(args));
      
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}

export default CranPackageReadmeMcpServer;