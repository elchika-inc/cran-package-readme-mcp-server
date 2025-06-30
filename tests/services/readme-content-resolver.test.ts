import { describe, it, expect } from 'vitest';
import { ReadmeContentResolver } from '../../src/services/readme-content-resolver.js';
import type { CranPackageInfo } from '../../src/types/index.js';

describe('ReadmeContentResolver', () => {
  const resolver = new ReadmeContentResolver();

  describe('resolveContent', () => {
    it('should create basic README when no GitHub URL is provided', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'test-package',
        Version: '1.0.0',
        Title: 'Test Package for R',
        Description: 'This is a test package for demonstration purposes.',
        name: 'test-package'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain('# test-package: Test Package for R');
      expect(content).toContain('This is a test package for demonstration purposes.');
      expect(content).toContain('install.packages("test-package")');
      expect(content).toContain('library(test-package)');
      expect(content).toContain('Current version: 1.0.0');
    });

    it('should attempt GitHub README when URL is provided', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'github-package',
        Version: '2.1.0',
        Title: 'GitHub Package',
        Description: 'A package hosted on GitHub.',
        URL: 'https://github.com/user/repo',
        name: 'github-package'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Since GitHub API call will fail in test environment,
      // it should fallback to basic README
      expect(content).toContain('# github-package: GitHub Package');
      expect(content).toContain('A package hosted on GitHub.');
    });

    it('should handle multiple URLs and find GitHub', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'multi-url',
        Version: '1.5.0',
        Title: 'Multi URL Package',
        Description: 'Package with multiple URLs.',
        URL: 'https://example.com/docs, https://github.com/user/multi-url, https://other.com',
        name: 'multi-url'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Should attempt GitHub URL and fallback to basic README
      expect(content).toContain('# multi-url: Multi URL Package');
      expect(content).toContain('Package with multiple URLs.');
    });

    it('should handle URLs without GitHub gracefully', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'no-github',
        Version: '3.0.0',
        Title: 'No GitHub Package',
        Description: 'Package without GitHub repository.',
        URL: 'https://example.com/package, https://docs.example.com',
        name: 'no-github'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain('# no-github: No GitHub Package');
      expect(content).toContain('Package without GitHub repository.');
      expect(content).toContain('Current version: 3.0.0');
    });

    it('should handle empty or undefined URL', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'no-url',
        Version: '1.0.0',
        Title: 'No URL Package',
        Description: 'Package without any URL.',
        URL: undefined,
        name: 'no-url'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain('# no-url: No URL Package');
      expect(content).toContain('Package without any URL.');
    });

    it('should handle missing package info fields gracefully', async () => {
      const minimalPackageInfo: CranPackageInfo = {
        Package: 'minimal',
        Version: '1.0.0',
        Title: undefined as any,
        Description: undefined as any,
        name: 'minimal'
      };

      const content = await resolver.resolveContent(minimalPackageInfo);

      expect(content).toContain('# minimal:');
      expect(content).toContain('install.packages("minimal")');
      expect(content).toContain('library(minimal)');
      expect(content).toContain('Current version: 1.0.0');
    });
  });

  describe('tryGetGitHubReadme (private method behavior)', () => {
    it('should handle single GitHub URL', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'single-github',
        Version: '1.0.0',
        Title: 'Single GitHub Package',
        Description: 'Package with single GitHub URL.',
        URL: 'https://github.com/user/single-github',
        name: 'single-github'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Should attempt to get from GitHub, but fall back to basic README
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });

    it('should handle malformed GitHub URLs', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'malformed-url',
        Version: '1.0.0',
        Title: 'Malformed URL Package',
        Description: 'Package with malformed GitHub URL.',
        URL: 'https://github.com/user, github.com/incomplete, not-a-url',
        name: 'malformed-url'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Should handle errors gracefully and create basic README
      expect(content).toContain('# malformed-url: Malformed URL Package');
    });

    it('should process multiple URLs correctly', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'multi-github',
        Version: '1.0.0',
        Title: 'Multi GitHub Package',
        Description: 'Package with multiple GitHub URLs.',
        URL: 'https://github.com/user/repo1, https://example.com, https://github.com/user/repo2',
        name: 'multi-github'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Should try first GitHub URL, then second if first fails
      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
    });
  });

  describe('createBasicReadme (private method behavior)', () => {
    it('should create well-formed README structure', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'structure-test',
        Version: '2.5.1',
        Title: 'Structure Test Package',
        Description: 'Testing README structure generation.',
        name: 'structure-test'
      };

      const content = await resolver.resolveContent(packageInfo);

      // Check for all major sections
      expect(content).toContain('# structure-test: Structure Test Package');
      expect(content).toContain('## Installation');
      expect(content).toContain('## Usage');
      expect(content).toContain('## Version');
      expect(content).toContain('## More Information');

      // Check for code blocks
      expect(content).toContain('```r\ninstall.packages("structure-test")\n```');
      expect(content).toContain('```r\nlibrary(structure-test)');

      // Check version info
      expect(content).toContain('Current version: 2.5.1');
    });

    it('should handle special characters in package info', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'special.chars_123',
        Version: '1.0.0-beta+build.1',
        Title: 'Package with "quotes" & symbols',
        Description: 'Description with <HTML> tags & special chars: àáâãäå',
        name: 'special.chars_123'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain('special.chars_123');
      expect(content).toContain('Package with "quotes" & symbols');
      expect(content).toContain('Description with <HTML> tags & special chars: àáâãäå');
      expect(content).toContain('1.0.0-beta+build.1');
      expect(content).toContain('install.packages("special.chars_123")');
      expect(content).toContain('library(special.chars_123)');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'This is a very long description that goes on and on. '.repeat(50);
      
      const packageInfo: CranPackageInfo = {
        Package: 'long-desc',
        Version: '1.0.0',
        Title: 'Long Description Package',
        Description: longDescription,
        name: 'long-desc'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain(longDescription);
      expect(content).toContain('# long-desc: Long Description Package');
    });

    it('should handle empty strings in package info', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'empty-fields',
        Version: '',
        Title: '',
        Description: '',
        name: 'empty-fields'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain('# empty-fields:');
      expect(content).toContain('install.packages("empty-fields")');
      expect(content).toContain('library(empty-fields)');
      expect(content).toContain('Current version:');
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null and undefined package fields', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'null-test',
        Version: null as any,
        Title: null as any,
        Description: null as any,
        URL: null as any,
        name: 'null-test'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('null-test');
    });

    it('should handle very long package names', async () => {
      const longName = 'very.long.package.name.that.goes.on.and.on.and.never.seems.to.end.really.long.name';
      
      const packageInfo: CranPackageInfo = {
        Package: longName,
        Version: '1.0.0',
        Title: 'Long Name Package',
        Description: 'Package with very long name.',
        name: longName
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(content).toContain(longName);
      expect(content).toContain(`install.packages("${longName}")`);
      expect(content).toContain(`library(${longName})`);
    });

    it('should handle URLs with various formats', async () => {
      const urlFormats = [
        'https://github.com/user/repo',
        'http://github.com/user/repo',
        'https://github.com/user/repo.git',
        'https://github.com/user/repo/',
        'https://github.com/user/repo/issues',
        'https://www.github.com/user/repo',
      ];

      for (const url of urlFormats) {
        const packageInfo: CranPackageInfo = {
          Package: 'url-test',
          Version: '1.0.0',
          Title: 'URL Test Package',
          Description: 'Testing various URL formats.',
          URL: url,
          name: 'url-test'
        };

        const content = await resolver.resolveContent(packageInfo);
        
        expect(typeof content).toBe('string');
        expect(content.length).toBeGreaterThan(0);
      }
    });

    it('should handle concurrent resolution calls', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'concurrent-test',
        Version: '1.0.0',
        Title: 'Concurrent Test Package',
        Description: 'Testing concurrent resolution.',
        name: 'concurrent-test'
      };

      const promises = Array(10).fill(null).map(() => 
        resolver.resolveContent(packageInfo)
      );

      const results = await Promise.all(promises);

      // All results should be identical
      results.forEach(result => {
        expect(result).toBe(results[0]);
        expect(result).toContain('concurrent-test');
      });
    });

    it('should handle whitespace in URL fields', async () => {
      const packageInfo: CranPackageInfo = {
        Package: 'whitespace-test',
        Version: '1.0.0',
        Title: 'Whitespace Test Package',
        Description: 'Testing whitespace in URLs.',
        URL: '  https://github.com/user/repo  ,  https://example.com  ',
        name: 'whitespace-test'
      };

      const content = await resolver.resolveContent(packageInfo);

      expect(typeof content).toBe('string');
      expect(content.length).toBeGreaterThan(0);
      expect(content).toContain('whitespace-test');
    });
  });

  describe('singleton instance', () => {
    it('should provide a default instance', async () => {
      const module = await import('../../src/services/readme-content-resolver.js');
      const { readmeContentResolver } = module;
      
      expect(readmeContentResolver).toBeInstanceOf(ReadmeContentResolver);
      expect(typeof readmeContentResolver.resolveContent).toBe('function');
    });

    it('should maintain consistency across calls', async () => {
      const module = await import('../../src/services/readme-content-resolver.js');
      const { readmeContentResolver } = module;
      
      const packageInfo: CranPackageInfo = {
        Package: 'consistency-test',
        Version: '1.0.0',
        Title: 'Consistency Test',
        Description: 'Testing consistency.',
        name: 'consistency-test'
      };

      const content1 = await readmeContentResolver.resolveContent(packageInfo);
      const content2 = await readmeContentResolver.resolveContent(packageInfo);
      
      expect(content1).toBe(content2);
    });
  });
});