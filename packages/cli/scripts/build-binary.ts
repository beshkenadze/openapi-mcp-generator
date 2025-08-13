#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";

// Ensure bin directory exists
if (!existsSync("./bin")) {
	mkdirSync("./bin", { recursive: true });
}

// Get build metadata
const pkg = JSON.parse(await Bun.file("package.json").text());
const pkgName = String(pkg.name ?? "@aigentools/mcpgen");
const pkgVersion = String(pkg.version ?? "0.0.0");
const buildTime = new Date().toISOString();
const gitCommit =
    await $`git rev-parse --short HEAD 2>/dev/null || echo "unknown"`.text();

console.log("📦 Building binary with metadata...");
console.log(`   Name: ${pkgName}`);
console.log(`   Version: ${pkgVersion}`);
console.log(`   Time: ${buildTime}`);
console.log(`   Commit: ${gitCommit.trim()}`);

// Build the binary
await $`bun build --compile --minify --sourcemap \
  --define BUILD_NAME=${JSON.stringify(pkgName)} \
  --define BUILD_VERSION=${JSON.stringify(pkgVersion)} \
  --define BUILD_TIME=${JSON.stringify(buildTime)} \
  --define GIT_COMMIT=${JSON.stringify(gitCommit.trim())} \
  src/index.ts --outfile bin/mcpgen`;

console.log("✅ Binary built successfully!");
console.log("📍 Location: ./bin/mcpgen");

// Test the binary
console.log("\n🧪 Testing binary...");
await $`./bin/mcpgen --version`;
