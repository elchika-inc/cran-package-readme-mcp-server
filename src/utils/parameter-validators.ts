import { validatePackageName, validateLimit, validateBoolean } from './validators.js';
import type { 
  GetPackageReadmeParams, 
  GetPackageInfoParams, 
  SearchPackagesParams 
} from '../types/index.js';

export class ParameterValidators {
  static validateGetPackageReadmeParams(args: unknown): GetPackageReadmeParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;
    const packageName = validatePackageName(params.package_name);

    const result: GetPackageReadmeParams = {
      package_name: packageName,
    };

    if (params.version !== undefined) {
      if (typeof params.version !== 'string') {
        throw new Error('version must be a string');
      }
      result.version = params.version;
    }

    const includeExamples = validateBoolean(params.include_examples, 'include_examples');
    if (includeExamples !== undefined) {
      result.include_examples = includeExamples;
    }

    return result;
  }

  static validateGetPackageInfoParams(args: unknown): GetPackageInfoParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;
    const packageName = validatePackageName(params.package_name);

    const result: GetPackageInfoParams = {
      package_name: packageName,
    };

    const includeDependencies = validateBoolean(params.include_dependencies, 'include_dependencies');
    if (includeDependencies !== undefined) {
      result.include_dependencies = includeDependencies;
    }

    const includeDevDependencies = validateBoolean(params.include_dev_dependencies, 'include_dev_dependencies');
    if (includeDevDependencies !== undefined) {
      result.include_dev_dependencies = includeDevDependencies;
    }

    return result;
  }

  static validateSearchPackagesParams(args: unknown): SearchPackagesParams {
    if (!args || typeof args !== 'object') {
      throw new Error('Arguments must be an object');
    }

    const params = args as Record<string, unknown>;

    if (!params.query || typeof params.query !== 'string') {
      throw new Error('query is required and must be a string');
    }

    const result: SearchPackagesParams = {
      query: params.query,
    };

    if (params.limit !== undefined) {
      result.limit = validateLimit(params.limit);
    }

    if (params.quality !== undefined) {
      if (typeof params.quality !== 'number' || params.quality < 0 || params.quality > 1) {
        throw new Error('quality must be a number between 0 and 1');
      }
      result.quality = params.quality;
    }

    if (params.popularity !== undefined) {
      if (typeof params.popularity !== 'number' || params.popularity < 0 || params.popularity > 1) {
        throw new Error('popularity must be a number between 0 and 1');
      }
      result.popularity = params.popularity;
    }

    return result;
  }
}