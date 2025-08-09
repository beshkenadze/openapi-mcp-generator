# @workspace/mcp-openapi-server

Basic MCP server using the Model Context Protocol TypeScript SDK and the Swagger Petstore OpenAPI specification.

## What it exposes
- Tools:
  - `list-operations`: lists HTTP method/path with optional `operationId` and summary.
  - `get-operation`: returns operation details; input: `{ method, path }`.
- Resources:
  - `openapi://spec`: the raw OpenAPI YAML.
  - `openapi://operation/{method}/{path}`: details for a specific operation (JSON text).

## Dev
- Run (stdio): `bun run -w packages/mcp-openapi-server dev`
- Build (bundled): `bun run -w packages/mcp-openapi-server build`
- Spec location: `openapi/petstore.yaml`

## Notes
- Uses `@modelcontextprotocol/sdk` with `StdioServerTransport`.
- Parses OpenAPI via `@scalar/openapi-parser`, falls back to `yaml` if needed.
- Output bundle: `dist/index.js` (ESM, target bun).

