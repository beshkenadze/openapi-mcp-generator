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

console.log("📦 Building cross-platform binaries...");
console.log(`   Name: ${pkgName}`);
console.log(`   Version: ${pkgVersion}`);
console.log(`   Time: ${buildTime}`);
console.log(`   Commit: ${gitCommit.trim()}`);

const targets = [
	{ name: "linux-x64", target: "bun-linux-x64", ext: "" },
	{ name: "darwin-x64", target: "bun-darwin-x64", ext: "" },
	{ name: "darwin-arm64", target: "bun-darwin-arm64", ext: "" },
	{ name: "windows-x64", target: "bun-windows-x64", ext: ".exe" },
];

for (const { name, target, ext } of targets) {
	console.log(`\n🔨 Building for ${name}...`);

    await $`bun build --compile --target=${target} --minify --sourcemap \
    --define BUILD_NAME=${JSON.stringify(pkgName)} \
    --define BUILD_VERSION=${JSON.stringify(pkgVersion)} \
    --define BUILD_TIME=${JSON.stringify(buildTime)} \
    --define BUILD_TARGET=${JSON.stringify(name)} \
    --define GIT_COMMIT=${JSON.stringify(gitCommit.trim())} \
    src/index.ts --outfile bin/mcpgen-${name}${ext}`;

	console.log(`✅ Built bin/mcpgen-${name}${ext}`);
}

console.log("\n🎉 All binaries built successfully!");
console.log("\n📍 Available binaries:");
await $`ls -la bin/`;
