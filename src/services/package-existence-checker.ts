import { searchPackages } from '../tools/search-packages.js';
import { logger } from '../utils/logger.js';

export class PackageExistenceChecker {
  async checkExists(packageName: string): Promise<boolean> {
    try {
      logger.debug(`Checking package existence: ${packageName}`);
      const searchResult = await searchPackages({ query: packageName, limit: 10 });
      
      const exactMatch = searchResult.packages.find(pkg => pkg.name === packageName);
      const exists = !!exactMatch;
      
      logger.debug(`Package ${packageName} exists: ${exists}`);
      return exists;
    } catch (error) {
      logger.warn(`Failed to check existence for ${packageName}`, { error });
      return false;
    }
  }
}

export const packageExistenceChecker = new PackageExistenceChecker();