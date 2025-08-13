import { code } from "./code.js";

export function renderHelpers(): string {
	return code`
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
            queryParams.set(key, String(value));
          }
        }
      }

      const fullUrl = baseUrl.replace(/\\/$/, '') + '/' + url.replace(/^\\//, '');
      const queryString = queryParams.toString();
      return queryString ? \`${"${"}fullUrl}?${"${"}queryString}\` : fullUrl;
    }

    function buildHeaders(params: Record<string, any>): Record<string, string> {
      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(params)) {
        if (key.toLowerCase().startsWith('header') && value !== undefined) {
          headers[key.replace(/^header/i, '').replace(/^[-_ ]+/, '')] = String(value);
        }
      }
      return headers;
    }

    function buildRequestBody(params: Record<string, any>): string | undefined {
      if (params.body !== undefined) return JSON.stringify(params.body);
      return undefined;
    }

    // Transport setup
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('MCP server running on stdio');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await transport.close();
      process.exit(0);
    });
    process.on('SIGTERM', async () => {
      await transport.close();
      process.exit(0);
    });

    process.on('unhandledRejection', (error) => {
      console.error('Server error:', error);
      process.exit(1);
    });
  `;
}
