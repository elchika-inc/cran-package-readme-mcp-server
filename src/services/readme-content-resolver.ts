import { githubApi } from './github-api.js';
import { logger } from '../utils/logger.js';
import type { CranPackageInfo } from '../types/index.js';

export class ReadmeContentResolver {
  async resolveContent(packageInfo: CranPackageInfo): Promise<string> {
    let readmeContent = '';

    if (packageInfo.URL) {
      readmeContent = await this.tryGetGitHubReadme(packageInfo.URL);
    }

    if (!readmeContent) {
      readmeContent = this.createBasicReadme(
        packageInfo.name,
        packageInfo.Version,
        packageInfo.Title,
        packageInfo.Description
      );
    }

    return readmeContent;
  }

  private async tryGetGitHubReadme(urlString: string): Promise<string> {
    const urls = urlString.split(',').map(url => url.trim());
    
    for (const url of urls) {
      if (url.includes('github.com')) {
        try {
          const content = await githubApi.getReadmeContent(url);
          if (content) {
            logger.debug('Found README from GitHub');
            return content;
          }
        } catch (error) {
          logger.debug(`Failed to get README from ${url}`, { error });
        }
      }
    }

    return '';
  }

  private createBasicReadme(packageName: string, version: string, title: string, description: string): string {
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
}

export const readmeContentResolver = new ReadmeContentResolver();