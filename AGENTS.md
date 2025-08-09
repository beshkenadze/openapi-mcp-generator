# Repository Guidelines

## Project Structure & Module Organization
- Root: `turbo.json`, `biome.json`, `tsconfig.json`, `package.json` (Bun workspaces), `.gitignore`.
- Packages: `packages/core` (generator library), `packages/cli` (CLI), `packages/tsconfig` (shared TS config). Use internal scope `@workspace/<pkg>`.
- Tests: colocate as `*.test.ts` next to sources (e.g., `src/foo.test.ts`).

## Build, Test, and Development Commands
```sh
bun install                              # install all workspace deps
bun run build                            # build all packages (turbo pipeline)
bun run typecheck                        # TypeScript project-wide type checking
bun run lint && bun run format           # Biome linter + formatter
bun run -w packages/cli build            # build CLI only
bun run packages/cli -- --help           # run CLI in workspace
```

## Coding Style & Naming Conventions
- Formatting/linting: Biome v2 enforces style and organizes imports. Do not hand-format; run `bun run format`.
- Language: TypeScript (ESM). Keep strict types and avoid `any`.
- Names: files/folders kebab-case; variables/functions camelCase; classes/types/interfaces PascalCase; constants UPPER_SNAKE.
- Packages: kebab-case, scoped as `@workspace/*`.

## Testing Guidelines
- Framework: Bun test. Place tests as `*.test.ts` near source.
- Scope: unit tests preferred; mock external IO. Example: `bun test apps/web`.
- Add tests for new behavior and bug fixes. Keep tests deterministic.

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
