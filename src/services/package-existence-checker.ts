import { cranApi } from './cran-api.js';
import { logger } from '../utils/logger.js';

export class PackageExistenceChecker {
  async checkExists(packageName: string): Promise<boolean> {
    try {
      logger.debug(`Checking package existence: ${packageName}`);
      await cranApi.getPackageInfo(packageName);
      
      logger.debug(`Package ${packageName} exists: true`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('not found')) {
        logger.debug(`Package ${packageName} exists: false`);
        return false;
      }
      
      logger.warn(`Failed to check existence for ${packageName}`, { error });
      return false;
    }
  }
}

export const packageExistenceChecker = new PackageExistenceChecker();