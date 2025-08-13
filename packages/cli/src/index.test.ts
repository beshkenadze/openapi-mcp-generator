import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import { parseArgs, collectInputs } from './index';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

describe('CLI Argument Parsing', () => {
  test('should parse basic arguments', () => {
    const args = parseArgs(['--input', 'test.yaml', '--out', 'output', '--name', 'test-server']);
    
    expect(args.input).toBe('test.yaml');
    expect(args.out).toBe('output');
    expect(args.name).toBe('test-server');
  });

  test('should parse short flags', () => {
    const args = parseArgs(['-i', 'test.json', '-o', 'build', '-n', 'my-server']);
    
    expect(args.input).toBe('test.json');
    expect(args.out).toBe('build');
    expect(args.name).toBe('my-server');
  });

  test('should parse runtime flag', () => {
    const args = parseArgs(['--runtime', 'node']);
    expect(args.runtime).toBe('node');
    
    const args2 = parseArgs(['-r', 'bun']);
    expect(args2.runtime).toBe('bun');
  });

  test('should default to bun runtime for invalid values', () => {
    const args = parseArgs(['--runtime', 'invalid']);
    expect(args.runtime).toBe('bun');
  });

  test('should parse boolean flags', () => {
    const args = parseArgs(['--help', '--version', '--force']);
    
    expect(args.help).toBe(true);
    expect(args.version).toBe(true);
    expect(args.force).toBe(true);
  });

  test('should handle empty arguments', () => {
    const args = parseArgs([]);
    
    expect(args.input).toBeUndefined();
    expect(args.out).toBeUndefined();
    expect(args.name).toBeUndefined();
    expect(args.runtime).toBeUndefined();
    expect(args.help).toBeUndefined();
    expect(args.version).toBeUndefined();
    expect(args.force).toBeUndefined();
  });

  test('should ignore unknown flags', () => {
    const args = parseArgs(['--unknown', 'value', '--input', 'test.yaml']);
    
    expect(args.input).toBe('test.yaml');
    expect(args).not.toHaveProperty('unknown');
  });
});

describe('CLI Input Collection', () => {
  const testDir = resolve(process.cwd(), 'test-temp');
  const testSpec = resolve(testDir, 'test.yaml');

  beforeEach(() => {
    // Create test directory and spec file
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    
    // Create a valid test spec file
    const testSpecContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      summary: Test endpoint
      responses:
        '200':
          description: Success
    `;
    
    Bun.write(testSpec, testSpecContent);
  });

  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should return inputs when all required args are provided', async () => {
    const args = {
      input: testSpec,
      out: 'output',
      name: 'test-server',
      runtime: 'bun' as const,
      force: false
    };

    const result = await collectInputs(args);
    
    expect(result).not.toBeNull();
    if (result) {
      expect(result.input).toBe(testSpec);
      expect(result.out).toBe('output');
      expect(result.name).toBe('test-server');
      expect(result.runtime).toBe('bun');
      expect(result.force).toBe(false);
    }
  });

  test('should handle config file input', async () => {
    const configPath = resolve(testDir, 'config.yaml');
    const configContent = `
openapi: ${testSpec}
name: config-server
    `;
    
    await Bun.write(configPath, configContent);

    const args = {
      config: configPath,
      out: 'config-output'
    };

    const result = await collectInputs(args);
    
    expect(result).not.toBeNull();
    expect(result?.input).toBe(testSpec);
    expect(result?.name).toBe('config-server');
    expect(result?.out).toBe('config-output');
    expect(result?.runtime).toBe('bun');
  });

  test('should handle invalid config file', async () => {
    const args = {
      config: 'non-existent-config.yaml'
    };

    const result = await collectInputs(args);
    expect(result).toBeNull();
  });

  test('should handle invalid spec file in config', async () => {
    const configPath = resolve(testDir, 'invalid-config.yaml');
    const configContent = `
openapi: non-existent-spec.yaml
name: invalid-server
    `;
    
    await Bun.write(configPath, configContent);

    const args = {
      config: configPath
    };

    const result = await collectInputs(args);
    expect(result).toBeNull();
  });
});

describe('File Validation', () => {
  const testDir = resolve(process.cwd(), 'test-validation');

  beforeEach(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should accept valid OpenAPI file extensions', async () => {
    const yamlFile = resolve(testDir, 'test.yaml');
    const ymlFile = resolve(testDir, 'test.yml');
    const jsonFile = resolve(testDir, 'test.json');

    // Create test files
    const content = JSON.stringify({
      openapi: '3.0.0',
      info: { title: 'Test', version: '1.0.0' },
      paths: {}
    });

    await Bun.write(yamlFile, content);
    await Bun.write(ymlFile, content);
    await Bun.write(jsonFile, content);

    // Test YAML
    const yamlResult = await collectInputs({
      input: yamlFile,
      out: 'output',
      name: 'test',
      runtime: 'bun' as const
    });
    expect(yamlResult).not.toBeNull();

    // Test YML
    const ymlResult = await collectInputs({
      input: ymlFile,
      out: 'output',
      name: 'test',
      runtime: 'bun' as const
    });
    expect(ymlResult).not.toBeNull();

    // Test JSON
    const jsonResult = await collectInputs({
      input: jsonFile,
      out: 'output',
      name: 'test',
      runtime: 'bun' as const
    });
    expect(jsonResult).not.toBeNull();
  });

  test('should handle invalid file extensions', async () => {
    const txtFile = resolve(testDir, 'test.txt');
    await Bun.write(txtFile, 'not a spec file');

    const result = await collectInputs({
      input: txtFile,
      out: 'output',
      name: 'test',
      runtime: 'bun' as const
    });

    // The function validates the file extension in isSpecPathValid later
    // For now, it returns the inputs as provided
    expect(result).not.toBeNull();
    if (result) {
      expect(result.input).toBe(txtFile);
    }
  });

  test('should handle non-existent files', async () => {
    const result = await collectInputs({
      input: 'non-existent.yaml',
      out: 'output',  
      name: 'test',
      runtime: 'bun' as const
    });

    // The function returns inputs but validation happens later in the flow
    expect(result).not.toBeNull();
    if (result) {
      expect(result.input).toBe('non-existent.yaml');
    }
  });
});