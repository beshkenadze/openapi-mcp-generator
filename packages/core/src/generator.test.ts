import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generateServerFromOpenAPI } from "./generator";

const sample = {
  openapi: "3.0.0",
  info: { title: "Petstore", version: "1.0.0" },
  paths: { "/pets": { get: {} } }
};

test("generates scaffold from minimal OpenAPI JSON", () => {
  const dir = mkdtempSync(join(tmpdir(), "mcpgen-"));
  const input = resolve(dir, "openapi.json");
  Bun.write(input, JSON.stringify(sample));

  const outDir = resolve(dir, "out");
  const result = generateServerFromOpenAPI({ path: input }, { outDir, name: "petstore-mcp" });

  expect(result.name).toBe("petstore-mcp");
  expect(existsSync(resolve(outDir, "package.json"))).toBe(true);
  expect(existsSync(resolve(outDir, "src/index.ts"))).toBe(true);
  const meta = JSON.parse(readFileSync(resolve(outDir, "openapi.meta.json"), "utf8"));
  expect(meta.info.title).toBe("Petstore");
  expect(Array.isArray(result.operations)).toBe(true);

  rmSync(dir, { recursive: true, force: true });
});

