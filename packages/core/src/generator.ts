import { IndentationText, Project, QuoteKind, type SourceFile } from "ts-morph";
import { validate, dereference } from "@scalar/openapi-parser";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execSync } from "node:child_process";
import {
	renderHelpers,
	renderRegisterTool,
	renderServerHeader,
	renderServerInit,
} from "./templates/index.js";
import {
	HONO_MCP_SERVER_TEMPLATE,
	HONO_PACKAGE_JSON_TEMPLATE,
	HONO_TOOL_TEMPLATE,
	HONO_HELPERS_TEMPLATE,
	HONO_DOCKERFILE_TEMPLATE,
	HONO_README_TEMPLATE,
	HONO_BIOME_CONFIG,
} from "./templates/hono-server.js";
import type {
	OpenAPISchema,
	OpenAPIOperation,
	OpenAPIPath,
	OpenAPIDocument,
	GeneratorOptions,
} from "./types.js";

type JsonSchema = {
	// Basic JSON Schema fields we emit
	type: string;
	enum?: string[];
	format?: string;
	minimum?: number;
	maximum?: number;
	items?: JsonSchema;
	properties?: Record<string, JsonSchema>;
	required?: string[];
	description?: string;
	additionalProperties?: boolean;
};

class OpenAPIMcpGenerator {
	private project: Project;
	private sourceFile!: SourceFile;
	private options: Required<GeneratorOptions>;

	constructor(options: GeneratorOptions = {}) {
		// Set default options
		this.options = {
			debug: false,
			skipFormatting: false,
			indentSize: 4,
			quoteStyle: "single",
			trailingCommas: true,
			runtime: "bun",
			...options,
		};

		// Configure ts-morph project based on options
		const indentationText =
			this.options.indentSize === 2
				? IndentationText.TwoSpaces
				: this.options.indentSize === 8
					? IndentationText.EightSpaces
					: IndentationText.FourSpaces;

		const quoteKind =
			this.options.quoteStyle === "double"
				? QuoteKind.Double
				: QuoteKind.Single;

		this.project = new Project({
			manipulationSettings: {
				indentationText,
				quoteKind,
				useTrailingCommas: this.options.trailingCommas,
			},
		});
	}

	async generateFromOpenAPI(
		openApiFilePath: string,
		outputPath: string,
		serverName: string,
		runtime: "bun" | "node" | "hono" = "bun",
	): Promise<void> {
		if (this.options.debug) {
			console.log(`🔧 Generating MCP server from ${openApiFilePath}...`);
		}

		// Parse OpenAPI document
		const openApiContent = readFileSync(openApiFilePath, "utf-8");

		// Try strict validation first, but don't fail on metadata issues
		try {
			const { valid, errors } = await validate(openApiContent);
			if (!valid) {
				console.warn("⚠️ OpenAPI validation warnings:", errors);
				console.log(
					"📝 Continuing with generation (metadata validation issues are non-critical)",
				);
			}
		} catch (validationError) {
			console.warn(
				"⚠️ OpenAPI validation failed, but continuing:",
				validationError instanceof Error
					? validationError.message
					: String(validationError),
			);
		}

			const { schema } = await dereference(openApiContent);
			if (!schema) {
				throw new Error("Failed to dereference OpenAPI schema");
			}

			const schemaDoc = schema as unknown as OpenAPIDocument;

		if (this.options.debug) {
			console.log("✅ OpenAPI document parsed and validated");
		}

		// Generate server based on runtime
			if (runtime === "hono") {
				await this.generateHonoServer(
					openApiFilePath,
					outputPath,
					serverName,
					schemaDoc,
				);
			} else {
			// Create source file for traditional MCP servers (bun/node)
			this.sourceFile = this.project.createSourceFile(outputPath, "", {
				overwrite: true,
			});

			// Generate the MCP server
			this.generateImports();
				this.generateServerSetup(
					serverName,
					schemaDoc.info?.title,
					schemaDoc.info?.version,
				);
				const paths = (schemaDoc.paths ?? {}) as unknown as Record<string, OpenAPIPath>;
				const schemas = (schemaDoc.components?.schemas ?? {}) as unknown as Record<string, OpenAPISchema>;
				this.generateTools(paths, schemas);
			this.generateTransportSetup();

			// Save the file
			await this.sourceFile.save();
		}

		// Format with Biome (if not skipped)
		if (!this.options.skipFormatting) {
			try {
				if (this.options.debug) {
					console.log("🎨 Formatting with Biome...");
				}
				execSync(`bunx @biomejs/biome format --write "${outputPath}"`, {
					stdio: this.options.debug ? "inherit" : "pipe",
				});
				if (this.options.debug) {
					console.log("✅ Code formatted with Biome");
				}
			} catch (error) {
				if (this.options.debug) {
					console.warn(
						"⚠️ Biome formatting failed, but file was generated:",
						error instanceof Error ? error.message : "Unknown error",
					);
				}
			}
		}

		if (this.options.debug) {
			console.log(`✅ MCP server generated at ${outputPath}`);
		}
	}

