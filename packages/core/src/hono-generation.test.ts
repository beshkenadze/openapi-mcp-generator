import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { OpenAPIMcpGenerator } from "./generator.js";

describe("Hono MCP Server Generation", () => {
	const testDir = resolve(process.cwd(), "test-hono-generation");
	const outputDir = join(testDir, "output");

	beforeEach(() => {
		// Clean up any existing test output
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up test files
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	test("should generate Hono MCP server with multiple transport endpoints", async () => {
		// Create test OpenAPI spec
		const testSpec = resolve(testDir, "test-api.json");
		const testSpecContent = {
			openapi: "3.0.0",
			info: {
				title: "Test API for Hono",
				version: "1.0.0",
				description: "A test API for validating Hono MCP server generation",
			},
			paths: {
				"/users": {
					get: {
						summary: "List users",
						description: "Get a list of all users",
						responses: {
							"200": {
								description: "List of users",
								content: {
									"application/json": {
										schema: {
											type: "array",
											items: {
												type: "object",
												properties: {
													id: { type: "integer" },
													name: { type: "string" },
													email: { type: "string" },
												},
											},
										},
									},
								},
							},
						},
					},
					post: {
						summary: "Create user",
						description: "Create a new user",
						requestBody: {
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: {
											name: { type: "string" },
											email: { type: "string" },
										},
										required: ["name", "email"],
									},
								},
							},
						},
						responses: {
							"201": {
								description: "User created successfully",
							},
						},
					},
				},
				"/users/{id}": {
					get: {
						summary: "Get user by ID",
						description: "Retrieve a specific user by their ID",
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								schema: { type: "integer" },
							},
						],
						responses: {
							"200": {
								description: "User details",
							},
						},
					},
				},
			},
		};

		await Bun.write(testSpec, JSON.stringify(testSpecContent, null, 2));

		// Generate Hono MCP server (disable formatting to avoid nested biome config issues)
		const generator = new OpenAPIMcpGenerator({
			debug: false,
			skipFormatting: true,
		});
		const outputPath = resolve(outputDir, "src", "server.ts");

		await generator.generateFromOpenAPI(
			testSpec,
			outputPath,
			"test-hono-mcp",
			"hono",
		);

		// Verify files were created
		expect(existsSync(join(outputDir, "src", "server.ts"))).toBe(true);
		expect(existsSync(join(outputDir, "package.json"))).toBe(true);
		expect(existsSync(join(outputDir, "README.md"))).toBe(true);
		expect(existsSync(join(outputDir, "Dockerfile"))).toBe(true);
		expect(existsSync(join(outputDir, "biome.json"))).toBe(true);

		// Verify server.ts content
		const serverContent = readFileSync(
			join(outputDir, "src", "server.ts"),
			"utf8",
		);

		// Check for key imports
		expect(serverContent).toContain(
			'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"',
		);
		expect(serverContent).toContain(
			'import { StreamableHTTPTransport } from "@hono/mcp"',
		);
		expect(serverContent).toContain('import { Hono } from "hono"');
		expect(serverContent).toContain('import { stream } from "hono/streaming"');

		// Check for server name
		expect(serverContent).toContain('name: "test-hono-mcp"');

		// Check for multiple transport endpoints
		expect(serverContent).toContain('app.post("/mcp", async (c)'); // HTTP transport
		expect(serverContent).toContain('app.get("/mcp/sse", async (c)'); // SSE transport
		expect(serverContent).toContain('app.get("/mcp/stdio", async (c)'); // Stdio transport

		// Check for health endpoints
		expect(serverContent).toContain('app.get("/", (c)');
		expect(serverContent).toContain('app.get("/health", (c)');

		// Check for tool registrations
		expect(serverContent).toContain("mcpServer.registerTool(");
		expect(serverContent).toContain('"getUsers"'); // GET /users
		expect(serverContent).toContain('"postUsers"'); // POST /users
		expect(serverContent).toContain('"getUsersId"'); // GET /users/{id}

		// Check for helper functions
		expect(serverContent).toContain("function buildUrl(");
		expect(serverContent).toContain("function buildHeaders(");
		expect(serverContent).toContain("function buildRequestBody(");

		// Verify package.json content
		const packageContent = readFileSync(
			join(outputDir, "package.json"),
			"utf8",
		);
		const packageJson = JSON.parse(packageContent);

		expect(packageJson.name).toBe("test-hono-mcp");
		expect(packageJson.dependencies).toHaveProperty("@hono/mcp");
		expect(packageJson.dependencies).toHaveProperty("hono");
		expect(packageJson.dependencies).toHaveProperty(
			"@modelcontextprotocol/sdk",
		);
		expect(packageJson.scripts).toHaveProperty("dev");
		expect(packageJson.scripts).toHaveProperty("build");
		expect(packageJson.scripts).toHaveProperty("start");

		// Verify README content
		const readmeContent = readFileSync(join(outputDir, "README.md"), "utf8");
		expect(readmeContent).toContain("# test-hono-mcp");
		expect(readmeContent).toContain("Built with [Hono](https://hono.dev/)");
		expect(readmeContent).toContain(
			"**HTTP transport**: `http://localhost:3000/mcp`",
		);
		expect(readmeContent).toContain(
			"**SSE transport**: `http://localhost:3000/mcp/sse`",
		);
		expect(readmeContent).toContain(
			"**Stdio transport**: `ws://localhost:3000/mcp/stdio`",
		);

		// Verify Dockerfile exists
		const dockerfileContent = readFileSync(
			join(outputDir, "Dockerfile"),
			"utf8",
		);
		expect(dockerfileContent).toContain("FROM oven/bun:1.1");
		expect(dockerfileContent).toContain("EXPOSE 3000");

		console.log(
			"✅ Hono MCP server generated successfully with all required files",
		);
	}, 30000);

	test("should generate valid tools for different HTTP methods", async () => {
		// Create a separate test directory to avoid conflicts
		const methodsTestDir = join(testDir, "methods-test");
		const methodsOutputDir = join(methodsTestDir, "output");

		mkdirSync(methodsTestDir, { recursive: true });

		// Create a more comprehensive test spec
		const testSpec = resolve(methodsTestDir, "test-methods.json");
		const testSpecContent = {
			openapi: "3.0.0",
			info: {
				title: "HTTP Methods Test",
				version: "1.0.0",
			},
			paths: {
				"/items/{id}": {
					get: {
						operationId: "getItem",
						summary: "Get item",
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								schema: { type: "string" },
							},
						],
						responses: { "200": { description: "OK" } },
					},
					put: {
						operationId: "updateItem",
						summary: "Update item",
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								schema: { type: "string" },
							},
						],
						requestBody: {
							content: {
								"application/json": {
									schema: {
										type: "object",
										properties: { name: { type: "string" } },
									},
								},
							},
						},
						responses: { "200": { description: "Updated" } },
					},
					delete: {
						operationId: "deleteItem",
						summary: "Delete item",
						parameters: [
							{
								name: "id",
								in: "path",
								required: true,
								schema: { type: "string" },
							},
						],
						responses: { "204": { description: "Deleted" } },
					},
				},
			},
		};

		await Bun.write(testSpec, JSON.stringify(testSpecContent, null, 2));

		const generator = new OpenAPIMcpGenerator({
			debug: false,
			skipFormatting: true,
		});
		const outputPath = resolve(methodsOutputDir, "src", "server.ts");

		await generator.generateFromOpenAPI(
			testSpec,
			outputPath,
			"methods-test-mcp",
			"hono",
		);

		const serverContent = readFileSync(
			join(methodsOutputDir, "src", "server.ts"),
			"utf8",
		);

		// Verify all three operations were generated
		expect(serverContent).toContain('"getItem"');
		expect(serverContent).toContain('"updateItem"');
		expect(serverContent).toContain('"deleteItem"');

		// Check that PUT request includes request body handling
		expect(serverContent).toContain("body: buildRequestBody(params),");

		// Check that GET request doesn't include request body
		const getItemIndex = serverContent.indexOf('"getItem"');
		if (getItemIndex !== -1) {
			const nextToolIndex = serverContent.indexOf(
				"mcpServer.registerTool(",
				getItemIndex + 1,
			);
			const getSection =
				nextToolIndex !== -1
					? serverContent.slice(getItemIndex, nextToolIndex)
					: serverContent.slice(getItemIndex, getItemIndex + 1000);
			expect(getSection).not.toContain("body: buildRequestBody(params)");
		}

		console.log("✅ All HTTP methods handled correctly");
	});
});
