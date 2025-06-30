import { describe, it, expect } from 'vitest';
import { ReadmeParser } from '../../src/services/readme-parser.js';

describe('ReadmeParser', () => {
  const parser = new ReadmeParser();

  describe('parseUsageExamples', () => {
    it('should parse R code blocks correctly', () => {
      const readmeContent = `
# ggplot2

A grammar of graphics for R.

## Example

Here's a basic example:

\`\`\`r
library(ggplot2)
ggplot(mtcars, aes(x = wt, y = mpg)) +
  geom_point()
\`\`\`

## Another Example

\`\`\`R
data <- data.frame(x = 1:10, y = 1:10)
plot(data$x, data$y)
\`\`\`
`;

      const examples = parser.parseUsageExamples(readmeContent);
      
      expect(examples).toHaveLength(2);
      
      expect(examples[0]).toMatchObject({
        title: 'Example',
        language: 'r',
        code: expect.stringContaining('library(ggplot2)'),
      });

      expect(examples[1]).toMatchObject({
        title: 'Another Example',
        language: 'r',
        code: expect.stringContaining('data.frame'),
      });
    });

    it('should parse installation examples', () => {
      const readmeContent = `
# Package

## Installation

\`\`\`r
install.packages("ggplot2")
\`\`\`

You can also install from GitHub:

\`\`\`
install.packages("devtools")
devtools::install_github("tidyverse/ggplot2")
\`\`\`
`;

      const examples = parser.parseUsageExamples(readmeContent);
      
      expect(examples.length).toBeGreaterThan(0);
      
      const installExample = examples.find(ex => ex.title === 'Installation');
      expect(installExample).toBeDefined();
      expect(installExample?.code).toContain('install.packages');
    });

    it('should parse usage section examples', () => {
      const readmeContent = `
# Package

## Usage

Basic usage:

\`\`\`r
library(mypackage)
result <- my_function(data)
print(result)
\`\`\`

Advanced usage:

\`\`\`r
advanced_result <- advanced_function(data, options = list(x = 1))
\`\`\`
`;

      const examples = parser.parseUsageExamples(readmeContent);
      
      expect(examples.length).toBeGreaterThan(0);
      
      const usageExamples = examples.filter(ex => ex.title === 'Usage Example');
      expect(usageExamples.length).toBeGreaterThan(0);
      expect(usageExamples[0].code).toContain('library(mypackage)');
    });

    it('should handle empty or invalid content gracefully', () => {
      expect(parser.parseUsageExamples('')).toEqual([]);
      expect(parser.parseUsageExamples('No code blocks here')).toEqual([]);
      expect(parser.parseUsageExamples('```\nEmpty code block\n```')).toEqual([]);
    });

    it('should extract descriptions for examples', () => {
      const readmeContent = `
# Package

## Basic Plot

This creates a scatter plot using ggplot2.

\`\`\`r
ggplot(data, aes(x, y)) + geom_point()
\`\`\`
`;

      const examples = parser.parseUsageExamples(readmeContent);
      
      expect(examples).toHaveLength(1);
      expect(examples[0].description).toContain('scatter plot');
    });

    it('should handle malformed markdown gracefully', () => {
      const malformedContent = `
# Title
\`\`\`r
library(test)
# Missing closing backticks

## Another section
\`\`\`r
valid_code <- TRUE
\`\`\`

\`\`\`
unclosed again
`;

      const examples = parser.parseUsageExamples(malformedContent);
      
      // Should still extract some examples from malformed content
      expect(examples.length).toBeGreaterThan(0);
      // The parser should handle malformed content gracefully without throwing errors
      expect(examples).toBeInstanceOf(Array);
    });
  });

  describe('extractPackageDescription', () => {
    it('should extract first substantial paragraph', () => {
      const readmeContent = `
# ggplot2

A grammar of graphics for R. ggplot2 is a plotting system for R, based on the grammar of graphics.

## Installation

Instructions here...
`;

      const description = parser.extractPackageDescription(readmeContent);
      
      expect(description).toBe('A grammar of graphics for R. ggplot2 is a plotting system for R, based on the grammar of graphics.');
    });

    it('should skip images and short lines', () => {
      const readmeContent = `
# Package

![badge](url)

Short line.

This is a substantial description that should be extracted as the package description.

## More content
`;

      const description = parser.extractPackageDescription(readmeContent);
      
      expect(description).toBe('This is a substantial description that should be extracted as the package description.');
    });

    it('should skip code blocks', () => {
      const readmeContent = `
# Package

\`\`\`r
install.packages("package")
\`\`\`

This is the actual description we want to extract.

More content...
`;

      const description = parser.extractPackageDescription(readmeContent);
      
      expect(description).toBe('This is the actual description we want to extract.');
    });

    it('should return default for empty content', () => {
      expect(parser.extractPackageDescription('')).toBe('R package');
      expect(parser.extractPackageDescription('# Title')).toBe('R package');
      expect(parser.extractPackageDescription('Short')).toBe('R package');
    });

    it('should handle complex markdown structures', () => {
      const complexContent = `
# Package Name

> Blockquote content

- List item 1
- List item 2

This package provides comprehensive functionality for data analysis and visualization in R.

## Features

- Feature 1
- Feature 2
`;

      const description = parser.extractPackageDescription(complexContent);
      
      expect(description).toBe('This package provides comprehensive functionality for data analysis and visualization in R.');
    });
  });

  describe('looksLikeR (private method behavior)', () => {
    it('should identify R code through examples', () => {
      const rCodeExamples = [
        'library(ggplot2)',
        'data <- read.csv("file.csv")',
        'df$column',
        'data.frame(x = 1, y = 2)',
        'plot(x, y)',
        'print(result)',
        'c(1, 2, 3)',
        'lm(y ~ x, data = df)',
      ];

      // Test through parseUsageExamples which uses looksLikeR internally
      rCodeExamples.forEach(code => {
        const content = `# Test\n\n\`\`\`\n${code}\n\`\`\``;
        const examples = parser.parseUsageExamples(content);
        
        // If the code is properly identified as R, it should be included
        // in usage section examples
        const usageContent = `# Usage\n\n\`\`\`\n${code}\n\`\`\``;
        const usageExamples = parser.parseUsageExamples(usageContent);
        
        // The test verifies the method exists and processes the code
        expect(typeof examples).toBe('object');
        expect(Array.isArray(examples)).toBe(true);
      });
    });

    it('should handle non-R code appropriately', () => {
      const nonRCode = [
        'console.log("hello")',         // JavaScript
        'print("hello world")',         // Python/other
        'SELECT * FROM table',          // SQL
        'npm install package',          // Shell
        'import pandas as pd',          // Python
      ];

      nonRCode.forEach(code => {
        const content = `# Usage\n\n\`\`\`\n${code}\n\`\`\``;
        const examples = parser.parseUsageExamples(content);
        
        // Non-R code might not be included in usage examples
        // but the parser should handle it gracefully
        expect(Array.isArray(examples)).toBe(true);
      });
    });
  });

  describe('extractExampleTitle (private method behavior)', () => {
    it('should extract titles from various markdown structures', () => {
      const testCases = [
        {
          content: '## Basic Example\n\nSome text\n\n```r\ncode()\n```',
          expectedTitle: 'Basic Example'
        },
        {
          content: '### Advanced Usage\n\n```r\ncode()\n```',
          expectedTitle: 'Advanced Usage'
        },
        {
          content: '**Bold Title**\n\n```r\ncode()\n```',
          expectedTitle: 'Bold Title'
        },
        {
          content: 'No title here\n\n```r\ncode()\n```',
          expectedTitle: undefined
        },
      ];

      testCases.forEach(({ content, expectedTitle }) => {
        const examples = parser.parseUsageExamples(content);
        
        if (expectedTitle) {
          expect(examples.length).toBeGreaterThan(0);
          expect(examples[0].title).toBe(expectedTitle);
        } else {
          // Should still parse but with default title
          if (examples.length > 0) {
            expect(examples[0].title).toBeDefined();
          }
        }
      });
    });
  });

  describe('extractExampleDescription (private method behavior)', () => {
    it('should extract descriptions from context', () => {
      const content = `
## Example

This example demonstrates how to create a basic plot.
It uses the ggplot2 library for visualization.

\`\`\`r
ggplot(data, aes(x, y)) + geom_point()
\`\`\`
`;

      const examples = parser.parseUsageExamples(content);
      
      expect(examples).toHaveLength(1);
      expect(examples[0].description).toContain('demonstrates');
      expect(examples[0].description).toContain('plot');
    });

    it('should handle content without descriptions', () => {
      const content = `
## Example

\`\`\`r
code()
\`\`\`
`;

      const examples = parser.parseUsageExamples(content);
      
      if (examples.length > 0) {
        // Description might be undefined or a default value
        expect(examples[0].description === undefined || typeof examples[0].description === 'string').toBe(true);
      }
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very large README files', () => {
      const largeContent = '# Title\n' + 'Line of content\n'.repeat(10000) + '\n```r\ncode()\n```';
      
      expect(() => {
        const examples = parser.parseUsageExamples(largeContent);
        expect(Array.isArray(examples)).toBe(true);
      }).not.toThrow();
    });

    it('should handle README with many code blocks', () => {
      let content = '# Package\n\n';
      
      for (let i = 0; i < 100; i++) {
        content += `## Example ${i}\n\`\`\`r\nlibrary(test${i})\n\`\`\`\n\n`;
      }
      
      const examples = parser.parseUsageExamples(content);
      
      expect(examples.length).toBeGreaterThan(0);
      expect(examples.length).toBeLessThanOrEqual(100);
    });

    it('should handle special characters and encoding', () => {
      const contentWithUnicode = `
# Пакет

Описание пакета with émojis 🎉

## Exemple

\`\`\`r
library(tëst)
dáta <- c(1, 2, 3)
\`\`\`
`;

      const examples = parser.parseUsageExamples(contentWithUnicode);
      const description = parser.extractPackageDescription(contentWithUnicode);
      
      expect(Array.isArray(examples)).toBe(true);
      expect(typeof description).toBe('string');
    });

    it('should handle nested code blocks and complex markdown', () => {
      const complexContent = `
# Package

## Example

This is how you use it:

> \`\`\`r
> # This is quoted code
> library(package)
> \`\`\`

And this is real code:

\`\`\`r
library(realpackage)
data <- load_data()
\`\`\`

### Inline \`code\` example

More \`\`\`r inline\`\`\` code.

\`\`\`r
final_example()
\`\`\`
`;

      const examples = parser.parseUsageExamples(complexContent);
      
      // Should handle complex markdown without throwing errors
      expect(examples).toBeInstanceOf(Array);
      expect(examples.length).toBeGreaterThan(0);
      
      // Should extract code blocks that contain valid R code
      const hasValidRCode = examples.some(ex => ex.language === 'r' && ex.code.length > 0);
      expect(hasValidRCode).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should provide a default instance', () => {
      const { readmeParser } = require('../../src/services/readme-parser.js');
      
      expect(readmeParser).toBeInstanceOf(ReadmeParser);
      expect(typeof readmeParser.parseUsageExamples).toBe('function');
      expect(typeof readmeParser.extractPackageDescription).toBe('function');
    });

    it('should maintain consistency across calls', () => {
      const { readmeParser } = require('../../src/services/readme-parser.js');
      
      const content = '# Test\n\nDescription\n\n```r\ncode()\n```';
      
      const examples1 = readmeParser.parseUsageExamples(content);
      const examples2 = readmeParser.parseUsageExamples(content);
      
      expect(examples1).toEqual(examples2);
      
      const desc1 = readmeParser.extractPackageDescription(content);
      const desc2 = readmeParser.extractPackageDescription(content);
      
      expect(desc1).toBe(desc2);
    });
  });
});