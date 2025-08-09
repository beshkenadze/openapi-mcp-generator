import { beforeAll, afterAll, test, expect } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// MSW: mock an example endpoint to demonstrate network interception in tests
const msw = setupServer(
  http.get("https://api.example.com/hello", () => {
    return HttpResponse.json({ ok: true, message: "hello" });
  })
);

beforeAll(() => {
  msw.listen({ onUnhandledRequest: "bypass" });
});

afterAll(() => {
  msw.close();
});

test("MCP SDK client lists tools from local server (stdio)", async () => {
  // Sanity check MSW interception works under Bun test
  const res = await fetch("https://api.example.com/hello");
  const body = await res.json();
  expect(body).toEqual({ ok: true, message: "hello" });

  const serverPath = resolve(dirname(fileURLToPath(import.meta.url)), "./bin.ts");

  const client = new Client({ name: "test-client", version: "0.0.0" });
  const transport = new StdioClientTransport({ command: "bun", args: [serverPath] });
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name);
  expect(toolNames).toContain("list-operations");
  expect(toolNames).toContain("get-operation");

  await client.close();
});
