# @aigentools/mcpgen

## 0.1.2

### Patch Changes

- [`e7a688e`](https://github.com/beshkenadze/openapi-mcp-generator/commit/e7a688e408e1db62fb6e3d4be9fc421e1261a346) Thanks [@beshkenadze](https://github.com/beshkenadze)! - docs: update releasing documentation for fully automated workflow

  - Updated docs/releasing.md to reflect GitHub Actions automation
  - Removed manual release instructions
  - Added monitoring and troubleshooting sections for automated releases

## 0.1.1

### Patch Changes

- [`375e118`](https://github.com/beshkenadze/openapi-mcp-generator/commit/375e1183ed810477d8d64e4d01c261d5dd9cf187) Thanks [@beshkenadze](https://github.com/beshkenadze)! - Rename packages for npm publication

  - Renamed @workspace/core to @aigentools/mcpgen-core
  - Renamed @workspace/cli to @aigentools/mcpgen for consistent scoped naming
  - Made packages public for npm publishing

- Updated dependencies [[`375e118`](https://github.com/beshkenadze/openapi-mcp-generator/commit/375e1183ed810477d8d64e4d01c261d5dd9cf187)]:
  - @aigentools/mcpgen-core@0.1.1

## 0.1.0

### Minor Changes

- Initial release with complete OpenAPI MCP generator functionality

  - 🚀 Core generator library with Bun, Node.js, and Hono runtime support
  - 🖥️ Interactive CLI with @clack/prompts for user-friendly experience
  - 📡 Multiple transport protocols: HTTP, SSE, WebSocket, and Stdio
  - ✅ Comprehensive test coverage and GitHub Actions CI/CD
  - 📦 Cross-platform binary distribution ready
  - 🔄 Git Flow automation and release management

### Patch Changes

- Updated dependencies []:
  - @aigentools/mcpgen-core@0.1.0
