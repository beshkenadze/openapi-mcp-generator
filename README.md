# OpenAPI → MCP Generator (Monorepo)

[![Tests](https://github.com/beshkenadze/openapi-mcp-generator/workflows/Tests/badge.svg)](https://github.com/beshkenadze/openapi-mcp-generator/actions)
[![CI](https://github.com/beshkenadze/openapi-mcp-generator/workflows/CI/badge.svg)](https://github.com/beshkenadze/openapi-mcp-generator/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Transform your OpenAPI specifications into powerful Model Context Protocol (MCP) servers that can be used with Claude Desktop, IDEs, and other MCP-compatible clients. This monorepo provides both a user-friendly CLI and a programmatic library for seamless integration.

## Requirements

- Bun 1.2+ installed locally: https://bun.sh
- Node.js 18+ (runtime compatibility for generated projects)

## Monorepo Structure

- `packages/core`: Core generator library (`@aigentools/mcpgen-core`)
- `packages/cli`: CLI (`@aigentools/mcpgen`, bin: `mcpgen`)
- `packages/tsconfig`: Shared TS config
- `turbo.json`: Turborepo pipeline
- `biome.json`: Biome config
- `tsconfig.json`: Root TS config

## Installation

```bash
# Clone and setup
git clone https://github.com/beshkenadze/openapi-mcp-generator.git
cd openapi-mcp-generator
bun install
bun run build
```

### Alternative: Using Task (Optional)
If you have [Task](https://taskfile.dev/) installed, you can use the provided shortcuts:

```bash
task install    # Same as: bun install
task build      # Same as: bun run build  
task typecheck  # Same as: bun run typecheck
task test       # Same as: bun run test
task lint       # Same as: bun run lint
```

## Quick Start

Choose your preferred method to generate MCP servers from OpenAPI specifications:

### 🚀 Method 1: Using the CLI (Recommended for most users)

#### Interactive Mode (Easiest)
```bash
# After installation, run in interactive mode
cd packages/cli
bun run dev

# Or using Task shortcut:
task gen:interactive

# The CLI will prompt you for:
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

# Using Taskfile shortcuts for Petstore example:
task gen:petstore           # Generate Petstore MCP server
task install:petstore       # Install dependencies in generated server
task prism:inspect:cli      # Generate + test with Prism mock server + MCP Inspector

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
bun add @aigentools/mcpgen-core  # or npm install
```

Generate servers programmatically:
```typescript
import { generateServerFromOpenAPI } from "@aigentools/mcpgen-core";

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

The structure depends on the chosen runtime:

#### Standard Runtime (Bun/Node)
```
my-server/
├── mcp-server/
│   └── index.ts           # Complete MCP server (single file)
├── package.json           # Dependencies and scripts  
├── .env.example          # Environment variables template
└── README.md             # Usage instructions
```

#### Hono Runtime (Web Server)
```
my-server/
├── src/
│   └── server.ts          # Hono web server with multiple transports
├── package.json           # Dependencies and scripts
├── Dockerfile            # Docker deployment support
├── biome.json           # Code formatting configuration
└── README.md            # Usage and transport endpoint documentation
```

### ▶️ Running Your Generated MCP Server

#### Standard Runtime (Bun/Node)
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

#### Hono Runtime (Web Server with Multiple Transports)
```bash
# Navigate to generated server
cd ./servers/petstore

# Install dependencies
bun install

# Development server with hot reload
bun run dev

# Production server
bun run build && bun run start

# The server provides multiple transport options:
# 🌐 HTTP transport: http://localhost:3000/mcp
# 📡 SSE transport: http://localhost:3000/mcp/sse  
# 🔗 Stdio transport: ws://localhost:3000/mcp/stdio
# 🏥 Health check: http://localhost:3000/health
```

### 🔌 Connecting to Claude Desktop

The connection method depends on the runtime used:

#### Standard Runtime (Stdio Transport)
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

#### Hono Runtime (HTTP Transport)
First, start your Hono server, then configure Claude Desktop to use HTTP transport:

```json
{
  "mcpServers": {
    "petstore": {
      "transport": {
        "type": "http",
        "url": "http://localhost:3000/mcp"
      },
      "env": {
        "API_BASE_URL": "https://petstore.swagger.io/v2"
      }
    }
  }
}
```

#### Alternative: SSE Transport (Hono)
For streaming capabilities, use Server-Sent Events transport:

```json
{
  "mcpServers": {
    "petstore": {
      "transport": {
        "type": "sse",
        "url": "http://localhost:3000/mcp/sse"
      },
      "env": {
        "API_BASE_URL": "https://petstore.swagger.io/v2"
      }
    }
  }
}
```

## 📚 Complete Examples

### Example 1: Petstore API (Standard Runtime)

```bash
# Method 1: Using Taskfile (easiest for Petstore)
task gen:petstore           # Generates the Petstore MCP server
task install:petstore       # Installs dependencies
task prism:inspect:cli      # Tests with Prism mock server + MCP Inspector

# Method 2: Using CLI interactively  
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

**Testing the generated server:**
```bash
# Start Prism mock server (in one terminal)
task prism:mock

# Test your server with MCP Inspector (in another terminal)
cd servers/petstore-mcp  
API_BASE_URL=http://127.0.0.1:4010 bun --bun mcp-server/index.ts
```

### Example 2: Petstore API with Hono Runtime (Web Server)

```bash
# Generate Hono-based MCP server with multiple transports
cd packages/cli
bun run dev --input https://petstore.swagger.io/v2/swagger.json --out ./servers/petstore-hono --name petstore-hono --runtime hono

# Navigate and install dependencies
cd ./servers/petstore-hono
bun install

# Start development server with hot reload
bun run dev
```

The Hono server provides multiple connection endpoints:

**HTTP Transport (POST requests):**
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

**SSE Transport (Server-Sent Events):**
```bash
curl -N http://localhost:3000/mcp/sse
# Returns streaming MCP responses
```

**Health Checks:**
```bash
curl http://localhost:3000/health
# {"status":"ok","server":"petstore-hono"}
```

**Docker Deployment:**
```bash
# Build and run with Docker
docker build -t petstore-hono .
docker run -p 3000:3000 -e API_BASE_URL=https://petstore.swagger.io/v2 petstore-hono
```

### Example 3: GitHub API (Advanced)

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

### Example 4: Custom API (Programmatic)

```typescript
// generate-mcp.ts
import { generateServerFromOpenAPI } from "@aigentools/mcpgen-core";

async function generateMyAPI() {
  try {
    const result = await generateServerFromOpenAPI(
      "./my-api-spec.yaml",
      "./generated-servers/my-api",
      "my-company-api",
      {
        runtime: "hono",         // Generate Hono web server with multiple transports
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

### Example 5: Real-world Integration

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
- `--runtime, -r` Runtime: `bun` (default), `node`, or `hono` (HTTP + SSE + Stdio transports)
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

This monorepo uses **Turborepo** for build orchestration and caching. All commands automatically handle package dependencies and run tasks in the correct order.

### 📦 Releases and Versioning

For information about releasing packages, version management, and publishing workflow, see **[docs/releasing.md](docs/releasing.md)**.

### Standard Development Commands

```bash
# Build all packages (with dependency management via Turborepo)
bun run build

# Type check all packages
bun run typecheck  

# Lint and format all packages (Biome v2)
bun run lint
bun run format

# Run tests across all packages
bun run test

# Target specific packages using Turborepo filters
bunx turbo run build --filter=@aigentools/mcpgen-core     # Build core package only
bunx turbo run test --filter=@aigentools/mcpgen       # Test CLI package only
bunx turbo run typecheck --filter=@workspace/*    # Type check all workspace packages
```

### Taskfile Shortcuts

If you have [Task](https://taskfile.dev/) installed, use these convenient shortcuts:

```bash
# Basic development commands
task install          # Install all dependencies
task build            # Build all packages
task typecheck        # Type check all packages
task test             # Run all tests

# Package-specific builds (via Turborepo)
task build:core       # Build core package only
task build:cli        # Build CLI package only
task typecheck:core   # Type check core only
task typecheck:cli    # Type check CLI only

# Example workflows with Petstore
task gen:petstore           # Generate Petstore MCP server
task install:petstore       # Install dependencies in generated server
task test:gen:petstore      # Generate and verify files exist

# Testing with Prism mock server + MCP Inspector
task prism:mock            # Start Prism mock server
task prism:inspect:cli     # Full workflow: generate → test with Inspector CLI
task prism:inspect:ui      # Full workflow: generate → test with Inspector UI
task prism:smoke          # Complete smoke test chain
```

### Turborepo Benefits

- **Smart caching**: Build outputs are cached and reused across runs
- **Parallel execution**: Tasks run in parallel when possible
- **Dependency awareness**: Automatically builds dependencies first
- **Incremental builds**: Only rebuilds what changed

```bash
# See what Turborepo will run
bunx turbo run build --dry-run

# Run with verbose logging
bunx turbo run test --verbose

# Clear Turborepo cache
bunx turbo prune
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

## 🌐 Transport Options (Runtime Comparison)

Choose the right runtime for your needs:

### Standard Runtime (Bun/Node) - **Recommended for Claude Desktop**
- ✅ **Stdio Transport**: Direct process communication via stdin/stdout
- ✅ **Single File**: One `index.ts` file with complete MCP server
- ✅ **Zero Setup**: Works immediately with Claude Desktop
- ✅ **Lightweight**: Minimal dependencies
- ❌ **Limited to Claude**: Cannot be accessed via HTTP/web

### Hono Runtime - **Recommended for Web Integration**
- ✅ **HTTP Transport**: RESTful API endpoint at `/mcp`
- ✅ **SSE Transport**: Server-Sent Events at `/mcp/sse` for streaming
- ✅ **Stdio Transport**: WebSocket simulation at `/mcp/stdio` (experimental)
- ✅ **Web Compatible**: Access from browsers, web apps, and HTTP clients
- ✅ **Docker Ready**: Includes Dockerfile for easy deployment  
- ✅ **Health Checks**: Built-in `/health` endpoint for monitoring
- ✅ **Hot Reload**: Development server with watch mode
- ❌ **More Complex**: Requires running web server
- ❌ **Network Dependent**: Requires network connectivity

#### When to Use Each Runtime:

**Choose Standard (Bun/Node) when:**
- Using Claude Desktop exclusively
- Want simplest setup and deployment
- Need minimal resource usage
- Working with sensitive data (no network exposure)

**Choose Hono when:**
- Building web applications with MCP integration
- Need multiple client access (browser + Claude)
- Want to expose MCP tools as HTTP API
- Deploying to cloud/container environments
- Need monitoring and health checks

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
git clone https://github.com/beshkenadze/openapi-mcp-generator.git
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
