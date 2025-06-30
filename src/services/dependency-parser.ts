import { logger } from '../utils/logger.js';

export class DependencyParser {
  /**
   * Parse dependency strings like "R (>= 3.5.0), methods, utils"
   * @param depString - The dependency string to parse
   * @returns Array of package names
   */
  static parseDependencyString(depString: string): string[] {
    return depString
      .split(',')
      .map(dep => dep.trim().split(/\s+/)[0]) // Take package name before version requirements
      .filter(dep => dep.length > 0);
  }

  /**
   * Parse package dependencies from CRAN package info
   * @param packageInfo - The package info object
   * @returns Array of dependency package names
   */
  static parsePackageDependencies(packageInfo: {
    Depends?: string;
    Imports?: string;
    LinkingTo?: string;
  }): string[] {
    const dependencies: string[] = [];
    
    // Parse dependencies from different fields
    if (packageInfo.Depends) {
      const depends = this.parseDependencyString(packageInfo.Depends);
      dependencies.push(...depends);
    }
    
    if (packageInfo.Imports) {
      const imports = this.parseDependencyString(packageInfo.Imports);
      dependencies.push(...imports);
    }
    
    if (packageInfo.LinkingTo) {
      const linkingTo = this.parseDependencyString(packageInfo.LinkingTo);
      dependencies.push(...linkingTo);
    }
    
    // Remove duplicates and R itself
    const uniqueDependencies = [...new Set(dependencies)].filter(dep => dep !== 'R');
    
    logger.debug(`Parsed ${uniqueDependencies.length} dependencies`);
    return uniqueDependencies;
  }
}