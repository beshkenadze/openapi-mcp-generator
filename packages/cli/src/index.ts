import * as p from '@clack/prompts';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { OpenAPIMcpGenerator, suggestNameFromSpec, slugify } from '@workspace/core';

type Runtime = 'bun' | 'node';

type Args = {
  input?: string;
  out?: string;
  name?: string;
  runtime?: Runtime;
  config?: string;
  help?: boolean;
  version?: boolean;
  force?: boolean;
};

export function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    switch (a) {
      case '--input':
      case '-i':
        args.input = next();
        break;
      case '--out':
      case '-o':
      case '--output':
        args.out = next();
        break;
      case '--name':
      case '-n':
        args.name = next();
        break;
      case '--runtime':
      case '-r': {
        const v = next();
        if (v === 'bun' || v === 'node') args.runtime = v;
        else args.runtime = 'bun';
        break;
      }
      case '--config':
      case '-c':
        args.config = next();
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
      case '--force':
      case '-f':
        args.force = true;
        break;
      default:
        // ignore unknown flags for now
        break;
    }
  }
  return args;
}

function usage() {
  const msg = `Usage:
  mcpgen --input <openapi.(json|yaml)> --out <dir> [--name <server-name>] [--runtime bun|node] [--force]
  mcpgen --config <config.yaml> [--out <dir>] [--force]

Examples:
  mcpgen --input ./petstore.yaml --out ./output --name petstore-mcp
  mcpgen --config ./mcpgen.config.yaml --out ./output`;
  p.log.message(msg);
}

function isSpecPathValid(path?: string): boolean {
  if (!path) return false;
  const ext = extname(path).toLowerCase();
  return (
    (ext === '.yaml' || ext === '.yml' || ext === '.json') &&
    existsSync(resolve(process.cwd(), path))
  );
}

export async function collectInputs(
  args: Args
): Promise<{ input: string; out: string; name: string; runtime: Runtime; force: boolean } | null> {
  if (args.config) {
    try {
      const { readFileSync } = await import('node:fs');
      const { resolve } = await import('node:path');
      const YAML = await import('yaml');
      const raw = readFileSync(resolve(process.cwd(), args.config), 'utf8');
      const cfg = YAML.parse(raw) as any;
      const input = String(cfg?.openapi ?? cfg?.spec ?? cfg?.input ?? '');
      const name = String(cfg?.name ?? cfg?.serverName ?? 'mcp-server');
      const out = args.out ?? 'output';
      const runtime: Runtime = 'bun';
      if (!isSpecPathValid(input)) {
        p.log.error("Invalid or missing 'openapi' in config.yaml");
        return null;
      }
      return { input, out, name, runtime, force: Boolean(args.force) };
    } catch (e) {
      p.log.error(`Failed to read config: ${e instanceof Error ? e.message : String(e)}`);
      return null;
    }
  }
  
  const missing = !args.input || !args.out || !args.runtime || !args.name;
  if (!missing) {
    return {
      input: args.input!,
      out: args.out!,
      name: args.name!,
      runtime: args.runtime ?? 'bun',
      force: Boolean(args.force),
    };
  }

  const prompts: Record<string, any> = {};

  if (!args.input) {
    prompts.input = () =>
      p.text({
        message: 'Path to OpenAPI document (json|yaml)',
        placeholder: './petstore.yaml',
        validate(value: string) {
          if (!value || value.trim().length === 0) return 'Path is required';
          const ext = extname(value).toLowerCase();
          if (!['.yaml', '.yml', '.json'].includes(ext))
            return 'File must be .yaml/.yml or .json';
          if (!existsSync(resolve(process.cwd(), value))) return 'File not found';
        },
      });
  }

  if (!args.runtime) {
    prompts.runtime = () =>
      p.select({
        message: 'Select runtime',
        options: [
          { value: 'bun', label: 'Bun (recommended)' },
          { value: 'node', label: 'Node.js' },
        ],
        initialValue: 'bun',
      });
  }

  if (!args.name) {
    prompts.name = async ({ results }: any) => {
      const inputPath = args.input ?? results.input ?? '';
      const suggested = inputPath ? await suggestNameFromSpec(inputPath) : 'mcp-server';
      return p.text({
        message: 'Server name',
        placeholder: suggested,
        initialValue: suggested,
        validate(value: string) {
          if (!value || value.trim().length === 0) return 'Name is required';
        },
      });
    };
  }

  if (!args.out) {
    prompts.out = ({ results }: any) => {
      const name = args.name ?? results.name ?? 'mcp-server';
      const suggested = `./servers/${slugify(String(name))}`;
      return p.text({
        message: 'Output directory',
        placeholder: suggested,
        initialValue: suggested,
        validate(value: string) {
          if (!value || value.trim().length === 0)
            return 'Output directory is required';
        },
      });
    };
  }

  const answers = await p.group(prompts, {
    onCancel: () => {
      p.cancel('Operation cancelled.');
    },
  });

  if (p.isCancel(answers)) return null;

  const input = (args.input ?? answers.input) as string;
  const runtime = (args.runtime ?? answers.runtime ?? 'bun') as Runtime;
  const name = (args.name ?? answers.name) as string;
  const out = (args.out ?? answers.out) as string;
  const force = Boolean(args.force);

  if (!isSpecPathValid(input)) {
    p.log.error(
      'Invalid input path. Use a .yaml/.yml/.json file that exists.'
    );
    return null;
  }

  // Confirm if output dir exists and not empty
  const outAbs = resolve(process.cwd(), out);
  if (!force && existsSync(outAbs)) {
    try {
      const entries = readdirSync(outAbs);
      if (entries.length > 0) {
        const ok = await p.confirm({
          message: `Directory ${out} is not empty. Continue and overwrite files?`,
        });
        if (p.isCancel(ok) || ok === false) {
          p.cancel('Aborted by user');
          return null;
        }
      }
    } catch {
      // ignore read errors
    }
  }

  return { input, out, name, runtime, force };
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.version) {
    try {
      // read package version from compiled bundle's nearby package.json during dev
      const pkg = JSON.parse(
        readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8')
      );
      p.log.message(`mcpgen v${pkg.version ?? '0.0.0'}`);
    } catch {
      p.log.message('mcpgen');
    }
    process.exit(0);
  }

  if (args.help) {
    usage();
    process.exit(0);
  }

  p.intro('🤖 OpenAPI MCP Generator');

  const collected = await collectInputs(args);
  if (!collected) process.exit(1);
  const { input, out, name, runtime } = collected;

  const spin = p.spinner();
  spin.start('Parsing OpenAPI and generating MCP server');

  try {
    const generator = new OpenAPIMcpGenerator({
      debug: false,
    });

    const outputPath = resolve(process.cwd(), out, 'mcp-server', 'index.ts');
    await generator.generateFromOpenAPI(input, outputPath, name);

    spin.stop('✅ Generation complete');
    p.log.success(`Created server: ${name}`);
    p.log.info(`Output: ${resolve(process.cwd(), out)}`);
    p.log.message(`Start server:  cd ${out} && bun run start`);
    p.log.message(`Run (stdio):   bun --bun ${outputPath}`);
    p.outro('🎉 All set!');
  } catch (err) {
    spin.stop('❌ Failed');
    p.log.error(err instanceof Error ? err.message : String(err));
    p.cancel('Exiting');
    process.exit(1);
  }
}

if (import.meta.main) {
  // Run only when executed directly, not during tests/imports
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  main();
}