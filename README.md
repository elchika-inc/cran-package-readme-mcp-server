# CRAN Package README MCP Server

[![npm version](https://img.shields.io/npm/v/cran-package-readme-mcp-server)](https://www.npmjs.com/package/cran-package-readme-mcp-server)
[![npm downloads](https://img.shields.io/npm/dm/cran-package-readme-mcp-server)](https://www.npmjs.com/package/cran-package-readme-mcp-server)
[![GitHub stars](https://img.shields.io/github/stars/naoto24kawa/cran-package-readme-mcp-server)](https://github.com/naoto24kawa/cran-package-readme-mcp-server)
[![GitHub issues](https://img.shields.io/github/issues/naoto24kawa/cran-package-readme-mcp-server)](https://github.com/naoto24kawa/cran-package-readme-mcp-server/issues)
[![license](https://img.shields.io/npm/l/cran-package-readme-mcp-server)](https://github.com/naoto24kawa/cran-package-readme-mcp-server/blob/main/LICENSE)

An MCP (Model Context Protocol) server for fetching CRAN package README and documentation information.

## Features

This MCP server provides three main tools for interacting with CRAN packages:

### 1. `get_readme_from_cran`
Get package README and usage examples from CRAN.

**Parameters:**
- `package_name` (required): The name of the CRAN package (e.g., "ggplot2", "dplyr")
- `version` (optional): Version to retrieve (default: "latest")
- `include_examples` (optional): Whether to include usage examples (default: true)

### 2. `get_package_info_from_cran`
Get package basic information and dependencies from CRAN.

**Parameters:**
- `package_name` (required): The name of the CRAN package
- `include_dependencies` (optional): Whether to include dependencies (default: true)
- `include_dev_dependencies` (optional): Whether to include development dependencies (default: false)

### 3. `search_packages_from_cran`
Search for packages in CRAN.

**Parameters:**
- `query` (required): The search query
- `limit` (optional): Maximum number of results to return (default: 20, max: 100)
- `quality` (optional): Minimum quality score (0-1)
- `popularity` (optional): Minimum popularity score (0-1)

## Installation

```bash
npm install cran-package-readme-mcp-server
```

## Usage

### Claude Desktop Configuration

Add to your Claude Desktop configuration file:

```json
{
  "mcpServers": {
    "cran-readme": {
      "command": "npx",
      "args": ["cran-package-readme-mcp-server"]
    }
  }
}
```

### Direct Usage

```bash
npx cran-package-readme-mcp-server
```

## Example Usage

Once configured with Claude Desktop, you can use natural language to interact with CRAN packages:

- "Get the README for the ggplot2 package"
- "Show me information about the dplyr package including its dependencies"
- "Search for packages related to machine learning"
- "Find popular packages for data visualization"

## Development

### Prerequisites

- Node.js 18 or higher
- TypeScript

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd cran-package-readme-mcp-server

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Scripts

- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Run in development mode
- `npm start` - Start the server
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## License

MIT

## Author

naoto24kawa