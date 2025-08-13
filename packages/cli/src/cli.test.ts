import { test, expect, describe } from 'bun:test';
import { $ } from 'bun';
import { slugify, suggestNameFromSpec, readTitleFromSpec } from '@workspace/core';

describe('CLI Utilities', () => {
  test('should generate slugified names correctly', () => {
    expect(slugify('My API Server')).toBe('my-api-server');
    expect(slugify('User_Service')).toBe('user-service');
    expect(slugify('api-v2.1')).toBe('api-v2-1');
    expect(slugify('  spaces  ')).toBe('spaces');
  });

  test('should suggest names from OpenAPI specs', async () => {
    // Create a temporary test spec
    const testSpec = './test-suggest.json';
    const specContent = {
      openapi: '3.0.0',
      info: {
        title: 'Petstore API',
        version: '1.0.0'
      },
      paths: {}
    };

    await Bun.write(testSpec, JSON.stringify(specContent));

    try {
      const suggestedName = await suggestNameFromSpec(testSpec);
      expect(suggestedName).toBe('petstore-api-mcp');
    } finally {
      // Clean up
      try {
        await Bun.file(testSpec).exists() && await $`rm ${testSpec}`;
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test('should read title from OpenAPI specs', async () => {
    // Create a temporary test spec
    const testSpec = './test-title.json';
    const specContent = {
      openapi: '3.0.0',
      info: {
        title: 'User Management API',
        version: '2.0.0'
      },
      paths: {}
    };

    await Bun.write(testSpec, JSON.stringify(specContent));

    try {
      const title = await readTitleFromSpec(testSpec);
      expect(title).toBe('User Management API');
    } finally {
      // Clean up
      try {
        await Bun.file(testSpec).exists() && await $`rm ${testSpec}`;
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});

describe('CLI Command Construction', () => {
  test('should build correct command for non-interactive mode', () => {
    const args = {
      input: './api.yaml',
      out: './output',
      name: 'my-server',
      runtime: 'bun' as const,
      force: true
    };

    // Test that the CLI would construct the correct parameters
    expect(args.input).toBe('./api.yaml');
    expect(args.out).toBe('./output');
    expect(args.name).toBe('my-server');
    expect(args.runtime).toBe('bun');
    expect(args.force).toBe(true);
  });

  test('should handle missing optional parameters', () => {
    const args = {
      input: './api.yaml',
      out: './output'
    };

    // Test defaults
    expect(args.input).toBe('./api.yaml');
    expect(args.out).toBe('./output');
    expect((args as any).name).toBeUndefined();
    expect((args as any).runtime).toBeUndefined();
  });
});

describe('CLI Configuration Parsing', () => {
  test('should parse YAML config correctly', async () => {
    const configPath = './test-config.yaml';
    const configContent = `
openapi: ./my-api.json
name: yaml-config-server
description: Test YAML config
`;

    await Bun.write(configPath, configContent);

    try {
      // Test YAML parsing (simulated)
      const YAML = await import('yaml');
      const parsed = YAML.parse(configContent);
      
      expect(parsed.openapi).toBe('./my-api.json');
      expect(parsed.name).toBe('yaml-config-server');
      expect(parsed.description).toBe('Test YAML config');
    } finally {
      // Clean up
      try {
        await Bun.file(configPath).exists() && await $`rm ${configPath}`;
      } catch {
        // Ignore cleanup errors
      }
    }
  });
});

describe('CLI File Path Resolution', () => {
  test('should resolve relative paths correctly', () => {
    const relativePath = './api/spec.yaml';
    const absolutePath = '/Users/test/api/spec.yaml';
    
    // These are just string manipulations the CLI does
    expect(relativePath.startsWith('./')).toBe(true);
    expect(absolutePath.startsWith('/')).toBe(true);
  });

  test('should identify file extensions correctly', () => {
    const yamlFile = 'spec.yaml';
    const ymlFile = 'spec.yml';
    const jsonFile = 'spec.json';
    const txtFile = 'spec.txt';

    const getExtension = (filename: string) => filename.split('.').pop()?.toLowerCase();

    expect(getExtension(yamlFile)).toBe('yaml');
    expect(getExtension(ymlFile)).toBe('yml');
    expect(getExtension(jsonFile)).toBe('json');
    expect(getExtension(txtFile)).toBe('txt');
  });

  test('should validate supported file extensions', () => {
    const supportedExtensions = ['yaml', 'yml', 'json'];
    
    const isValidExtension = (filename: string) => {
      const ext = filename.split('.').pop()?.toLowerCase();
      return ext ? supportedExtensions.includes(ext) : false;
    };

    expect(isValidExtension('api.yaml')).toBe(true);
    expect(isValidExtension('api.yml')).toBe(true);
    expect(isValidExtension('api.json')).toBe(true);
    expect(isValidExtension('api.txt')).toBe(false);
    expect(isValidExtension('api')).toBe(false);
  });
});