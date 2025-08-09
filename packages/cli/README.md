# @workspace/cli (mcpgen)

CLI for generating an MCP server scaffold from an OpenAPI document.

## Usage
```sh
mcpgen --input <openapi.(json|yaml)> --out <dir> [--name <server-name>] [--runtime bun|node]

# examples
mcpgen --input ./petstore.json --out ./servers/petstore --name petstore-mcp
```

## Dev
- Run in workspace: `bun run packages/cli -- --help`
- Build (bundled + d.ts): `bun run -w packages/cli build`
- Typecheck: `bun run -w packages/cli typecheck`

## Notes
- Build uses Bun bundler for JS and `tsc --emitDeclarationOnly` for `.d.ts`.
- A post-build step adds a `#!/usr/bin/env node` shebang to `dist/index.js` so the `bin` works.
- The CLI delegates to `@workspace/core`.

