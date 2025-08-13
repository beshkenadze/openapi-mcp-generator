# OpenAPI → MCP Generator (Monorepo)

[![Tests](https://github.com/USER/openapi-mcp-generator/workflows/Tests/badge.svg)](https://github.com/USER/openapi-mcp-generator/actions)
[![CI](https://github.com/USER/openapi-mcp-generator/workflows/CI/badge.svg)](https://github.com/USER/openapi-mcp-generator/actions)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Generate Model Context Protocol (MCP) servers from OpenAPI specifications. This monorepo contains the core generator library and a CLI, built with Bun, TypeScript, Turborepo, and Biome.

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

### CLI

```sh
# build the CLI once (bundled)
bun run --filter @workspace/cli build

# generate a server from a local spec (after build)
bun --bun packages/cli/dist/index.js \
  --input ./path/to/petstore.yaml \
  --output ./servers/petstore \
  --name petstore-mcp \
  --runtime bun \
  --force

# or run interactively from source (prompts fill missing values)
bun run --filter @workspace/cli dev
```

Generated output includes:
- `openapi.meta.json`: summary of parsed operations
- `mcp-server/index.ts`: single-file stdio MCP server
- `.env.example`: base URL and optional API key
- `package.json`: start/dev scripts

Start the generated server:
```sh
cd ./servers/petstore
bun run start
# or
bun --bun mcp-server/index.ts
```

### Library API

```ts
import { generateServerFromOpenAPI } from "@workspace/core";

const result = await generateServerFromOpenAPI(
  { path: "./petstore.yaml" },
  { outDir: "./servers/petstore", name: "petstore-mcp", runtime: "bun", force: true, layout: "bun" }
);
console.log(result.outDir, result.name, result.operations);
```

## CLI Usage

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

## Notes

- Generated servers are scaffolds exposing tools derived from OpenAPI operations; wire up real HTTP handlers as needed.
- Security: basic API Key handling is included; extend as required for your APIs.
- The CLI delegates to the core generator and favors Bun runtime for the MCP server.

## Contributing

- Keep changes small and focused.
- Ensure `bun run typecheck`, `bun run lint`, and `bun run test` pass.
- Follow repository coding style (Biome v2) and TypeScript strictness.
