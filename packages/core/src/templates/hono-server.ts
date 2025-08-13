/**
 * Hono MCP Server Templates
 * Templates for generating Hono-based MCP servers with HTTP transport
 */

export const HONO_MCP_SERVER_TEMPLATE = `import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPTransport } from "@hono/mcp";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { stream } from "hono/streaming";
import { z } from "zod";

// {{COMMENT}}
// Generated from OpenAPI specification
const mcpServer = new McpServer({
	name: "{{SERVER_NAME}}",
	version: "1.0.0",
});

// Tool registrations
{{TOOLS}}

// Helper functions
{{HELPERS}}

// Create Hono app
const app = new Hono();

// Add CORS and logging middleware
app.use("*", cors());
app.use("*", logger());

// Health check endpoint
app.get("/", (c) => c.text("{{SERVER_NAME}} MCP Server is running"));
app.get("/health", (c) => c.json({ status: "ok", server: "{{SERVER_NAME}}" }));

// MCP HTTP endpoint - handles POST requests for standard HTTP transport
app.post("/mcp", async (c) => {
	const transport = new StreamableHTTPTransport();
	await mcpServer.connect(transport);
	return transport.handleRequest(c);
});

// MCP SSE endpoint - handles Server-Sent Events for streaming transport
app.get("/mcp/sse", async (c) => {
	const transport = new StreamableHTTPTransport();
	await mcpServer.connect(transport);
	
	return stream(c, async (stream) => {
		stream.writeln("data: Connected to MCP server");
		stream.writeln("");
		
		// Handle transport communication via SSE
		const response = await transport.handleRequest(c);
		const reader = response.body?.getReader();
		
		if (reader) {
			try {
				while (true) {
					const { done, value } = await reader.read();
					if (done) break;
					
					const text = new TextDecoder().decode(value);
					stream.writeln(\`data: \${text}\`);
					stream.writeln("");
				}
			} catch (error) {
				stream.writeln(\`data: Error: \${error}\`);
				stream.writeln("");
			} finally {
				reader.releaseLock();
			}
		}
	}, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
		},
	});
});

// MCP stdio endpoint - for stdio-based transport (via WebSocket upgrade)
app.get("/mcp/stdio", async (c) => {
	// Upgrade to WebSocket for stdio transport simulation
	const upgradeHeader = c.req.header("Upgrade");
	if (upgradeHeader !== "websocket") {
		return c.text("WebSocket upgrade required for stdio transport", 426);
	}
	
	// WebSocket handling would go here
	// This is a placeholder for stdio transport via WebSocket
	return c.text("Stdio transport via WebSocket not implemented yet", 501);
});

// Development server (only for local development)
if (import.meta.main || process.env.NODE_ENV === "development") {
	const port = Number(process.env.PORT) || 3000;
	console.log(\`🚀 {{SERVER_NAME}} MCP Server starting on port \${port}\`);
	console.log(\`📡 HTTP transport: http://localhost:\${port}/mcp\`);
	console.log(\`📡 SSE transport: http://localhost:\${port}/mcp/sse\`);
	console.log(\`📡 Stdio transport: ws://localhost:\${port}/mcp/stdio\`);
	console.log(\`🏥 Health check: http://localhost:\${port}/health\`);
	
	export default {
		port,
		fetch: app.fetch,
	};
}

// Export for deployment
export default app;
`;

export const HONO_PACKAGE_JSON_TEMPLATE = `{
	"name": "{{SERVER_NAME}}",
	"version": "1.0.0",
	"type": "module",
	"description": "{{DESCRIPTION}}",
	"main": "src/server.ts",
	"scripts": {
		"dev": "bun run --watch src/server.ts",
		"build": "bun build src/server.ts --outdir=dist --target=bun",
		"start": "bun run dist/server.js",
		"test": "bun test",
		"lint": "bunx @biomejs/biome check src/",
		"format": "bunx @biomejs/biome format --write src/"
	},
	"dependencies": {
		"@modelcontextprotocol/sdk": "^1.0.0",
		"@hono/mcp": "^0.1.0",
		"hono": "^4.6.0",
		"zod": "^3.23.0"
	},
	"devDependencies": {
		"@biomejs/biome": "^1.9.0",
		"@types/bun": "^1.1.0",
		"bun-types": "^1.1.0"
	},
	"keywords": [
		"mcp",
		"model-context-protocol",
		"hono",
		"openapi",
		"api",
		"server"
	]
}
`;

export const HONO_TOOL_TEMPLATE = `mcpServer.registerTool(
	"{{TOOL_NAME}}",
	{
		title: "{{TITLE}}",
		description: "{{DESCRIPTION}}",
		inputSchema: {{INPUT_SCHEMA}},
	},
	async (params) => {
		try {
			// Build URL with path and query parameters
			const url = buildUrl("{{PATH}}", params);

			// Make HTTP request
			const response = await fetch(url, {
				method: "{{METHOD}}",
				headers: {
					"Content-Type": "application/json",
					...buildHeaders(params),
				},{{REQUEST_BODY}}
			});

			if (!response.ok) {
				throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
			}

			const data = await response.text();

			return {
				content: [{ type: "text", text: data }],
			};
		} catch (error) {
			return {
				content: [
					{
						type: "text",
						text: \`Error: \${error instanceof Error ? error.message : String(error)}\`,
					},
				],
				isError: true,
			};
		}
	},
);`;

