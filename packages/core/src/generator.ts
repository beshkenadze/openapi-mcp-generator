import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve, basename } from "node:path";
import type { GenerateOptions, OpenAPISource } from "./types";

export function generateServerFromOpenAPI(src: OpenAPISource, options: GenerateOptions) {
  const outDir = resolve(options.outDir);
  mkdirSync(outDir, { recursive: true });

  const format = src.format ?? (src.path.endsWith(".yaml") || src.path.endsWith(".yml") ? "yaml" : "json");
  if (format === "yaml") {
    // Minimal placeholder until YAML parsing is added
    throw new Error("YAML is not yet supported in this scaffold. Provide a JSON OpenAPI file or add a YAML parser.");
  }

  const raw = readFileSync(src.path, "utf8");
  let openapi: any;
  try {
    openapi = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Failed to parse OpenAPI JSON: ${e}`);
  }

  const serverName = options.name ?? inferName(openapi) ?? basename(options.outDir);

  // Emit a minimal MCP server skeleton (TypeScript)
  const pkgJson = {
    name: `@generated/${serverName}`,
    version: "0.0.0",
    private: true,
    type: "module",
    main: "dist/index.js",
    types: "dist/index.d.ts",
    scripts: {
      build: "tsc -p tsconfig.json",
      dev: "bun run src/index.ts"
    },
    dependencies: {
      // "@modelcontextprotocol/sdk": "latest" // add when ready
    },
    devDependencies: {}
  } as const;

  writeFileSync(resolve(outDir, "package.json"), JSON.stringify(pkgJson, null, 2));

  const tsconfig = {
    extends: "../../tsconfig.json",
    compilerOptions: {
      outDir: "dist",
      rootDir: "src",
      module: "ESNext",
      moduleResolution: "Bundler",
      declaration: true,
      noEmit: false,
      composite: true
    },
    include: ["src"]
  };
  writeFileSync(resolve(outDir, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));

  const indexTs = `// Generated MCP server scaffold for ${serverName}
// TODO: install and import the MCP SDK, then wire handlers to operations.

export async function start() {
  console.log("Starting MCP server: ${serverName}");
  // Parse env/config, register tools based on OpenAPI operations...
}

if (import.meta.main) {
  start();
}
`;
  mkdirSync(resolve(outDir, "src"), { recursive: true });
  writeFileSync(resolve(outDir, "src/index.ts"), indexTs);

  const metaJson = {
    info: openapi.info ?? null,
    paths: Object.keys(openapi.paths ?? {})
  };
  writeFileSync(resolve(outDir, "openapi.meta.json"), JSON.stringify(metaJson, null, 2));

  return { outDir, name: serverName, operations: Object.keys(openapi.paths ?? {}) };
}

function inferName(doc: any): string | undefined {
  const title = doc?.info?.title as string | undefined;
  if (!title) return undefined;
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

