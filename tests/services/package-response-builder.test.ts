import { describe, it, expect } from 'vitest';
import { PackageResponseBuilder } from '../../src/services/package-response-builder.js';
import type { CranPackageInfo } from '../../src/types/index.js';

describe('PackageResponseBuilder', () => {
  const builder = new PackageResponseBuilder();

  describe('buildNotFoundResponse', () => {
    it('should build correct not found response', () => {
      const response = builder.buildNotFoundResponse('nonexistent-package', '1.0.0');

      expect(response).toEqual({
        package_name: 'nonexistent-package',
        version: '1.0.0',
        description: '',
        readme_content: '',
        usage_examples: [],
        installation: { cran: 'install.packages("nonexistent-package")' },
        basic_info: {
          name: 'nonexistent-package',
          version: '1.0.0',
          title: '',
          description: '',
          author: '',
          maintainer: '',
          license: '',
        },
        exists: false,
      });
    });

    it('should handle special characters in package name', () => {
      const response = builder.buildNotFoundResponse('package.with.dots', '2.1.0');

      expect(response.package_name).toBe('package.with.dots');
      expect(response.installation.cran).toBe('install.packages("package.with.dots")');
      expect(response.basic_info.name).toBe('package.with.dots');
    });

    it('should handle empty package name and version', () => {
      const response = builder.buildNotFoundResponse('', '');

      expect(response.package_name).toBe('');
      expect(response.version).toBe('');
      expect(response.exists).toBe(false);
      expect(response.installation.cran).toBe('install.packages("")');
    });
  });

  describe('buildSuccessResponse', () => {
    const mockPackageInfo: CranPackageInfo = {
      Package: 'ggplot2',
      Version: '3.4.4',
      Title: 'Create Elegant Data Visualisations Using the Grammar of Graphics',
      Description: 'A system for declaratively creating graphics, based on "The Grammar of Graphics".',
      Author: 'Hadley Wickham [aut] (<https://orcid.org/0000-0003-4757-117X>)',
      Maintainer: 'Hadley Wickham <hadley@posit.co>',
      License: 'MIT + file LICENSE',
      URL: 'https://ggplot2.tidyverse.org, https://github.com/tidyverse/ggplot2',
      BugReports: 'https://github.com/tidyverse/ggplot2/issues',
      name: 'ggplot2'
    };

    it('should build correct success response', () => {
      const readmeContent = '# ggplot2\n\nCreate beautiful plots...';
      const usageExamples = [
        { title: 'Basic Plot', code: 'ggplot(data) + geom_point()' }
      ];

      const response = builder.buildSuccessResponse(
        'ggplot2',
        mockPackageInfo,
        readmeContent,
        usageExamples
      );

      expect(response).toEqual({
        package_name: 'ggplot2',
        version: '3.4.4',
        description: 'A system for declaratively creating graphics, based on "The Grammar of Graphics".',
        readme_content: readmeContent,
        usage_examples: usageExamples,
        installation: {
          cran: 'install.packages("ggplot2")',
          devtools: 'devtools::install_github("tidyverse/ggplot2")',
          remotes: 'remotes::install_cran("ggplot2")',
        },
        basic_info: {
          name: 'ggplot2',
          version: '3.4.4',
          title: 'Create Elegant Data Visualisations Using the Grammar of Graphics',
          description: 'A system for declaratively creating graphics, based on "The Grammar of Graphics".',
          author: 'Hadley Wickham [aut] (<https://orcid.org/0000-0003-4757-117X>)',
          maintainer: 'Hadley Wickham <hadley@posit.co>',
          license: 'MIT + file LICENSE',
        },
        repository: {
          type: 'git',
          url: 'https://github.com/tidyverse/ggplot2',
          bugreports: 'https://github.com/tidyverse/ggplot2/issues',
        },
        exists: true,
      });
    });

    it('should handle package without GitHub URL', () => {
      const packageInfoNoGitHub: CranPackageInfo = {
        ...mockPackageInfo,
        URL: 'https://example.com/package',
        name: 'test-package'
      };

      const response = builder.buildSuccessResponse(
        'test-package',
        packageInfoNoGitHub,
        '',
        []
      );

      expect(response.installation.devtools).toBeUndefined();
      expect(response.repository).toBeUndefined();
    });

    it('should handle package without URL', () => {
      const packageInfoNoUrl: CranPackageInfo = {
        ...mockPackageInfo,
        URL: undefined,
        name: 'test-package'
      };

      const response = builder.buildSuccessResponse(
        'test-package',
        packageInfoNoUrl,
        '',
        []
      );

      expect(response.installation.devtools).toBeUndefined();
      expect(response.repository).toBeUndefined();
    });

    it('should handle empty readme content and examples', () => {
      const response = builder.buildSuccessResponse(
        'ggplot2',
        mockPackageInfo,
        '',
        []
      );

      expect(response.readme_content).toBe('');
      expect(response.usage_examples).toEqual([]);
      expect(response.exists).toBe(true);
    });

    it('should handle missing optional fields in package info', () => {
      const minimalPackageInfo: CranPackageInfo = {
        Package: 'minimal-package',
        Version: '1.0.0',
        Title: 'Minimal Package',
        Description: 'A minimal package for testing',
        name: 'minimal-package'
      };

      const response = builder.buildSuccessResponse(
        'minimal-package',
        minimalPackageInfo,
        'README content',
        []
      );

      expect(response.basic_info.author).toBeUndefined();
      expect(response.basic_info.maintainer).toBeUndefined();
      expect(response.basic_info.license).toBeUndefined();
      expect(response.repository).toBeUndefined();
    });
  });

  describe('createInstallationInfo (private method behavior)', () => {
    it('should create correct installation info for package with GitHub URL', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'test-pkg',
        Version: '1.0.0',
        Title: 'Test Package',
        Description: 'Test description',
        URL: 'https://github.com/user/repo',
        name: 'test-pkg'
      };

      const response = builder.buildSuccessResponse('test-pkg', packageInfo, '', []);

      expect(response.installation).toEqual({
        cran: 'install.packages("test-pkg")',
        devtools: 'devtools::install_github("user/repo")',
        remotes: 'remotes::install_cran("test-pkg")',
      });
    });

    it('should handle multiple URLs with GitHub URL', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'multi-url-pkg',
        Version: '1.0.0',
        Title: 'Multi URL Package',
        Description: 'Test description',
        URL: 'https://example.com/docs, https://github.com/user/multi-url-pkg, https://other.com',
        name: 'multi-url-pkg'
      };

      const response = builder.buildSuccessResponse('multi-url-pkg', packageInfo, '', []);

      expect(response.installation.devtools).toBe('devtools::install_github("user/multi-url-pkg")');
      expect(response.repository?.url).toContain('github.com/user/multi-url-pkg');
    });
  });

  describe('createRepositoryInfo (private method behavior)', () => {
    it('should extract GitHub repository info correctly', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'repo-test',
        Version: '1.0.0',
        Title: 'Repository Test',
        Description: 'Test description',
        URL: 'https://github.com/owner/repo-test',
        BugReports: 'https://github.com/owner/repo-test/issues',
        name: 'repo-test'
      };

      const response = builder.buildSuccessResponse('repo-test', packageInfo, '', []);

      expect(response.repository).toEqual({
        type: 'git',
        url: 'https://github.com/owner/repo-test',
        bugreports: 'https://github.com/owner/repo-test/issues',
      });
    });

    it('should handle URLs with trailing slashes and paths', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'path-test',
        Version: '1.0.0',
        Title: 'Path Test',
        Description: 'Test description',
        URL: 'https://github.com/owner/path-test/',
        name: 'path-test'
      };

      const response = builder.buildSuccessResponse('path-test', packageInfo, '', []);

      expect(response.repository?.url).toBe('https://github.com/owner/path-test/');
    });

    it('should handle no GitHub URL in multi-URL string', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'no-github',
        Version: '1.0.0',
        Title: 'No GitHub Package',
        Description: 'Test description',
        URL: 'https://example.com, https://docs.example.com',
        name: 'no-github'
      };

      const response = builder.buildSuccessResponse('no-github', packageInfo, '', []);

      expect(response.repository).toBeUndefined();
    });
  });

  describe('extractGitHubPath (private method behavior)', () => {
    it('should extract GitHub paths correctly through public interface', () => {
      const testCases = [
        {
          url: 'https://github.com/tidyverse/ggplot2',
          expectedPath: 'tidyverse/ggplot2'
        },
        {
          url: 'https://github.com/user/repo-name',
          expectedPath: 'user/repo-name'
        },
        {
          url: 'https://github.com/org/package.name',
          expectedPath: 'org/package.name'
        },
        {
          url: 'https://github.com/user/repo/issues',
          expectedPath: 'user/repo'
        },
      ];

      testCases.forEach(({ url, expectedPath }) => {
        const packageInfo: CranPackageInfo = {
          Package: 'test',
          Version: '1.0.0',
          Title: 'Test',
          Description: 'Test',
          URL: url,
          name: 'test'
        };

        const response = builder.buildSuccessResponse('test', packageInfo, '', []);
        expect(response.installation.devtools).toBe(`devtools::install_github("${expectedPath}")`);
      });
    });

    it('should handle malformed GitHub URLs gracefully', () => {
      const malformedUrls = [
        'not-a-url',
        'https://github.com/',
        'https://github.com/user',
        'https://notgithub.com/user/repo',
        '',
      ];

      malformedUrls.forEach(url => {
        const packageInfo: CranPackageInfo = {
          Package: 'test',
          Version: '1.0.0',
          Title: 'Test',
          Description: 'Test',
          URL: url,
          name: 'test'
        };

        const response = builder.buildSuccessResponse('test', packageInfo, '', []);
        
        if (url.includes('github.com') && url.includes('/')) {
          // Should still try to extract what it can
          expect(response.installation.devtools).toBeDefined();
        } else {
          // Should not include devtools installation for non-GitHub URLs
          expect(response.installation.devtools).toBeUndefined();
        }
      });
    });
  });

  describe('singleton instance', () => {
    it('should provide a default instance', async () => {
      const { packageResponseBuilder } = await import('../../src/services/package-response-builder.js');
      
      expect(packageResponseBuilder).toBeInstanceOf(PackageResponseBuilder);
      expect(typeof packageResponseBuilder.buildNotFoundResponse).toBe('function');
      expect(typeof packageResponseBuilder.buildSuccessResponse).toBe('function');
    });

    it('should maintain consistency across calls', async () => {
      const { packageResponseBuilder } = await import('../../src/services/package-response-builder.js');
      
      const response1 = packageResponseBuilder.buildNotFoundResponse('test', '1.0.0');
      const response2 = packageResponseBuilder.buildNotFoundResponse('test', '1.0.0');
      
      expect(response1).toEqual(response2);
    });
  });

  describe('edge cases', () => {
    it('should handle very long package names and descriptions', () => {
      const longName = 'a'.repeat(1000);
      const longDescription = 'b'.repeat(5000);
      
      const packageInfo: CranPackageInfo = {
        Package: longName,
        Version: '1.0.0',
        Title: 'Long Package',
        Description: longDescription,
        name: longName
      };

      const response = builder.buildSuccessResponse(longName, packageInfo, '', []);
      
      expect(response.package_name).toBe(longName);
      expect(response.description).toBe(longDescription);
      expect(response.basic_info.name).toBe(longName);
      expect(response.basic_info.description).toBe(longDescription);
    });

    it('should handle special characters in all fields', () => {
      const packageInfo: CranPackageInfo = {
        Package: 'test.pkg_123',
        Version: '1.0.0-beta+build.1',
        Title: 'Test Package with "quotes" & symbols',
        Description: 'Description with <HTML> tags & special chars: àáâãäå',
        Author: 'Author Name <email@domain.com> [aut, cre]',
        Maintainer: 'Maintainer Name <maintainer@domain.com>',
        License: 'GPL-3 | file LICENSE',
        URL: 'https://github.com/user/test.pkg_123',
        name: 'test.pkg_123'
      };

      const response = builder.buildSuccessResponse('test.pkg_123', packageInfo, '', []);
      
      expect(response.package_name).toBe('test.pkg_123');
      expect(response.version).toBe('1.0.0-beta+build.1');
      expect(response.basic_info.title).toContain('quotes');
      expect(response.basic_info.description).toContain('àáâãäå');
      expect(response.basic_info.author).toContain('[aut, cre]');
    });
  });
});