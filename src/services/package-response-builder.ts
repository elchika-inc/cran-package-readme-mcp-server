import type { 
  CranPackageInfo, 
  PackageReadmeResponse, 
  InstallationInfo, 
  PackageBasicInfo, 
  RepositoryInfo 
} from '../types/index.js';

export class PackageResponseBuilder {
  buildNotFoundResponse(packageName: string, version: string): PackageReadmeResponse {
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

  buildSuccessResponse(
    packageName: string,
    packageInfo: CranPackageInfo,
    readmeContent: string,
    usageExamples: any[]
  ): PackageReadmeResponse {
    const installation = this.createInstallationInfo(packageName, packageInfo);
    const basicInfo = this.createBasicInfo(packageName, packageInfo);
    const repository = this.createRepositoryInfo(packageInfo);

    return {
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
  }

  private createInstallationInfo(packageName: string, packageInfo: CranPackageInfo): InstallationInfo {
    const githubUrl = packageInfo.URL?.split(',').find(url => url.trim().includes('github.com'));
    return {
      cran: `install.packages("${packageName}")`,
      devtools: githubUrl 
        ? `devtools::install_github("${this.extractGitHubPath(githubUrl.trim())}")`
        : undefined,
      remotes: `remotes::install_cran("${packageName}")`,
    };
  }

  private createBasicInfo(packageName: string, packageInfo: CranPackageInfo): PackageBasicInfo {
    return {
      name: packageName,
      version: packageInfo.Version,
      title: packageInfo.Title,
      description: packageInfo.Description,
      author: packageInfo.Author,
      maintainer: packageInfo.Maintainer,
      license: packageInfo.License,
    };
  }

  private createRepositoryInfo(packageInfo: CranPackageInfo): RepositoryInfo | undefined {
    if (!packageInfo.URL) {
      return undefined;
    }

    const githubUrl = packageInfo.URL.split(',').find(url => url.trim().includes('github.com'));
    if (!githubUrl) {
      return undefined;
    }

    return {
      type: 'git',
      url: githubUrl.trim(),
      bugreports: packageInfo.BugReports,
    };
  }

  private extractGitHubPath(url: string): string {
    try {
      const match = url.match(/github\.com\/([^/]+\/[^/]+)/);
      return match ? match[1] : '';
    } catch {
      return '';
    }
  }
}

export const packageResponseBuilder = new PackageResponseBuilder();