	private generateImports(): void {
		this.sourceFile.addImportDeclarations([
			{
				namedImports: ["McpServer"],
				moduleSpecifier: "@modelcontextprotocol/sdk/server/mcp.js",
			},
			{
				namedImports: ["StdioServerTransport"],
				moduleSpecifier: "@modelcontextprotocol/sdk/server/stdio.js",
			},
			{
				namedImports: ["z"],
				moduleSpecifier: "zod",
			},
		]);
	}

	private generateServerSetup(
		serverName: string,
		title?: string,
		version?: string,
	): void {
		if (title) {
			this.sourceFile.addStatements(renderServerHeader(title));
		}

		this.sourceFile.addStatements(renderServerInit(serverName, version));
	}

	private generateTools(
		paths: Record<string, OpenAPIPath>,
		schemas: Record<string, OpenAPISchema>,
	): void {
		if (this.options.debug) {
			console.log(
				`📋 Generating ${Object.keys(paths).length} API endpoints as MCP tools...`,
			);
		}

		for (const [pathPattern, pathItem] of Object.entries(paths)) {
			for (const [method, operation] of Object.entries(pathItem)) {
				if (
					["get", "post", "put", "delete", "patch"].includes(
						method.toLowerCase(),
					)
				) {
					this.generateTool(
						pathPattern,
						method,
						operation as OpenAPIOperation,
						schemas,
					);
				}
			}
		}
	}

	private generateTool(
		pathPattern: string,
		method: string,
		operation: OpenAPIOperation,
		_schemas: Record<string, OpenAPISchema>,
	): void {
		const toolName = this.generateToolName(
			pathPattern,
			method,
			operation.operationId,
		);
		const inputSchema = this.generateInputSchema(operation, pathPattern);
		const description =
			operation.summary ||
			operation.description ||
			`${method.toUpperCase()} ${pathPattern}`;

		if (this.options.debug) {
			console.log(`  🔧 Generating tool: ${toolName}`);
		}

		// Generate the tool registration via templates
		const block = renderRegisterTool({
			toolName,
			title: this.escapeString(description),
			description: this.escapeString(operation.description || description),
			inputSchema,
			method: method.toUpperCase(),
			pathPattern,
		});
		this.sourceFile.addStatements(block);
	}

	private generateToolName(
		pathPattern: string,
		method: string,
		operationId?: string,
	): string {
		if (operationId) {
			return this.toCamelCase(operationId);
		}

		// Generate from path and method
		const pathParts = pathPattern
			.split("/")
			.filter((part) => part && part.length > 0)
			.map((part) => {
				// Handle path parameters: {id} -> Id, {userId} -> UserId
				if (part.startsWith("{") && part.endsWith("}")) {
					const paramName = part.slice(1, -1);
					return paramName.charAt(0).toUpperCase() + paramName.slice(1);
				}
				return part.replace(/[^a-zA-Z0-9]/g, "");
			})
			.filter((part) => part.length > 0);

		const parts = [
			method.toLowerCase(),
			...(pathParts.length > 0 ? pathParts : ["root"]),
		];
		return this.toCamelCase(parts.join("_"));
	}

	private toCamelCase(str: string): string {
		return str
			.replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
			.replace(/^./, (match) => match.toLowerCase())
			.replace(/[^a-zA-Z0-9]/g, "");
	}

	private toValidIdentifier(name: string): string {
		// Convert to camelCase and ensure it's a valid JavaScript identifier
		let identifier = this.toCamelCase(name);

		// Ensure it starts with a letter or underscore
		if (!/^[a-zA-Z_]/.test(identifier)) {
			identifier = `_${identifier}`;
		}

		// Remove any remaining invalid characters
		identifier = identifier.replace(/[^a-zA-Z0-9_]/g, "");

		// Handle edge cases
		if (identifier === "" || /^\d/.test(identifier)) {
			identifier = `param_${identifier}`;
		}

		return identifier;
	}

	private generateInputSchema(
		operation: OpenAPIOperation,
		pathPattern: string,
	): string {
		const properties: Record<string, JsonSchema> = {};
		const required: string[] = [];

		// Add path parameters
		const pathParams = pathPattern.match(/\{([^}]+)\}/g);
		if (pathParams) {
			for (const param of pathParams) {
				const paramName = param.slice(1, -1);
				const propName = this.toValidIdentifier(paramName);
				properties[propName] = {
					type: "string",
					description: `Path parameter: ${paramName}`,
				};
				required.push(propName);
			}
		}

