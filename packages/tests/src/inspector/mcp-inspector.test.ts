import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { resolve } from 'node:path';
import { existsSync, rmSync } from 'node:fs';
import consola from 'consola';

/**
 * Test generated MCP server using the MCP Inspector CLI
 */
async function testWithInspector(serverPath: string, timeout = 30000): Promise<boolean> {
  if (!existsSync(serverPath)) {
    consola.error(`Server file not found: ${serverPath}`);
    return false;
  }

  try {
    consola.info(`Testing MCP server: ${serverPath}`);
    
    // Run MCP Inspector CLI to test the server (using bun runtime)
    const result = await $`timeout ${timeout / 1000} npx @modelcontextprotocol/inspector --cli bun ${serverPath} --method tools/list`.nothrow();
    
    if (result.exitCode === 0) {
      consola.success('✅ MCP server validation passed');
      const output = result.stdout.toString();
      
      // Parse and display basic info about the server
      try {
        const tools = JSON.parse(output);
        if (tools && Array.isArray(tools.tools)) {
          consola.info(`📋 Server has ${tools.tools.length} tools available`);
          tools.tools.forEach((tool: any, index: number) => {
            consola.info(`  ${index + 1}. ${tool.name}: ${tool.description || 'No description'}`);
          });
        }
      } catch (parseError) {
        consola.warn('Could not parse tools list, but server responded successfully');
      }
      
      return true;
    } else {
      consola.error('❌ MCP server validation failed');
      consola.error('STDOUT:', result.stdout.toString());
      consola.error('STDERR:', result.stderr.toString());
      return false;
    }
  } catch (error) {
    consola.error('❌ MCP Inspector test failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

describe('MCP Inspector Integration', () => {
  const testDir = resolve(process.cwd(), 'test-inspector');
  const outputDir = resolve(testDir, 'output');
  const cliDir = resolve(process.cwd(), '../cli');

  beforeEach(() => {
    // Clean up any existing test output
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should validate generated MCP server with Inspector', async () => {
    // Create test OpenAPI spec
    const testSpec = resolve(testDir, 'test-api.json');
    const testSpecContent = {
      openapi: '3.0.0',
      info: {
        title: 'Test API for Inspector',
        version: '1.0.0',
        description: 'A test API for validating MCP server generation'
      },
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            description: 'Check API health status',
            responses: {
              '200': {
                description: 'API is healthy',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        status: { type: 'string' },
                        timestamp: { type: 'string' }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    };

    await Bun.write(testSpec, JSON.stringify(testSpecContent, null, 2));

    // Generate MCP server using the CLI
    consola.info('🔧 Generating MCP server for Inspector test...');
    const generateResult = await $`cd ${cliDir} && bun run dev --input ${testSpec} --out ${outputDir} --name test-inspector-mcp --runtime bun`.nothrow();
    
    if (generateResult.exitCode !== 0) {
      consola.error('❌ CLI generation failed');
      consola.error('STDOUT:', generateResult.stdout.toString());
      consola.error('STDERR:', generateResult.stderr.toString());
      throw new Error('Failed to generate MCP server');
    }

    consola.success('✅ MCP server generated successfully');

    // Test the generated server with MCP Inspector
    const serverPath = resolve(outputDir, 'mcp-server', 'index.ts');
    const inspectorResult = await testWithInspector(serverPath);

    expect(inspectorResult).toBe(true);
  }, 60000); // 60 second timeout for full integration test

  test('should handle Inspector timeout gracefully', async () => {
    // Create a minimal but potentially problematic server
    const problemServerPath = resolve(testDir, 'problem-server.ts');
    const problemServerContent = `
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new McpServer({
  name: 'problem-server',
  version: '1.0.0'
});

// Intentionally problematic: server that doesn't respond properly
server.registerTool('test', {
  title: 'Test tool',
  description: 'A test tool',
  inputSchema: {}
}, async () => {
  // Simulate hanging
  await new Promise(resolve => setTimeout(resolve, 60000));
  return { content: [{ type: 'text', text: 'Never reached' }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
    `;

    await Bun.write(problemServerPath, problemServerContent);

    // Test with a short timeout
    const result = await testWithInspector(problemServerPath, 5000);
    
    // Should fail due to timeout, but gracefully
    expect(result).toBe(false);
  }, 15000);
});

describe('MCP Inspector CLI Usage', () => {
  test('should have MCP Inspector available', async () => {
    const result = await $`npx @modelcontextprotocol/inspector --help`.nothrow();
    
    // Should be able to access the inspector
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('inspector');
  }, 30000); // Give time for npx to download if needed

  test('should support CLI mode', async () => {
    // Test that CLI mode is supported
    const result = await $`npx @modelcontextprotocol/inspector --cli --help`.nothrow();
    
    // Should recognize CLI mode
    expect(result.exitCode).toBe(0);
  }, 30000);
});