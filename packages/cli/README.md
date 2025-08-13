# @workspace/cli (mcpgen)

CLI for generating an MCP server scaffold from an OpenAPI document.

## Usage
```sh
mcpgen --input <openapi.(json|yaml)> --out <dir> [--name <server-name>] [--runtime bun|node|hono] [--force]

# Standard runtime examples (stdio transport)
mcpgen --input ./petstore.json --out ./servers/petstore --name petstore-mcp --runtime bun
mcpgen --input ./petstore.json --out ./servers/petstore --name petstore-mcp --runtime node

# Hono runtime example (HTTP + SSE + WebSocket transports)
mcpgen --input ./petstore.json --out ./servers/petstore-web --name petstore-mcp --runtime hono
```

### Flags
- `--input, -i`: Path to the OpenAPI spec (`.yaml/.yml/.json`).
- `--out, -o`: Output directory for the scaffold.
- `--name, -n`: Server name; when omitted, clack suggests one.
- `--runtime, -r`: Runtime: `bun` (default), `node`, or `hono` (web server with HTTP/SSE/WebSocket).
- `--force, -f`: Skip confirmation when output directory is not empty.
- `--config, -c`: YAML config file with `openapi` and optional `name`.
- `--help, -h`: Show usage.
- `--version, -v`: Show version.

### Interactive mode (clack)
If any required flags are missing, `mcpgen` enters an interactive flow:
- Validates `--input` exists and has the correct extension.
- Suggests `--name` using `info.title` from the OpenAPI spec when available, falling back to the input filename (slugified) with `-mcp` appended.
- Suggests `--out` as `./servers/<name>`.
- Prompts for `--runtime` selection: Bun (recommended), Node.js, or Hono Web Server (HTTP + SSE + Stdio).
- Confirms overwriting an existing non-empty output directory (unless `--force`).

### Configuration file
Minimal supported YAML file when using `--config`:
```yaml
openapi: ./path/to/spec.yaml
name: my-mcp
runtime: hono  # optional: bun (default), node, or hono
# out can still be passed via --out; defaults to "output" if omitted
```

## Dev
- Run help from built binary: `bun --bun packages/cli/dist/index.js --help`
- Build (bundled + d.ts): `bun run --filter @workspace/cli build`
- Typecheck: `bun run -w packages/cli typecheck`

## Tests
- Run: `bun -w packages/cli test` or `cd packages/cli && bun test`
- Includes: unit tests for arg parsing and interactive prompts (mocked), plus an integration test that spawns the bundled CLI.

## Notes
- Build uses Bun bundler for JS and `tsc --emitDeclarationOnly` for `.d.ts`.
- A post-build step adds a `#!/usr/bin/env node` shebang to `dist/index.js` so the `bin` works.
- The CLI delegates to `@workspace/core`.
