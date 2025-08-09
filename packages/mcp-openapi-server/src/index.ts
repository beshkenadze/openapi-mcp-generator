import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

type HttpMethod = "get" | "put" | "post" | "delete" | "options" | "head" | "patch" | "trace";

function parseOpenApi(raw: string): any {
  try {
    // Prefer Scalar parser if available
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const scalar: any = require("@scalar/openapi-parser");
    if (scalar?.createParser) {
      const parser = scalar.createParser();
      const { openapi } = parser.parse(raw);
      if (openapi) return openapi;
    }
  } catch {
    // ignore and fallback to YAML
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const YAML: any = require("yaml");
  return YAML.parse(raw);
}

function extractOperations(doc: any) {
  const ops: { method: HttpMethod; path: string; operationId?: string; summary?: string }[] = [];
  const paths = doc?.paths ?? {};
  for (const path of Object.keys(paths)) {
    const item = paths[path] ?? {};
    for (const method of [
      "get",
      "put",
      "post",
      "delete",
      "options",
      "head",
      "patch",
      "trace"
    ] as HttpMethod[]) {
      const op = (item as any)[method];
      if (op) ops.push({ method, path, operationId: op.operationId, summary: op.summary });
    }
  }
  return ops;
}

export async function start() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const specPath = resolve(__dirname, "../openapi/petstore.yaml");
  const raw = readFileSync(specPath, "utf8");
  const doc = parseOpenApi(raw);
  const operations = extractOperations(doc);

  const server = new McpServer({
    name: "openapi-petstore",
    version: "0.1.0"
  });

  // Expose the raw spec as a static resource
  server.registerResource(
    "openapi-spec",
    "openapi://spec",
    {
      title: `OpenAPI Spec: ${doc?.info?.title ?? "Petstore"}`,
      description: `Version ${doc?.info?.version ?? "unknown"}`,
      mimeType: "text/yaml"
    },
    async (uri) => ({
      contents: [
        {
          uri: uri.href,
          text: raw
        }
      ]
    })
  );

  // Expose dynamic operation info as a resource template
  server.registerResource(
    "openapi-operation",
    new ResourceTemplate("openapi://operation/{method}/{path}", { list: undefined }),
    {
      title: "OpenAPI Operation",
      description: "Details for a specific OpenAPI operation",
      mimeType: "application/json"
    },
    async (uri, { method, path }) => {
      const m = String(method).toLowerCase();
      const p = decodeURIComponent(String(path));
      const op = doc?.paths?.[p]?.[m];
      if (!op) {
        return {
          contents: [
            {
              uri: uri.href,
              text: JSON.stringify({ error: "Operation not found", method: m, path: p })
            }
          ]
        };
      }
      const minimal = {
        method: m,
        path: p,
        operationId: op.operationId,
        summary: op.summary,
        description: op.description,
        parameters: op.parameters,
        requestBody: op.requestBody,
        responses: op.responses
      };
      return {
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(minimal, null, 2)
          }
        ]
      };
    }
  );

  // List operations tool
  server.registerTool(
    "list-operations",
    {
      title: "List OpenAPI operations",
      description: "List HTTP method, path, operationId, and summary"
    },
    async () => ({
      content: [
        {
          type: "text",
          text: operations
            .map((o) => `${o.method.toUpperCase()} ${o.path}${o.operationId ? ` (${o.operationId})` : ""}${
              o.summary ? ` - ${o.summary}` : ""
            }`)
            .join("\n")
        }
      ]
    })
  );

  // Get operation details tool
  server.registerTool(
    "get-operation",
    {
      title: "Get OpenAPI operation",
      description: "Return operation details for a method and path",
      inputSchema: {
        method: z.enum(["get", "put", "post", "delete", "options", "head", "patch", "trace"]),
        path: z.string().describe("Path as defined in the OpenAPI document")
      }
    },
    async ({ method, path }) => {
      const m = String(method).toLowerCase();
      const p = String(path);
      const op = doc?.paths?.[p]?.[m];
      if (!op) {
        return {
          content: [
            { type: "text", text: `Operation not found for ${m.toUpperCase()} ${p}` }
          ],
          isError: true
        };
      }
      const minimal = {
        method: m,
        path: p,
        operationId: op.operationId,
        summary: op.summary,
        description: op.description,
        parameters: op.parameters,
        requestBody: op.requestBody,
        responses: op.responses
      } as const;
      return {
        content: [
          { type: "text", text: JSON.stringify(minimal, null, 2) }
        ]
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenAPI Petstore MCP server running on stdio");
}
