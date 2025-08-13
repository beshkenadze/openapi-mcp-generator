import { code } from "./code.js";

export function renderServerHeader(title?: string): string {
	if (!title) return "";
	return code`
    // ${title}
    // Generated from OpenAPI specification
  `;
}

export function renderServerInit(serverName: string, version?: string): string {
	return code`
    const server = new McpServer({
      name: '${serverName}',
      version: '${version ?? "1.0.0"}'
    });
  `;
}
