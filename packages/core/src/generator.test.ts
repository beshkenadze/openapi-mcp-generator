import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { OpenAPIMcpGenerator } from "./index.js";

describe("OpenAPIMcpGenerator with templates", () => {
	let dir: string;

	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), "core-gen-"));
	});

	afterEach(() => {
		rmSync(dir, { force: true, recursive: true });
	});

	test("generates server using template repository", async () => {
		const specPath = join(dir, "spec.json");
		const outPath = join(dir, "server.ts");

		const spec = {
			openapi: "3.0.0",
			info: { title: "Test API", version: "1.0.0" },
			paths: {
				"/ping": {
					get: {
						summary: "Ping",
						responses: { "200": { description: "ok" } },
					},
				},
			},
		};
		writeFileSync(specPath, JSON.stringify(spec));

		const gen = new OpenAPIMcpGenerator({ debug: false, skipFormatting: true });
		await gen.generateFromOpenAPI(specPath, outPath, "template-test");

		const out = readFileSync(outPath, "utf8");
		expect(out).toContain("const server = new McpServer");
		expect(out).toContain("name: 'template-test'");
		// renderRegisterTool produces this call
		expect(out).toContain("server.registerTool(");
		// renderHelpers prints a log we can match
		expect(out).toContain("MCP server running on stdio");
	});
});
