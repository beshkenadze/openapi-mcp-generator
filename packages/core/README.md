# @workspace/core

Generator library for scaffolding MCP servers from OpenAPI documents.

## Features
- Parses OpenAPI JSON or YAML (prefers `@scalar/openapi-parser`, falls back to `yaml`).
- Infers a server name from `info.title` when not provided.
- Emits a minimal MCP server scaffold with `@modelcontextprotocol/sdk` and `zod`.
- Writes OpenAPI metadata summary to `openapi.meta.json`.

## API
- `generateServerFromOpenAPI(src, options)`
  - `src`: `{ path: string; format?: 'json' | 'yaml' }`
  - `options`: `{ outDir: string; name?: string; runtime?: 'bun' | 'node' }`
  - Returns `{ outDir: string; name: string; operations: string[] }`.

## Usage
```ts
import { generateServerFromOpenAPI } from '@workspace/core';

const result = generateServerFromOpenAPI(
  { path: './petstore.yaml' },
  { outDir: './servers/petstore-mcp', name: 'petstore-mcp' }
);
console.log(result);
```

## Dev
- Build JS + d.ts: `bun run -w packages/core build`
- Typecheck: `bun run -w packages/core typecheck`
- Test: `bun run -w packages/core test`

Notes:
- Build uses Bun bundler for JS and `tsc --emitDeclarationOnly` for `.d.ts`.
- Externalized in bundle: `@scalar/openapi-parser`, `yaml`.