export const HONO_HELPERS_TEMPLATE = `function buildUrl(pathPattern: string, params: Record<string, any>): string {
	const baseUrl = process.env.API_BASE_URL || "https://api.example.com";

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
		if (
			value !== undefined &&
			!pathParams?.some((p) => p.slice(1, -1) === key) &&
			key !== "body"
		) {
			if (Array.isArray(value)) {
				value.forEach((v) => queryParams.append(key, String(v)));
			} else {
				queryParams.set(key, String(value));
			}
		}
	}

	const fullUrl = baseUrl.replace(/\\/$/, "") + "/" + url.replace(/^\\//, "");
	const queryString = queryParams.toString();
	return queryString ? \`\${fullUrl}?\${queryString}\` : fullUrl;
}

function buildHeaders(params: Record<string, any>): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const [key, value] of Object.entries(params)) {
		if (key.toLowerCase().startsWith("header") && value !== undefined) {
			headers[key.replace(/^header/i, "").replace(/^[-_ ]+/, "")] =
				String(value);
		}
	}
	return headers;
}

function buildRequestBody(params: Record<string, any>): string | undefined {
	if (params.body !== undefined) return JSON.stringify(params.body);
	return undefined;
}`;

export const HONO_DOCKERFILE_TEMPLATE = `FROM oven/bun:1.1

WORKDIR /app

# Copy package files
COPY package.json bun.lockb* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY src/ ./src/

# Build the application
RUN bun run build

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the server
CMD ["bun", "run", "start"]
`;

export const HONO_README_TEMPLATE = `# {{SERVER_NAME}}

{{DESCRIPTION}}

This is a Hono-based MCP (Model Context Protocol) server generated from an OpenAPI specification.

## Features

- 🚀 Built with [Hono](https://hono.dev/) - ultrafast web framework
- 📡 HTTP transport via [@hono/mcp](https://github.com/honojs/middleware/tree/main/packages/mcp)  
- 🔧 Auto-generated from OpenAPI spec
- 🐳 Docker support
- ⚡ Bun runtime optimized
- 🔍 Built-in health checks
- 📝 CORS enabled for web clients

## Quick Start

### Development

\`\`\`bash
# Install dependencies
bun install

# Start development server with hot reload
bun run dev
\`\`\`

### Production

\`\`\`bash
# Build the server
bun run build

# Start production server
bun run start
\`\`\`

### Docker

\`\`\`bash
# Build image
docker build -t {{SERVER_NAME}} .

# Run container
docker run -p 3000:3000 {{SERVER_NAME}}
\`\`\`

## Endpoints

### General Endpoints
- \`GET /\` - Server info and status
- \`GET /health\` - Health check (JSON response)

### MCP Transport Endpoints
- \`POST /mcp\` - **HTTP Transport** - Standard JSON-RPC over HTTP
- \`GET /mcp/sse\` - **SSE Transport** - Server-Sent Events for streaming
- \`GET /mcp/stdio\` - **Stdio Transport** - WebSocket-based stdio simulation (experimental)

## Transport Usage

### HTTP Transport (Recommended for Web Apps)
Send JSON-RPC requests via POST:
\`\`\`bash
curl -X POST http://localhost:3000/mcp \\\\
  -H "Content-Type: application/json" \\\\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
\`\`\`

### SSE Transport (Server-Sent Events)
Connect for streaming responses:
\`\`\`bash
curl -N http://localhost:3000/mcp/sse
# Receives streaming MCP protocol messages
\`\`\`

### Stdio Transport (WebSocket - Experimental)
WebSocket connection at:
\`\`\`
ws://localhost:3000/mcp/stdio
\`\`\`

### Health Monitoring
\`\`\`bash
curl http://localhost:3000/health
# Returns: {"status":"ok","server":"{{SERVER_NAME}}"}
\`\`\`

## Transport Options

- **HTTP transport**: \`http://localhost:3000/mcp\` - Best for REST clients and web apps
- **SSE transport**: \`http://localhost:3000/mcp/sse\` - Best for real-time streaming
- **Stdio transport**: \`ws://localhost:3000/mcp/stdio\` - Experimental WebSocket stdio simulation

## Configuration

Set these environment variables:

- \`PORT\` - Server port (default: 3000)
- \`API_BASE_URL\` - Base URL for API requests
- \`NODE_ENV\` - Environment (development/production)

## MCP Client Usage

Connect to the MCP server at \`http://localhost:3000/mcp\`.

Example using MCP SDK:

\`\`\`typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { HTTPTransport } from "@modelcontextprotocol/sdk/client/http.js";

const transport = new HTTPTransport("http://localhost:3000/mcp");
const client = new Client({
  name: "my-client",
  version: "1.0.0",
}, transport);

await client.connect();
const tools = await client.listTools();
console.log(tools);
\`\`\`

## Available Tools

{{TOOLS_LIST}}

## Development

- \`bun run lint\` - Lint code
- \`bun run format\` - Format code
- \`bun run test\` - Run tests

Built with ❤️ using [OpenAPI MCP Generator](https://github.com/example/openapi-mcp-generator)
`;

export const HONO_BIOME_CONFIG = `{
	"$schema": "https://biomejs.dev/schemas/1.9.0/schema.json",
	"files": {
		"includes": ["src/**/*.ts", "src/**/*.js"]
	},
	"formatter": {
		"enabled": true,
		"indentStyle": "tab",
		"indentWidth": 2
	},
	"linter": {
		"enabled": true,
		"rules": {
			"recommended": true
		}
	},
	"javascript": {
		"formatter": {
			"quoteStyle": "double"
		}
	}
}
`;