import { test, expect } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function resolveInspectorBin(): string {
  const pkgJsonPath = require.resolve("@modelcontextprotocol/inspector/package.json");
  const dir = dirname(pkgJsonPath);
  const pkg = JSON.parse(readFileSync(pkgJsonPath, "utf8"));
  // Prefer the server CLI bin if available to avoid starting the UI
  const serverBin = resolve(dir, "server/bin/cli.js");
  try {
    readFileSync(serverBin);
    return serverBin;
  } catch {}
  // Fallback to package bin field
  const binField = pkg.bin;
  if (typeof binField === "string") return resolve(dir, binField);
  if (binField && typeof binField === "object") {
    // Try to pick any bin that looks like server
    const entries = Object.values<string>(binField);
    const serverLike = entries.find((p) => p.includes("server/")) ?? entries[0];
    if (!serverLike) throw new Error("Inspector package has no bin field");
    return resolve(dir, serverLike);
  }
  throw new Error("Inspector package has no bin field");
}

const maybeTest = (process.env.RUN_INSPECTOR_TEST === "1") ? test : test.skip;

maybeTest("inspector CLI lists tools from local MCP server", async () => {
  const inspectorBin = resolveInspectorBin();
  const serverTs = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "./bin.ts"
  );

  const proc = Bun.spawn([
    process.execPath, // node
    inspectorBin,
    "--cli",
    "bun",
    serverTs,
    "--method",
    "tools/list"
  ], {
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env }
  });

  const out = await new Response(proc.stdout).text();
  const err = await new Response(proc.stderr).text();

  const exited = await proc.exited;
  if (exited !== 0) {
    console.error("Inspector stderr:\n" + err);
  }
  expect(exited).toBe(0);
  // Should list the tool names registered by the server
  expect(out).toContain("list-operations");
  expect(out).toContain("get-operation");
});
