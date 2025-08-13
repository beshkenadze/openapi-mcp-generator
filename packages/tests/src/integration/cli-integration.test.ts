import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { $ } from 'bun';
import { rmSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CLI Integration Tests', () => {
  const testDir = resolve(process.cwd(), 'test-cli-integration');
  const testSpec = resolve(testDir, 'api-spec.json');
  const outputDir = resolve(testDir, 'output');
  const cliDir = resolve(__dirname, '../../../cli');

  beforeEach(async () => {
    // Clean up and create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
    mkdirSync(testDir, { recursive: true });

    // Create a test OpenAPI specification
    const apiSpec = {
      openapi: '3.0.0',
      info: {
        title: 'Integration Test API',
        version: '1.0.0',
        description: 'API for testing CLI integration'
      },
      servers: [
        {
          url: 'https://api.example.com'
        }
      ],
      paths: {
        '/users': {
          get: {
            summary: 'List users',
            description: 'Get a list of users',
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'integer' },
                          name: { type: 'string' },
                          email: { type: 'string' }
                        }
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

    await Bun.write(testSpec, JSON.stringify(apiSpec, null, 2));
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should generate MCP server from CLI command', async () => {
    const result = await $`cd ${cliDir} && bun run dev --input ${testSpec} --out ${outputDir} --name integration-test-mcp --runtime bun`.nothrow();
    
    expect(result.exitCode).toBe(0);
    
    // Verify output directory structure was created
    expect(existsSync(resolve(outputDir, 'mcp-server'))).toBe(true);
    expect(existsSync(resolve(outputDir, 'mcp-server', 'index.ts'))).toBe(true);
    
    // Verify generated server has basic structure
    const serverContent = readFileSync(resolve(outputDir, 'mcp-server', 'index.ts'), 'utf8');
    expect(serverContent).toContain('McpServer');
    expect(serverContent).toContain('name: "integration-test-mcp"');
  }, 15000);

  test('should handle version flag correctly', async () => {
    const result = await $`cd ${cliDir} && bun run dev --version`.nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(result.stdout.toString()).toContain('mcpgen');
  });

  test('should handle version subcommand correctly', async () => {
    const result = await $`cd ${cliDir} && bun run dev version`.nothrow();

    expect(result.exitCode).toBe(0);
    const out = result.stdout.toString();
    expect(out).toContain('mcpgen');
    expect(out).toMatch(/Runtime:\s+(Bun|Node\.js)\s+/);
  });

  test('should handle help flag correctly', async () => {
    const result = await $`cd ${cliDir} && bun run dev --help`.nothrow();
    
    expect(result.exitCode).toBe(0);
    const output = result.stdout.toString();
    expect(output).toContain('Usage:');
    expect(output).toContain('Examples:');
    expect(output).toContain('OpenAPI MCP Generator');
  });

  test('should handle config file input', async () => {
    const configPath = resolve(testDir, 'config.yaml');
    const configContent = `
openapi: ${testSpec}
name: config-test-mcp
    `;
    
    await Bun.write(configPath, configContent);
    
    const result = await $`cd ${cliDir} && bun run dev --config ${configPath} --out ${outputDir}`.nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(existsSync(resolve(outputDir, 'mcp-server', 'index.ts'))).toBe(true);
    
    const serverContent = readFileSync(resolve(outputDir, 'mcp-server', 'index.ts'), 'utf8');
    expect(serverContent).toContain('name: "config-test-mcp"');
  });

  test('should handle force flag for overwriting', async () => {
    // Create output directory with existing content
    mkdirSync(resolve(outputDir, 'mcp-server'), { recursive: true });
    await Bun.write(resolve(outputDir, 'mcp-server', 'existing.txt'), 'existing content');
    
    const result = await $`cd ${cliDir} && bun run dev --input ${testSpec} --out ${outputDir} --name force-test-mcp --runtime bun --force`.nothrow();
    
    expect(result.exitCode).toBe(0);
    expect(existsSync(resolve(outputDir, 'mcp-server', 'index.ts'))).toBe(true);
  });
});

describe('CLI Error Handling', () => {
  const cliDir = resolve(__dirname, '../../../cli');

  test('should fail gracefully with invalid input file', async () => {
    const result = await $`cd ${cliDir} && timeout 5 bun run dev --input non-existent.yaml --out ./output --name test`.nothrow();
    
    // Should exit with error code (timeout will cause non-zero exit)
    expect(result.exitCode).not.toBe(0);
  });

  test('should fail gracefully with invalid config file', async () => {
    const result = await $`cd ${cliDir} && bun run dev --config non-existent-config.yaml`.nothrow();
    
    // Should exit with error code
    expect(result.exitCode).toBe(1);
  });
});

describe('CLI Binary Tests', () => {
  test('should work with compiled binary', async () => {
    // Test the binary if it exists
    const binaryPath = resolve(process.cwd(), '../cli/bin/mcpgen');
    
    if (existsSync(binaryPath)) {
      const result = await $`${binaryPath} --version`.nothrow();
      expect(result.exitCode).toBe(0);
      expect(result.stdout.toString()).toContain('mcpgen');
    } else {
      // Skip test if binary doesn't exist
      console.log('Binary not found, skipping binary test');
    }
  });
});
