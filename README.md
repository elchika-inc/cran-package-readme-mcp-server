# CRAN Package README MCP Server

[![license](https://img.shields.io/npm/l/cran-package-readme-mcp-server)](https://github.com/elchika-inc/cran-package-readme-mcp-server/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/cran-package-readme-mcp-server)](https://www.npmjs.com/package/cran-package-readme-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/cran-package-readme-mcp-server)](https://www.npmjs.com/package/cran-package-readme-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/elchika-inc/cran-package-readme-mcp-server)](https://github.com/elchika-inc/cran-package-readme-mcp-server)

An MCP (Model Context Protocol) server that enables AI assistants to fetch comprehensive information about CRAN (Comprehensive R Archive Network) packages, including README content, package metadata, and search functionality.

## Features

- **Package README Retrieval**: Fetch formatted README content with usage examples from R/CRAN packages hosted on CRAN repository
- **Package Information**: Get comprehensive package metadata including dependencies, versions, maintainer information, and documentation
- **Package Search**: Search CRAN repository with filtering by category, topic, and popularity
- **Smart Caching**: Intelligent caching system to optimize API usage and improve response times
- **GitHub Integration**: Seamless integration with GitHub API for enhanced README fetching from package repositories
- **Error Handling**: Robust error handling with automatic retry logic and fallback strategies

## MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "cran-package-readme": {
      "command": "npx",
      "args": ["cran-package-readme-mcp-server"],
      "env": {
        "GITHUB_TOKEN": "your_github_token_here"
      }
    }
  }
}
```

> **Note**: The `GITHUB_TOKEN` is optional but recommended for higher API rate limits when fetching README content from GitHub.

## Available Tools

### get_package_readme

Retrieves comprehensive README content and usage examples for CRAN packages.

**Parameters:**
```json
{
  "package_name": "ggplot2",
  "version": "latest",
  "include_examples": true
}
```

- `package_name` (string, required): CRAN package name (e.g., "ggplot2", "dplyr")
- `version` (string, optional): Specific package version or "latest" (default: "latest")
- `include_examples` (boolean, optional): Include usage examples and code snippets (default: true)

**Returns:** Formatted README content with installation instructions, usage examples, and function documentation.

### get_package_info

Fetches detailed package metadata, dependencies, and maintainer information from CRAN.

**Parameters:**
```json
{
  "package_name": "dplyr",
  "include_dependencies": true,
  "include_dev_dependencies": false
}
```

- `package_name` (string, required): CRAN package name
- `include_dependencies` (boolean, optional): Include runtime dependencies (default: true)
- `include_dev_dependencies` (boolean, optional): Include development dependencies (default: false)

**Returns:** Package metadata including version info, maintainer details, license, download stats, and dependency information.

### search_packages

Searches CRAN repository for packages with filtering capabilities.

**Parameters:**
```json
{
  "query": "machine learning",
  "limit": 20,
  "category": "MachineLearning"
}
```

- `query` (string, required): Search terms (package name, description, keywords)
- `limit` (number, optional): Maximum number of results to return (default: 20, max: 100)
- `category` (string, optional): Filter by package category (Graphics, Statistics, MachineLearning, etc.)

**Returns:** List of matching packages with names, descriptions, maintainers, and popularity metrics.

## Error Handling

The server handles common error scenarios gracefully:

- **Package not found**: Returns clear error messages with similar package suggestions
- **Rate limiting**: Implements automatic retry with exponential backoff
- **Network timeouts**: Configurable timeout with retry logic
- **Invalid package names**: Validates package name format and provides guidance
- **CRAN mirror failures**: Fallback strategies when primary CRAN mirror is unavailable

## License

MIT