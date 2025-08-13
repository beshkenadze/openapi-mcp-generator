import { code } from "./code.js";

export function renderRegisterTool(opts: {
	toolName: string;
	title: string;
	description: string;
	inputSchema: string;
	method: string; // uppercase
	pathPattern: string;
}): string {
	const { toolName, title, description, inputSchema, method, pathPattern } =
		opts;
	return code`
    server.registerTool(
      '${toolName}',
      {
        title: '${title}',
        description: '${description}',
        inputSchema: ${inputSchema}
      },
      async (params) => {
        try {
          // Build URL with path and query parameters
          const url = buildUrl('${pathPattern}', params);

          // Make HTTP request
          const response = await fetch(url, {
            method: '${method}',
            headers: {
              'Content-Type': 'application/json',
              ...buildHeaders(params)
            },
            ${method !== "GET" ? code`body: buildRequestBody(params),` : ""}
          });

          if (!response.ok) {
            throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
          }

          const data = await response.text();

          return {
            content: [{ type: 'text', text: data }]
          };
        } catch (error) {
          return {
            content: [{ type: 'text', text: \`Error: \${error instanceof Error ? error.message : String(error)}\` }],
            isError: true
          };
        }
      }
    );
  `;
}
