import { logger } from '../utils/logger.js';
import type { UsageExample } from '../types/index.js';

export class ReadmeParser {
  parseUsageExamples(readmeContent: string): UsageExample[] {
    const examples: UsageExample[] = [];
    const extractedIndices = new Set<number>();
    
    try {
      // Look for R code blocks
      const rExamples = this.extractRCodeExamples(readmeContent, extractedIndices);
      examples.push(...rExamples);

      // Look for installation examples (only from unused code blocks)
      const installExamples = this.extractInstallationExamples(readmeContent, extractedIndices);
      examples.push(...installExamples);

      // Look for usage sections (only from unused code blocks)
      const usageExamples = this.extractUsageSectionExamples(readmeContent, extractedIndices);
      examples.push(...usageExamples);

      logger.debug(`Parsed ${examples.length} usage examples from README`);
      return examples;
    } catch (error) {
      logger.warn('Failed to parse usage examples:', error);
      return [];
    }
  }

  private extractRCodeExamples(content: string, extractedIndices: Set<number>): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for R code blocks that are not quoted (not preceded by >)
    const rRegex = /```(?:r|R)\s*\n([\s\S]*?)\n```/gim;
    let match;
    
    while ((match = rRegex.exec(content)) !== null) {
      // Check if this is not a quoted code block by looking at preceding characters
      const lineStart = content.lastIndexOf('\n', match.index) + 1;
      const linePrefix = content.substring(lineStart, match.index).trim();
      const isQuoted = linePrefix.includes('>');
      
      if (!extractedIndices.has(match.index) && !isQuoted) {
        const code = match[1].trim();
        if (code.length > 0 && !code.includes('>')) { // Skip quoted content
          extractedIndices.add(match.index);
          const title = this.extractExampleTitle(content, match.index) || 'R Example';
          examples.push({
            title,
            code,
            language: 'r',
            description: this.extractExampleDescription(content, match.index),
          });
        }
      }
    }

    return examples;
  }

  private extractInstallationExamples(content: string, extractedIndices: Set<number>): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for R installation commands
    const installRegex = /```(?:r|R)?\s*\n([\s\S]*?install\.packages[\s\S]*?)\n```/gi;
    let match;
    
    while ((match = installRegex.exec(content)) !== null) {
      if (!extractedIndices.has(match.index)) {
        const code = match[1].trim();
        if (code.length > 0) {
          extractedIndices.add(match.index);
          examples.push({
            title: 'Installation',
            code,
            language: 'r',
            description: 'Package installation instructions',
          });
        }
      }
    }

    return examples;
  }

  private extractUsageSectionExamples(content: string, extractedIndices: Set<number>): UsageExample[] {
    const examples: UsageExample[] = [];
    
    // Look for usage sections and extract code (but not "Example" sections which are already handled)
    const usageMatch = content.match(/#+\s*(?:usage)\s*\n([\s\S]*?)(?=\n#+|\n$)/i);
    
    if (usageMatch) {
      const usageContent = usageMatch[1];
      const usageStart = usageMatch.index!;
      
      // Extract code blocks from usage section
      const codeBlockRegex = /```(?:r|R)?\s*\n([\s\S]*?)\n```/gi;
      let match;
      
      while ((match = codeBlockRegex.exec(usageContent)) !== null) {
        const absoluteIndex = usageStart + match.index;
        if (!extractedIndices.has(absoluteIndex)) {
          const code = match[1].trim();
          if (code.length > 0 && this.looksLikeR(code)) {
            extractedIndices.add(absoluteIndex);
            examples.push({
              title: 'Usage Example',
              code,
              language: 'r',
              description: 'Basic usage example',
            });
          }
        }
      }
    }

    return examples;
  }

  private extractExampleTitle(content: string, codeBlockIndex: number): string | undefined {
    // Look for heading before the code block
    const beforeCode = content.substring(Math.max(0, codeBlockIndex - 500), codeBlockIndex);
    
    // Find all headings and get the closest one to the code block
    const headingMatches = [...beforeCode.matchAll(/(#+)\s*([^\n]+)/g)];
    if (headingMatches.length > 0) {
      // Get the last (closest) heading
      const lastHeading = headingMatches[headingMatches.length - 1];
      return lastHeading[2].trim();
    }

    // Look for bold text that might be a title
    const boldMatch = beforeCode.match(/\*\*([^*]+)\*\*\s*$/m);
    if (boldMatch) {
      return boldMatch[1].trim();
    }

    return undefined;
  }

  private extractExampleDescription(content: string, codeBlockIndex: number): string | undefined {
    // Look for text after the title but before the code block
    const beforeCode = content.substring(Math.max(0, codeBlockIndex - 300), codeBlockIndex);
    
    // Split by lines and find text that's not a heading
    const lines = beforeCode.split('\n').reverse();
    let description = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines, headings, and the line with the code block marker
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('```')) {
        if (description) {break;} // Stop if we found some description
        continue;
      }
      
      description = trimmed + (description ? ' ' + description : '');
      
      // Stop at a reasonable length
      if (description.length > 200) {
        break;
      }
    }

    return description.length > 10 ? description : undefined;
  }

  private looksLikeR(code: string): boolean {
    // Simple heuristics to identify R code
    const rIndicators = [
      /library\(/,           // library calls
      /<-/,                  // assignment operator
      /\$\w+/,               // column access
      /data\.frame\(/,       // data frame creation
      /\bplot\(/,            // plotting
      /\bprint\(/,           // print statements
      /\bc\(/,               // combine function
      /\blm\(/,              // linear model
    ];
    
    return rIndicators.some(regex => regex.test(code));
  }

  extractPackageDescription(readmeContent: string): string {
    // Look for the first substantial paragraph or description
    const lines = readmeContent.split('\n');
    let description = '';
    let inCodeBlock = false;
    let foundTitle = false;

    for (const line of lines) {
      const trimmed = line.trim();

      // Track code blocks
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      // Skip code blocks
      if (inCodeBlock) {
        continue;
      }

      // Skip titles until we find one
      if (trimmed.startsWith('#')) {
        foundTitle = true;
        continue;
      }

      // Look for substantial content after a title
      if (foundTitle && trimmed.length > 20 && !trimmed.startsWith('![')) {
        description = trimmed;
        break;
      }
    }

    return description || 'R package';
  }
}

export const readmeParser = new ReadmeParser();