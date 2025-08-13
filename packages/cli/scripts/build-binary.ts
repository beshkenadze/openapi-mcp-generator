#!/usr/bin/env bun
import { $ } from "bun";
import { existsSync, mkdirSync } from "node:fs";

// Ensure bin directory exists
if (!existsSync("./bin")) {
	mkdirSync("./bin", { recursive: true });
}

// Get build metadata
const bunVersion = await $`bun --version`.text();
const buildTime = new Date().toISOString();
const gitCommit =
	await $`git rev-parse --short HEAD 2>/dev/null || echo "unknown"`.text();

console.log("📦 Building binary with metadata...");
console.log(`   Version: ${bunVersion.trim()}`);
console.log(`   Time: ${buildTime}`);
console.log(`   Commit: ${gitCommit.trim()}`);

// Build the binary
await $`bun build --compile --minify --sourcemap \
  --define BUILD_VERSION=${JSON.stringify(bunVersion.trim())} \
  --define BUILD_TIME=${JSON.stringify(buildTime)} \
  --define GIT_COMMIT=${JSON.stringify(gitCommit.trim())} \
  src/index.ts --outfile bin/mcpgen`;

console.log("✅ Binary built successfully!");
console.log("📍 Location: ./bin/mcpgen");

// Test the binary
console.log("\n🧪 Testing binary...");
await $`./bin/mcpgen --version`;
