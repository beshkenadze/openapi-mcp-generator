import {
  IndentationText,
  Project,
  QuoteKind,
  StructureKind,
  Writers,
} from "ts-morph";
import { validate, dereference } from "@scalar/openapi-parser";
import { readFileSync, writeFileSync } from "fs";
import { z } from "zod";
import { execSync } from "child_process";
import type {
  OpenAPISchema,
  OpenAPIParameter,
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPIOperation,
  OpenAPIPath,
  OpenAPIInfo,
  OpenAPIComponents,
  OpenAPIDocument,
  GeneratorOptions,
} from "./types.js";

class OpenAPIMcpGenerator {
  private project: Project;
  private sourceFile: any;
  private options: Required<GeneratorOptions>;

  constructor(options: GeneratorOptions = {}) {
    // Set default options
    this.options = {
      debug: false,
      skipFormatting: false,
      indentSize: 4,
      quoteStyle: 'single',
      trailingCommas: true,
      ...options,
    };

    // Configure ts-morph project based on options
    const indentationText = this.options.indentSize === 2 ? IndentationText.TwoSpaces :
                           this.options.indentSize === 8 ? IndentationText.EightSpaces :
                           IndentationText.FourSpaces;
    
    const quoteKind = this.options.quoteStyle === 'double' ? QuoteKind.Double : QuoteKind.Single;

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
    serverName: string
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
        console.log("📝 Continuing with generation (metadata validation issues are non-critical)");
      }
    } catch (validationError) {
      console.warn("⚠️ OpenAPI validation failed, but continuing:", validationError instanceof Error ? validationError.message : String(validationError));
    }

    const { schema } = await dereference(openApiContent);
    if (!schema) {
      throw new Error("Failed to dereference OpenAPI schema");
    }

    if (this.options.debug) {
      console.log("✅ OpenAPI document parsed and validated");
    }

    // Create source file
    this.sourceFile = this.project.createSourceFile(outputPath, "", {
      overwrite: true,
    });

    // Generate the MCP server
    this.generateImports();
    this.generateServerSetup(
      serverName,
      schema.info?.title,
      schema.info?.version
    );
    this.generateTools(schema.paths || {}, schema.components?.schemas || {});
    this.generateTransportSetup();

    // Save the file
    await this.sourceFile.save();

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
            error instanceof Error ? error.message : "Unknown error"
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
    version?: string
  ): void {
    if (title) {
      this.sourceFile.addStatements(`
// ${title}
// Generated from OpenAPI specification`);
    }

    this.sourceFile.addStatements(`const server = new McpServer({
  name: '${serverName}',
  version: '${version || "1.0.0"}'
});`);
  }

  private generateTools(
    paths: Record<string, OpenAPIPath>,
    schemas: Record<string, OpenAPISchema>
  ): void {
    if (this.options.debug) {
      console.log(
        `📋 Generating ${Object.keys(paths).length} API endpoints as MCP tools...`
      );
    }

    for (const [pathPattern, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem)) {
        if (
          ["get", "post", "put", "delete", "patch"].includes(
            method.toLowerCase()
          )
        ) {
          this.generateTool(
            pathPattern,
            method,
            operation as OpenAPIOperation,
            schemas
          );
        }
      }
    }
  }

  private generateTool(
    pathPattern: string,
    method: string,
    operation: OpenAPIOperation,
    schemas: Record<string, OpenAPISchema>
  ): void {
    const toolName = this.generateToolName(
      pathPattern,
      method,
      operation.operationId
    );
    const inputSchema = this.generateInputSchema(operation, pathPattern);
    const description =
      operation.summary ||
      operation.description ||
      `${method.toUpperCase()} ${pathPattern}`;

    if (this.options.debug) {
      console.log(`  🔧 Generating tool: ${toolName}`);
    }

    // Generate the tool registration
    this.sourceFile.addStatements(`
server.registerTool(
  '${toolName}',
  {
    title: '${this.escapeString(description)}',
    description: '${this.escapeString(operation.description || description)}',
    inputSchema: ${inputSchema}
  },
  async (params) => {
    try {
      // Build URL with path and query parameters
      const url = buildUrl('${pathPattern}', params);

      // Make HTTP request
      const response = await fetch(url, {
        method: '${method.toUpperCase()}',
        headers: {
          'Content-Type': 'application/json',
          ...buildHeaders(params)
        },
        ${
          method.toLowerCase() !== "get"
            ? "body: buildRequestBody(params),"
            : ""
        }
      });

      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
      }

      const data = await response.text();

      return {
        content: [{
          type: 'text',
          text: data
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: \`Error: \${error instanceof Error ? error.message : String(error)}\`
        }],
        isError: true
      };
    }
  }
);`);
  }

  private generateToolName(
    pathPattern: string,
    method: string,
    operationId?: string
  ): string {
    if (operationId) {
      return this.toCamelCase(operationId);
    }

    // Generate from path and method
    const pathParts = pathPattern
      .split("/")
      .filter((part) => part && !part.startsWith("{"))
      .map((part) => part.replace(/[^a-zA-Z0-9]/g, ""))
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
    pathPattern: string
  ): string {
    const schemaProps: string[] = [];

    // Add path parameters
    const pathParams = pathPattern.match(/\{([^}]+)\}/g);
    if (pathParams) {
      for (const param of pathParams) {
        const paramName = param.slice(1, -1);
        const propName = this.toValidIdentifier(paramName);
        schemaProps.push(
          `${propName}: z.string().describe('Path parameter: ${paramName}')`
        );
      }
    }

    // Add query parameters and headers
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === "query" || param.in === "header") {
          const zodType = this.openApiTypeToZod(param.schema);
          const description =
            param.description ||
            param.schema?.description ||
            `${param.in} parameter: ${param.name}`;
          const zodSchema = param.required
            ? `${zodType}.describe('${this.escapeString(description)}')`
            : `${zodType}.optional().describe('${this.escapeString(
                description
              )}')`;

          // Use valid JavaScript identifier
          const propName = this.toValidIdentifier(param.name);
          schemaProps.push(`${propName}: ${zodSchema}`);
        }
      }
    }

    // Add request body for non-GET methods
    if (operation.requestBody && operation.requestBody.content) {
      const jsonContent = operation.requestBody.content["application/json"];
      if (jsonContent?.schema) {
        const bodyType = this.openApiTypeToZod(jsonContent.schema);
        schemaProps.push(`body: ${bodyType}.describe('Request body')`);
      }
    }

    if (schemaProps.length === 0) {
      return "{ type: 'object' }";
    }

    return `{\n    type: 'object',\n    properties: {\n      ${schemaProps.join(",\n      ")}\n    }\n  }`;
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
      case "integer":
        let numberSchema =
          schema.type === "integer" ? "z.number().int()" : "z.number()";
        if (schema.minimum !== undefined)
          numberSchema += `.min(${schema.minimum})`;
        if (schema.maximum !== undefined)
          numberSchema += `.max(${schema.maximum})`;
        return numberSchema;

      case "boolean":
        return "z.boolean()";

      case "array":
        const itemType = this.openApiTypeToZod(schema.items);
        return `z.array(${itemType})`;

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
    this.sourceFile.addStatements(`
// Helper functions
function buildUrl(pathPattern: string, params: Record<string, any>): string {
  const baseUrl = process.env.API_BASE_URL || 'https://api.example.com';

  // Replace path parameters
  let url = pathPattern;
  const pathParams = pathPattern.match(/\\{([^}]+)\\}/g);
  if (pathParams) {
    for (const param of pathParams) {
      const paramName = param.slice(1, -1);
      if (params[paramName] !== undefined) {
        url = url.replace(param, encodeURIComponent(String(params[paramName])));
      }
    }
  }

  // Add query parameters
  const queryParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && !pathParams?.some(p => p.slice(1, -1) === key) && key !== 'body') {
      if (Array.isArray(value)) {
        value.forEach(v => queryParams.append(key, String(v)));
      } else {
        queryParams.append(key, String(value));
      }
    }
  }

  const queryString = queryParams.toString();
  const fullUrl = baseUrl + url + (queryString ? '?' + queryString : '');

  return fullUrl;
}

function buildHeaders(params: Record<string, any>): Record<string, string> {
  const headers: Record<string, string> = {};

  // Add header parameters
  for (const [key, value] of Object.entries(params)) {
    // Simple heuristic: if key contains common header patterns
    if (key.toLowerCase().includes('authorization') ||
        key.toLowerCase().includes('token') ||
        key.toLowerCase().includes('key') ||
        key.toLowerCase().startsWith('x-')) {
      headers[key] = String(value);
    }
  }

  return headers;
}

function buildRequestBody(params: Record<string, any>): string | undefined {
  if (params.body !== undefined) {
    return typeof params.body === 'string' ? params.body : JSON.stringify(params.body);
  }
  return undefined;
}

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('MCP server is running...');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});`);
  }

  private escapeString(str: string): string {
    return str.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
  }
}

export { OpenAPIMcpGenerator };
