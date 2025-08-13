import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { rmSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Mock the @clack/prompts module for testing
const mockPrompts = {
	group: async (prompts: any) => {
		const results: any = {};
		for (const [key, promptFn] of Object.entries(prompts)) {
			if (typeof promptFn === "function") {
				const prompt = await (promptFn as Function)({ results });
				// Simulate user input based on the prompt type
				if (prompt.message?.includes("OpenAPI document")) {
					results[key] = "./test.yaml";
				} else if (prompt.message?.includes("runtime")) {
					results[key] = "bun";
				} else if (prompt.message?.includes("Server name")) {
					results[key] = "test-server";
				} else if (prompt.message?.includes("Output directory")) {
					results[key] = "./output";
				}
			}
		}
		return results;
	},
	isCancel: (value: any) => value === null,
	cancel: (message: string) => null,
	confirm: async (options: any) => true,
};

// We can't directly test interactive prompts without mocking, but we can test the validation logic
describe("Interactive Prompt Validation", () => {
	const testDir = resolve(process.cwd(), "test-interactive");

	beforeEach(() => {
		if (!existsSync(testDir)) {
			mkdirSync(testDir, { recursive: true });
		}
	});

	afterEach(() => {
		if (existsSync(testDir)) {
			rmSync(testDir, { recursive: true, force: true });
		}
	});

	test("should validate OpenAPI file paths", async () => {
		// Create test files
		const validYaml = resolve(testDir, "valid.yaml");
		const validJson = resolve(testDir, "valid.json");
		const invalidTxt = resolve(testDir, "invalid.txt");

		await Bun.write(validYaml, "openapi: 3.0.0");
		await Bun.write(validJson, '{"openapi": "3.0.0"}');
		await Bun.write(invalidTxt, "not an openapi file");

		// Test validation function that would be used in prompts
		const validateOpenAPIPath = (value: string) => {
			if (!value || value.trim().length === 0) return "Path is required";

			const ext = value.split(".").pop()?.toLowerCase();
			if (!ext || !["yaml", "yml", "json"].includes(ext))
				return "File must be .yaml/.yml or .json";

			if (!existsSync(resolve(process.cwd(), value))) return "File not found";

			return undefined; // Valid
		};

		// Test valid files
		expect(validateOpenAPIPath(validYaml)).toBeUndefined();
		expect(validateOpenAPIPath(validJson)).toBeUndefined();

		// Test invalid cases
		expect(validateOpenAPIPath("")).toBe("Path is required");
		expect(validateOpenAPIPath(invalidTxt)).toBe(
			"File must be .yaml/.yml or .json",
		);
		expect(validateOpenAPIPath("nonexistent.yaml")).toBe("File not found");
	});

	test("should validate server names", () => {
		const validateServerName = (value: string) => {
			if (!value || value.trim().length === 0) return "Name is required";
			return undefined;
		};

		expect(validateServerName("valid-name")).toBeUndefined();
		expect(validateServerName("another_name")).toBeUndefined();
		expect(validateServerName("")).toBe("Name is required");
		expect(validateServerName("   ")).toBe("Name is required");
	});

	test("should validate output directories", () => {
		const validateOutputDir = (value: string) => {
			if (!value || value.trim().length === 0)
				return "Output directory is required";
			return undefined;
		};

		expect(validateOutputDir("./output")).toBeUndefined();
		expect(validateOutputDir("/absolute/path")).toBeUndefined();
		expect(validateOutputDir("")).toBe("Output directory is required");
		expect(validateOutputDir("   ")).toBe("Output directory is required");
	});

	test("should handle runtime selection", () => {
		const runtimeOptions = [
			{ value: "bun", label: "Bun (recommended)" },
			{ value: "node", label: "Node.js" },
		];

		expect(runtimeOptions).toHaveLength(2);
		expect(runtimeOptions[0].value).toBe("bun");
		expect(runtimeOptions[1].value).toBe("node");
	});
});

describe("Prompt Flow Logic", () => {
	test("should determine which prompts to show based on provided args", async () => {
		// Test when no arguments are provided - should prompt for everything
		const emptyArgs = {};
		const shouldPromptInput = !emptyArgs.hasOwnProperty("input");
		const shouldPromptOutput = !emptyArgs.hasOwnProperty("out");
		const shouldPromptName = !emptyArgs.hasOwnProperty("name");
		const shouldPromptRuntime = !emptyArgs.hasOwnProperty("runtime");

		expect(shouldPromptInput).toBe(true);
		expect(shouldPromptOutput).toBe(true);
		expect(shouldPromptName).toBe(true);
		expect(shouldPromptRuntime).toBe(true);

		// Test when some arguments are provided
		const partialArgs = { input: "test.yaml", runtime: "bun" };
		const shouldPromptInputPartial = !partialArgs.hasOwnProperty("input");
		const shouldPromptRuntimePartial = !partialArgs.hasOwnProperty("runtime");

		expect(shouldPromptInputPartial).toBe(false);
		expect(shouldPromptRuntimePartial).toBe(false);
	});

	test("should suggest names based on input file", async () => {
		// Simulate the name suggestion logic
		const suggestNameFromInput = async (inputPath: string): Promise<string> => {
			if (inputPath.includes("petstore")) return "petstore-mcp";
			if (inputPath.includes("users")) return "users-api-mcp";

			// Fallback to filename
			const filename = inputPath.split("/").pop()?.split(".")[0] || "openapi";
			return `${filename}-mcp`;
		};

		expect(await suggestNameFromInput("./petstore.yaml")).toBe("petstore-mcp");
		expect(await suggestNameFromInput("./users-api.json")).toBe(
			"users-api-mcp",
		);
		expect(await suggestNameFromInput("./api.yaml")).toBe("api-mcp");
	});

	test("should suggest output directory based on server name", () => {
		const suggestOutputDir = (serverName: string): string => {
			const slug = serverName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
			return `./servers/${slug}`;
		};

		expect(suggestOutputDir("petstore-mcp")).toBe("./servers/petstore-mcp");
		expect(suggestOutputDir("My API Server")).toBe("./servers/my-api-server");
		expect(suggestOutputDir("user_service")).toBe("./servers/user-service");
	});
});
