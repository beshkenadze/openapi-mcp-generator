# OpenAPI → MCP Generator (Monorepo)

[![Tests](https://github.com/USER/openapi-mcp-generator/workflows/Tests/badge.svg)](https://github.com/USER/openapi-mcp-generator/actions)
[![CI](https://github.com/USER/openapi-mcp-generator/workflows/CI/badge.svg)](https://github.com/USER/openapi-mcp-generator/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Transform your OpenAPI specifications into powerful Model Context Protocol (MCP) servers that can be used with Claude Desktop, IDEs, and other MCP-compatible clients. This monorepo provides both a user-friendly CLI and a programmatic library for seamless integration.

## Requirements

- Bun 1.2+ installed locally: https://bun.sh
- Node.js 18+ (runtime compatibility for generated projects)

## Monorepo Structure

- `packages/core`: Core generator library (`@workspace/core`)
- `packages/cli`: CLI (`@workspace/cli`, bin: `mcpgen`)
- `packages/tsconfig`: Shared TS config
- `turbo.json`: Turborepo pipeline
- `biome.json`: Biome config
- `tsconfig.json`: Root TS config

## Install

```sh
bun install
```

## Quick Start

Choose your preferred method to generate MCP servers from OpenAPI specifications:

### 🚀 Method 1: Using the CLI (Recommended for most users)

#### Interactive Mode (Easiest)
```bash
# Clone and setup
git clone <repository-url>
cd openapi-mcp-generator
bun install
bun run build

# Run in interactive mode - prompts guide you through the process
cd packages/cli
bun run dev

# The CLI will ask you for:
# - Path to your OpenAPI spec file
# - Server name (auto-suggested from spec)
# - Output directory
# - Runtime preference (Bun/Node)
```

#### Command Line Mode (For automation)
```bash
# Generate from a local OpenAPI spec
cd packages/cli
bun run dev --input ./examples/petstore.yaml --out ./servers/petstore --name petstore-mcp --runtime bun --force

# Generate from URL
bun run dev --input https://petstore.swagger.io/v2/swagger.json --out ./servers/petstore --name petstore-mcp

# Using configuration file
echo "openapi: ./api-spec.yaml
name: my-awesome-api-mcp" > config.yaml

bun run dev --config config.yaml --out ./my-server
```

### 🔧 Method 2: Using the Library (For programmatic integration)

Install in your project:
```bash
bun add @workspace/core  # or npm install
```

Generate servers programmatically:
```typescript
import { generateServerFromOpenAPI } from "@workspace/core";

// Simple usage
await generateServerFromOpenAPI(
  "./petstore.yaml",                    // OpenAPI spec path
  "./servers/petstore",                 // Output directory  
  "petstore-mcp"                       // Server name
);

// Advanced usage with options
const result = await generateServerFromOpenAPI(
  "./api-spec.yaml",
  "./custom-server",
  "my-api-mcp",
  {
    runtime: "bun",          // or "node"
    force: true,             // Overwrite existing files
    debug: true,             // Enable debug logging
    skipFormatting: false    // Format with Biome
  }
);

console.log(`Generated server: ${result.name}`);
console.log(`Location: ${result.outDir}`);
console.log(`Operations: ${result.operations.length}`);
```

### 📁 Generated Server Structure

Both methods create the same output structure:

```
my-server/
├── mcp-server/
│   └── index.ts           # Complete MCP server (single file)
├── package.json           # Dependencies and scripts  
├── .env.example          # Environment variables template
└── README.md             # Usage instructions
```

### ▶️ Running Your Generated MCP Server

```bash
# Navigate to generated server
cd ./servers/petstore

# Install dependencies (if needed)
bun install

# Start the server
bun run start
# or directly:
bun --bun mcp-server/index.ts

# The server runs via stdio and is ready for MCP clients!
```

### 🔌 Connecting to Claude Desktop

Add to your Claude Desktop MCP configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "petstore": {
      "command": "bun",
      "args": ["--bun", "/path/to/your/server/mcp-server/index.ts"],
      "env": {
        "API_BASE_URL": "https://petstore.swagger.io/v2"
      }
    }
  }
}
```

## 📚 Complete Examples

### Example 1: Petstore API (Basic)

```bash
# Using the CLI interactively
cd packages/cli
bun run dev

# When prompted:
# Input file: https://petstore.swagger.io/v2/swagger.json  
# Server name: petstore-api (auto-suggested)
# Output dir: ./servers/petstore-api (auto-suggested)
# Runtime: bun (default)
```

This creates an MCP server with tools like:
- `getPetById` - Find pet by ID
- `addPet` - Add a new pet to the store
- `updatePet` - Update an existing pet
- `deletePet` - Deletes a pet

### Example 2: GitHub API (Advanced)

```bash
# Download GitHub API spec
curl -o github.json https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json

# Generate with CLI
cd packages/cli
bun run dev --input github.json --out ./servers/github --name github-mcp --runtime bun

# Configure environment
cd ./servers/github
cp .env.example .env
# Edit .env to add:
# API_BASE_URL=https://api.github.com
# GITHUB_TOKEN=your_token_here
```

### Example 3: Custom API (Programmatic)

```typescript
// generate-mcp.ts
import { generateServerFromOpenAPI } from "@workspace/core";

async function generateMyAPI() {
  try {
    const result = await generateServerFromOpenAPI(
      "./my-api-spec.yaml",
      "./generated-servers/my-api",
      "my-company-api",
      {
        runtime: "bun",
        force: true,
        debug: true
      }
    );
    
    console.log(`✅ Generated MCP server: ${result.name}`);
    console.log(`📁 Location: ${result.outDir}`);
    console.log(`🔧 Tools created: ${result.operations.length}`);
    
    // List all generated tools
    result.operations.forEach(op => {
      console.log(`   - ${op.operationId || op.method}: ${op.summary}`);
    });
    
  } catch (error) {
    console.error("❌ Generation failed:", error);
  }
}

// Run it
generateMyAPI();
```

### Example 4: Real-world Integration

```bash
# Step 1: Generate server
cd packages/cli  
bun run dev --input ./specs/company-api.yaml --out ~/mcp-servers/company --name company-api

# Step 2: Test the server
cd ~/mcp-servers/company
bun --bun mcp-server/index.ts

# Step 3: Add to Claude Desktop
# Edit: ~/.claude_desktop_config.json
{
  "mcpServers": {
    "company-api": {
      "command": "bun",
      "args": ["--bun", "/Users/username/mcp-servers/company/mcp-server/index.ts"],
      "env": {
        "API_BASE_URL": "https://api.company.com/v1",
        "API_KEY": "your-api-key"
      }
    }
  }
}

# Step 4: Restart Claude Desktop and start using your API tools!
```

## 🔧 CLI Usage

Non-interactive flags:
- `--input, -i` OpenAPI spec path (`.yaml/.yml/.json`)
- `--output, --out, -o` Output directory
- `--name, -n` Server name (defaults to spec title or filename)
- `--runtime, -r` `bun` (default) or `node`
- `--force, -f` Overwrite when output directory is not empty
- `--config, -c` YAML config file (see below)
- `--help, -h` Show usage
- `--version, -v` Show version

Interactive mode:
- Missing flags are collected via prompts.
- Name suggestion uses spec `info.title` when available.
- Output suggestion: `./servers/<slugified-name>`.
- Overwrite confirmation for non-empty output directories (skip with `--force`).

Minimal configuration file (`--config mcpgen.config.yaml`):
```yaml
openapi: ./path/to/spec.yaml
name: my-mcp
# out dir can still be passed as --out; if omitted, defaults to "output"
```

## Development

Common scripts:
```sh
# build everything
bun run build

# typecheck all packages
bun run typecheck

# lint and format (Biome)
bun run lint
bun run format

# run tests across packages
bun run test

# build or test a specific package via Turbo filters
bun run --filter @workspace/cli build
bun run --filter @workspace/core test
```

Optional Taskfile shortcuts (if `go-task` is installed):
```sh
task install
task build
task typecheck
```

## Testing

- Unit tests are colocated as `*.test.ts` near sources.
- Test runner: Bun Test.
- Run all tests: `bun run test`.
- Examples:
  - Core: YAML/JSON parsing, name suggestion, server generation
  - CLI: arg parsing, interactive prompt flow (mocked), integration test spawning the bundled CLI

## 🚀 Generated MCP Server Features

Your generated MCP servers include:

- **🔧 Individual MCP Tools**: Each OpenAPI operation becomes a callable tool
- **✅ Zod Validation**: Automatic input parameter validation with detailed error messages
- **🛡️ Type Safety**: Full TypeScript support with proper interfaces
- **🔗 Smart URL Building**: Automatic path parameter substitution and query string handling
- **📝 Request Bodies**: JSON request body support for POST/PUT/PATCH operations
- **⚠️ Error Handling**: Comprehensive HTTP error handling with meaningful responses
- **🌐 Environment Configuration**: Configurable base URL via `API_BASE_URL` environment variable
- **🔐 Authentication**: Built-in API key support via headers

## 🔍 Troubleshooting

### Common Issues

**Q: CLI shows "command not found"**
```bash
# Make sure you've built the CLI first
cd packages/cli
bun run build
# Then use: bun run dev (from source) or node dist/index.js
```

**Q: Generated server can't connect to API**
```bash
# Check your .env file in the generated server
cd your-generated-server
cat .env
# Make sure API_BASE_URL is correctly set
```

**Q: OpenAPI spec validation fails**
```bash
# The generator validates specs strictly. Common issues:
# - Missing required fields in OpenAPI spec
# - Invalid JSON/YAML syntax
# - Unsupported OpenAPI version (use 3.0+)

# Test your spec independently:
curl -o spec.json "your-api-spec-url"
# Or validate online: https://editor.swagger.io/
```

**Q: MCP tools not showing in Claude Desktop**
```bash
# 1. Check Claude Desktop logs (Help > Developer Tools > Console)
# 2. Verify your claude_desktop_config.json syntax
# 3. Make sure paths are absolute, not relative
# 4. Test server independently:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | bun --bun your-server/mcp-server/index.ts
```

**Q: TypeScript errors in generated code**
```bash
# If you see TS errors, try:
cd your-generated-server
bun install  # Install missing dependencies
# Or regenerate with --force flag
```

### Debug Mode

Enable debug logging for troubleshooting:

```typescript
// Programmatic usage
await generateServerFromOpenAPI(spec, output, name, { debug: true });
```

```bash
# CLI usage - check console output for detailed logs
cd packages/cli
DEBUG=1 bun run dev --input spec.yaml --out ./output --name debug-server
```

## 📖 API Reference

### Core Library Functions

```typescript
// Main generation function
function generateServerFromOpenAPI(
  specPath: string,
  outputDir: string, 
  serverName: string,
  options?: {
    runtime?: 'bun' | 'node';
    force?: boolean;
    debug?: boolean;
    skipFormatting?: boolean;
  }
): Promise<{
  name: string;
  outDir: string;
  operations: Array<{
    method: string;
    path: string;
    operationId?: string;
    summary?: string;
  }>;
}>;

// Utility functions
function slugify(text: string): string;
function suggestNameFromSpec(specPath: string): Promise<string>;
function readTitleFromSpec(specPath: string): Promise<string>;
```

## 🤝 Contributing

We welcome contributions! Please:

1. **Fork the repository** and create a feature branch
2. **Follow the coding standards**: 
   ```bash
   bun run lint      # Check code style
   bun run typecheck # Validate TypeScript
   bun run test      # Run all tests
   ```
3. **Add tests** for new functionality
4. **Update documentation** as needed
5. **Submit a pull request** with a clear description

### Development Setup

```bash
git clone <repository-url>
cd openapi-mcp-generator
bun install
bun run build
bun run test  # Make sure everything works
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- Built with [Bun](https://bun.sh/) for fast JavaScript runtime
- Uses [@scalar/openapi-parser](https://github.com/scalar/openapi-parser) for robust OpenAPI parsing  
- Powered by [Model Context Protocol](https://modelcontextprotocol.io/) for AI tool integration
- Code generation via [ts-morph](https://ts-morph.com/) for precise TypeScript AST manipulation
