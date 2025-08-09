# Repository Guidelines

## Project Structure & Module Organization
- Root: `turbo.json`, `biome.json`, `tsconfig.json`, `package.json` (Bun workspaces), `.gitignore`.
- Packages:
  - `packages/core` — generator library (+ OpenAPI parsing via `@scalar/openapi-parser` with YAML fallback).
  - `packages/cli` — CLI (`mcpgen`) bundled with Bun.
  - `packages/mcp-openapi-server` — basic MCP server using the parsed OpenAPI Petstore spec.
  - `packages/tsconfig` — shared TS config.
  - Use internal scope `@workspace/<pkg>` and kebab-case.
- Tests: colocate as `*.test.ts` next to sources (e.g., `src/foo.test.ts`).

## Build, Test, and Development Commands
```sh
bun install                                          # install all workspace deps
bun run build                                        # build all packages (turbo pipeline)
bun run typecheck                                    # TypeScript project-wide type checking
bun run lint && bun run format                       # Biome linter + formatter
bun run --filter @workspace/cli build                # build CLI only (bundled + d.ts)
bun run packages/cli -- --help                       # run CLI in workspace via direct path

# Or use turbo directly for per-package scripts
turbo run build --filter=@workspace/mcp-openapi-server
turbo run typecheck --filter=@workspace/cli
```

### Taskfile (optional)
If you use `go-task` (Taskfile.yml included), these are handy shortcuts:

```sh
task install                 # bun install
task typecheck               # bun run typecheck
task build                   # bun run build
task build:server            # build MCP server only
task dev:server              # run MCP server on stdio
task inspector:cli           # inspector CLI against local server
task inspector:ui            # inspector UI against local server (defaults: CLIENT_PORT=8080, SERVER_PORT=9000)

# Override ports if needed:
# task inspector:ui INSPECTOR_SERVER_PORT=9001
# task inspector:ui INSPECTOR_CLIENT_PORT=3000 INSPECTOR_SERVER_PORT=9002
```

### MCP Server
- Dev: `bun run -w packages/mcp-openapi-server dev`
- Build: `bun run -w packages/mcp-openapi-server build` (bundled output in `dist/index.js`)
- Spec: vendored at `packages/mcp-openapi-server/openapi/petstore.yaml`
 - Inspector test: `bun run -w packages/mcp-openapi-server test:inspector` (runs the Inspector CLI test)

### CLI (mcpgen)
- Build: `bun run -w packages/cli build` (adds shebang to `dist/index.js`)
- Run (workspace): `bun run packages/cli -- --help` or `node packages/cli/dist/index.js --help`
- Bin: `mcpgen` points to `dist/index.js`

## Coding Style & Naming Conventions
- Formatting/linting: Biome v2 enforces style and organizes imports. Do not hand-format; run `bun run format`.
- Language: TypeScript (ESM). Keep strict types and avoid `any`.
- Names: files/folders kebab-case; variables/functions camelCase; classes/types/interfaces PascalCase; constants UPPER_SNAKE.
- Packages: kebab-case, scoped as `@workspace/*`.

## Testing Guidelines
- Framework: Bun test. Place tests as `*.test.ts` near source.
- Scope: unit tests preferred; mock external IO. Example: `bun test apps/web`.
- Add tests for new behavior and bug fixes. Keep tests deterministic.
 - Network mocking: use MSW (`msw`) with `setupServer` in Node tests.
   - Example: `packages/mcp-openapi-server/src/client.test.ts` uses MSW and MCP SDK Client to list tools via stdio.
   - Optional Inspector CLI test: `inspector.test.ts` (skipped by default). Enable with `RUN_INSPECTOR_TEST=1`.

## Commit & Pull Request Guidelines
- Commits: prefer Conventional Commits (e.g., `feat(web): add health route`, `fix(ui): correct color token`). Small, focused changes.
- PRs: clear description, linked issues (`#123`), steps to verify, and any relevant logs/screens. Ensure:
  - `bun run typecheck`, `bun run lint`, `bun run test` all pass
  - docs updated (README, package-specific READMEs) when applicable

## Versioning & Release
- Changesets configured under `.changeset/`. Use:
  - `bun run changeset` to create changes
  - `bun run version:packages` to apply versions
  - `bun run release` to publish (if packages are public)

## Security & Configuration Tips
- Never commit secrets. Use local `.env` for examples/smoke tests (not committed).
- Commit the lockfile; use `bun ci` in CI for reproducible installs.
- Keep changes local to a workspace; wire inter-deps with `workspace:*`.

## Tooling Updates
- Bun pinned in root `package.json`: `"packageManager": "bun@1.2.19"` (required for Turbo).
- Bundling:
  - Core: `bun build` for JS + `tsc --emitDeclarationOnly` for types (externals: `@scalar/openapi-parser`, `yaml`).
  - CLI: `bun build` for JS + `tsc --emitDeclarationOnly`, then a post-step adds a shebang.
  - MCP server: `bun build` bundles a stdio server entry.
- TypeScript base config (`packages/tsconfig/tsconfig.json`):
  - `lib: ["ES2022"]`, `types: ["node", "bun-types"]` for Node/Bun globals.

## MCP and OpenAPI Notes
- MCP TypeScript SDK (`@modelcontextprotocol/sdk`) used to implement a basic server exposing:
  - Tools: `list-operations`, `get-operation`.
  - Resources: `openapi://spec`, `openapi://operation/{method}/{path}`.
- OpenAPI parsing in core and server prefers Scalar’s parser; falls back to `yaml`.
- References: Model Context Protocol docs (Server Concepts, Build an MCP Server) via context7 links.
