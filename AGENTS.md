# Repository Guidelines

## Project Structure & Module Organization
- Monorepo (Bun + Turbo). Root: `turbo.json`, `biome.json`, `tsconfig.json`, `package.json`.
- Packages:
  - `@aigentools/mcpgen-core`: generator library; OpenAPI via `@scalar/openapi-parser` (YAML fallback).
  - `@aigentools/mcpgen`: `mcpgen` CLI (bundled for Node/Bun).
  - `@workspace/mcp-openapi-server`: MCP stdio server using the Petstore spec.
  - `@aigentools/mcpgen-tsconfig`: shared TS config.
- Tests: colocated as `*.test.ts` next to sources.
- OpenAPI spec: `packages/mcp-openapi-server/openapi/petstore.yaml`.

## Build, Test, and Development Commands
- Install: `bun install`
- Build all: `bun run build`
- Typecheck: `bun run typecheck`
- Lint/format: `bun run lint && bun run format`
- CLI: build `bun run -w packages/cli build`; run `bun run packages/cli -- --help`
- MCP server: dev `bun run -w packages/mcp-openapi-server dev`; build `bun run -w packages/mcp-openapi-server build`; inspector test `bun run -w packages/mcp-openapi-server test:inspector`
- Turbo filters: `turbo run build --filter=@aigentools/mcpgen`
- Taskfile (optional): `task build`, `task dev:server`, `task inspector:ui`

## Coding Style & Naming Conventions
- TypeScript (ESM), strict types; avoid `any`.
- Formatting/linting via Biome v2. Run `bun run format` and `bun run lint`.
- Names: files/folders kebab-case; vars/functions camelCase; types/classes/interfaces PascalCase; constants UPPER_SNAKE.
- Packages: scoped as `@aigentools/*` (published) or `@workspace/*` (internal); inter-deps via `workspace:*`.

## Testing Guidelines
- Runner: Bun test (`bun test`).
- Location: place tests as `*.test.ts` beside sources.
- Networking: mock with MSW (`setupServer` in Node tests).
- Optional Inspector tests: enable with `RUN_INSPECTOR_TEST=1`.
- Keep tests deterministic; mock external IO.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (e.g., `feat(cli): add init`).
- PRs: clear description, linked issues (e.g., `#123`), steps to verify, relevant logs/screens.
- Must pass: `bun run typecheck`, `bun run lint`, `bun run test`.
- Update docs (README, package READMEs) when behavior changes.

## Versioning & Release
- Use Changesets: `bun run changeset` → `bun run version:packages` → `bun run release`.

## Security & Configuration Tips
- Never commit secrets; use local `.env` for examples/smoke tests.
- Commit the lockfile; use `bun ci` in CI for reproducible installs.
- Keep changes scoped to a workspace; prefer `workspace:*` for local deps.
