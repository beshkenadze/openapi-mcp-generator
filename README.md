# openapi-mcp-generator (Monorepo)

A Turborepo monorepo for a library that generates MCP servers from OpenAPI specs. Uses Bun (PM/runtime), Biome v2, and TypeScript.

## Requirements

- Bun (latest) installed locally: https://bun.sh

## Install

```sh
bun install
```

## Quick Usage

CLI (scaffold a server from an OpenAPI JSON file):
```sh
bun run -w packages/cli build
bun run packages/cli -- --input ./examples/petstore.json --out ./servers/petstore --name petstore-mcp
```

Library API:
```ts
import { generateServerFromOpenAPI } from "@workspace/core";

generateServerFromOpenAPI({ path: "./petstore.json" }, { outDir: "./servers/petstore", name: "petstore-mcp" });
```

## Lint & Format (Biome v2)

```sh
bun run lint
bun run format
```

## Type-check and Build

```sh
bun run typecheck
bun run build
```

## Project Structure

- `packages/core`: Core generator library (OpenAPI -> MCP server scaffold), published internally as `@workspace/core`
- `packages/cli`: Command-line wrapper (`mcpgen`), published internally as `@workspace/cli`
- `turbo.json`: Turborepo pipeline
- `biome.json`: Biome v2 config
- `tsconfig.json`: Base TSConfig with project references

## Notes

- Turborepo + Bun: use `bun run <script>` or `bunx turbo <cmd>`.
- Biome CLI: installed as a devDependency; run via `bun run` scripts.
- OpenAPI: JSON supported in scaffold; add YAML by adding a parser (e.g., `yaml`) to `@openapi-mcp-generator/core`.
- MCP: generated server is a scaffold; wire real handlers, install the MCP SDK, and map OpenAPI operations to tools.

## References (Context7)

- Turborepo: create with `bunx create-turbo@latest`; run tasks with `turbo run <task>`.
- Bun Workspaces: define `"workspaces": ["apps/*", "packages/*"]` and use `workspace:*` for intra-repo deps.
- Biome v2: configure `biome.json`; run `biome format --write .` or `biome check --fix`.
- TypeScript: use `composite` + project `references` for monorepos.
