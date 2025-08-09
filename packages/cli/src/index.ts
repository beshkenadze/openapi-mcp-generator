#!/usr/bin/env bun
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { generateServerFromOpenAPI } from "@workspace/core";

function printHelp() {
  console.log(`Usage: mcpgen --input <openapi.json> --out <dir> [--name <server-name>] [--runtime bun|node]

Examples:
  mcpgen --input ./petstore.json --out ./servers/petstore --name petstore-mcp
`);
}

type Args = {
  input?: string;
  out?: string;
  name?: string;
  runtime?: "bun" | "node";
};

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") args.input = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--runtime") args.runtime = (argv[++i] as any) ?? "bun";
    else if (a === "-h" || a === "--help") return {};
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);
  if (!args.input || !args.out) {
    printHelp();
    process.exit(1);
  }
  const input = resolve(args.input);
  const out = resolve(args.out);
  if (!existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }

  const result = generateServerFromOpenAPI({ path: input }, { outDir: out, name: args.name, runtime: args.runtime ?? "bun" });
  console.log(`Generated server '${result.name}' in ${result.outDir}`);
  console.log(`Detected operations: ${result.operations.length}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