		// Add query parameters and headers
		if (operation.parameters) {
			for (const param of operation.parameters) {
				if (param.in === "query" || param.in === "header") {
					const propName = this.toValidIdentifier(param.name);
					const description =
						param.description ||
						param.schema?.description ||
						`${param.in} parameter: ${param.name}`;

					properties[propName] = {
						...this.openApiSchemaToJsonSchema(param.schema),
						description: this.escapeString(description),
					};

					if (param.required) {
						required.push(propName);
					}
				}
			}
		}

		// Add request body for non-GET methods
		const jsonContent = operation.requestBody?.content?.["application/json"];
		if (jsonContent?.schema) {
			properties.body = {
				...this.openApiSchemaToJsonSchema(jsonContent.schema),
				description: "Request body",
			};
			if (operation.requestBody?.required) {
				required.push("body");
			}
		}

		const schema: JsonSchema = {
			type: "object",
			properties,
			additionalProperties: false,
		};

		if (required.length > 0) {
			schema.required = required;
		}

		return JSON.stringify(schema);
	}

	private openApiSchemaToJsonSchema(schema?: OpenAPISchema): JsonSchema {
		if (!schema) return { type: "string" };

		switch (schema.type) {
			case "string": {
				const jsonSchema: JsonSchema = { type: "string" };
				if (schema.enum) {
					jsonSchema.enum = schema.enum;
				}
				if (schema.format) {
					jsonSchema.format = schema.format;
				}
				return jsonSchema;
			}

			case "number":
			case "integer": {
				const jsonSchema: JsonSchema = { type: schema.type } as JsonSchema;
				if (schema.minimum !== undefined) jsonSchema.minimum = schema.minimum;
				if (schema.maximum !== undefined) jsonSchema.maximum = schema.maximum;
				return jsonSchema;
			}

			case "boolean":
				return { type: "boolean" };

			case "array": {
				return {
					type: "array",
					items: this.openApiSchemaToJsonSchema(schema.items),
				};
			}

			case "object": {
				const jsonSchema: JsonSchema = { type: "object" };
				if (schema.properties) {
					jsonSchema.properties = {};
					for (const [key, prop] of Object.entries(schema.properties)) {
						jsonSchema.properties[key] = this.openApiSchemaToJsonSchema(
							prop as OpenAPISchema,
						);
					}
					if (schema.required) {
						jsonSchema.required = schema.required;
					}
				}
				return jsonSchema;
			}

			default:
				return { type: "string" };
		}
	}

	private openApiTypeToZod(schema?: OpenAPISchema): string {
		if (!schema) return "z.unknown()";

		switch (schema.type) {
			case "string":
				if (schema.enum) {
					const enumValues = schema.enum
						.map((v: string) => `'${v}'`)
						.join(", ");
					return `z.enum([${enumValues}])`;
				}
				if (schema.format === "date-time") return "z.string().datetime()";
				if (schema.format === "date")
					return "z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/)";
				if (schema.format === "email") return "z.string().email()";
				if (schema.format === "uri") return "z.string().url()";
				return "z.string()";

			case "number":
			case "integer": {
				let numberSchema =
					schema.type === "integer" ? "z.number().int()" : "z.number()";
				if (schema.minimum !== undefined)
					numberSchema += `.min(${schema.minimum})`;
				if (schema.maximum !== undefined)
					numberSchema += `.max(${schema.maximum})`;
				return numberSchema;
			}

			case "boolean":
				return "z.boolean()";

			case "array": {
				const itemType = this.openApiTypeToZod(schema.items);
				return `z.array(${itemType})`;
			}

			case "object":
				if (schema.properties) {
					const props = Object.entries(schema.properties)
						.map(([key, prop]: [string, OpenAPISchema]) => {
							const isRequired = schema.required?.includes(key);
							const zodType = this.openApiTypeToZod(prop);
							const propName = this.toValidIdentifier(key);
							return `${propName}: ${
								isRequired ? zodType : `${zodType}.optional()`
							}`;
						})
						.join(", ");
					return `z.object({ ${props} })`;
				}
				return "z.record(z.unknown())";

			default:
				return "z.unknown()";
		}
	}

	private generateTransportSetup(): void {
		this.sourceFile.addStatements(renderHelpers());
	}

	private async generateHonoServer(
		_openApiFilePath: string,
		outputPath: string,
		serverName: string,
		schema: OpenAPIDocument,
	): Promise<void> {
		// For Hono, outputPath could be either a directory or a file path
		// If it ends with .ts, it's a file path - extract the base directory properly
		// The expected pattern is: /path/to/project/src/server.ts -> /path/to/project
		let baseDir: string;
		if (outputPath.endsWith(".ts")) {
			// Extract project base directory from file path
			// If path ends with src/server.ts, go up two levels
			const dir = dirname(outputPath);
			baseDir = dir.endsWith("src") ? dirname(dir) : dir;
		} else {
			baseDir = outputPath;
		}
		const srcDir = join(baseDir, "src");

		if (this.options.debug) {
			console.log(`📁 Creating Hono server directory: ${baseDir}`);
		}

		mkdirSync(baseDir, { recursive: true });
		mkdirSync(srcDir, { recursive: true });

		// Generate tools from OpenAPI paths
		const tools: string[] = [];
		const toolsList: string[] = [];

		for (const [pathPattern, pathItem] of Object.entries(schema.paths || {})) {
			for (const [method, operation] of Object.entries(pathItem)) {
				if (
					["get", "post", "put", "patch", "delete", "head", "options"].includes(
						method,
					)
				) {
					const tool = this.generateHonoTool(
						pathPattern,
						method,
						operation as OpenAPIOperation,
					);
					tools.push(tool);

					const toolName = this.generateToolName(
						pathPattern,
						method,
						operation.operationId,
					);
					const description =
						operation.summary ||
						operation.description ||
						`${method.toUpperCase()} ${pathPattern}`;
					toolsList.push(`- **${toolName}**: ${description}`);
				}
			}
		}

		// Generate server file
		const serverContent = HONO_MCP_SERVER_TEMPLATE.replace(
			/\{\{COMMENT\}\}/g,
			schema.info?.title || "",
		)
			.replace(/\{\{SERVER_NAME\}\}/g, serverName)
			.replace(/\{\{TOOLS\}\}/g, tools.join("\n\n"))
			.replace(/\{\{HELPERS\}\}/g, HONO_HELPERS_TEMPLATE);

		// Generate package.json
		const packageContent = HONO_PACKAGE_JSON_TEMPLATE.replace(
			/\{\{SERVER_NAME\}\}/g,
			serverName,
		).replace(
			/\{\{DESCRIPTION\}\}/g,
			schema.info?.description ||
				`MCP server for ${schema.info?.title || serverName}`,
		);

		// Generate README.md
		const readmeContent = HONO_README_TEMPLATE.replace(
			/\{\{SERVER_NAME\}\}/g,
			serverName,
		)
			.replace(
				/\{\{DESCRIPTION\}\}/g,
				schema.info?.description ||
					`MCP server for ${schema.info?.title || serverName}`,
			)
			.replace(/\{\{TOOLS_LIST\}\}/g, toolsList.join("\n"));

		// Write files
		writeFileSync(join(srcDir, "server.ts"), serverContent);
		writeFileSync(join(baseDir, "package.json"), packageContent);
		writeFileSync(join(baseDir, "README.md"), readmeContent);
		writeFileSync(join(baseDir, "Dockerfile"), HONO_DOCKERFILE_TEMPLATE);
		writeFileSync(join(baseDir, "biome.json"), HONO_BIOME_CONFIG);

		if (this.options.debug) {
			console.log(`✅ Hono server files generated in ${baseDir}`);
		}
	}

	private generateHonoTool(
		pathPattern: string,
		method: string,
		operation: OpenAPIOperation,
	): string {
		const toolName = this.generateToolName(
			pathPattern,
			method,
			operation.operationId,
		);
		const inputSchema = this.generateInputSchema(operation, pathPattern);
		const description =
			operation.summary ||
			operation.description ||
			`${method.toUpperCase()} ${pathPattern}`;

		let requestBody = "";
		if (["post", "put", "patch"].includes(method.toLowerCase())) {
			requestBody = "\n\t\t\tbody: buildRequestBody(params),";
		}

		return HONO_TOOL_TEMPLATE.replace(/\{\{TOOL_NAME\}\}/g, toolName)
			.replace(/\{\{TITLE\}\}/g, this.escapeString(description))
			.replace(
				/\{\{DESCRIPTION\}\}/g,
				this.escapeString(operation.description || description),
			)
			.replace(/\{\{INPUT_SCHEMA\}\}/g, inputSchema)
			.replace(/\{\{PATH\}\}/g, pathPattern)
			.replace(/\{\{METHOD\}\}/g, method.toUpperCase())
			.replace(/\{\{REQUEST_BODY\}\}/g, requestBody);
	}

	private escapeString(str: string): string {
		return str.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
	}
}

export { OpenAPIMcpGenerator };
