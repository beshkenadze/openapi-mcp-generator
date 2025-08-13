import * as p from "@clack/prompts";
import chalk from "chalk";
import boxen from "boxen";
import consola from "consola";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";
import {
	OpenAPIMcpGenerator,
	suggestNameFromSpec,
	slugify,
} from "@aigentools/mcpgen-core";

// Optional build-time constants injected by bun build scripts
declare const BUILD_NAME: string | undefined;
declare const BUILD_VERSION: string | undefined;
declare const BUILD_TIME: string | undefined;
declare const GIT_COMMIT: string | undefined;
declare const BUILD_TARGET: string | undefined;

type Runtime = "bun" | "node" | "hono";

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
			case "--input":
			case "-i":
				args.input = next();
				break;
			case "--out":
			case "-o":
			case "--output":
				args.out = next();
				break;
			case "--name":
			case "-n":
				args.name = next();
				break;
			case "--runtime":
			case "-r": {
				const v = next();
				if (v === "bun" || v === "node" || v === "hono") args.runtime = v;
				else args.runtime = "bun";
				break;
			}
			case "--config":
			case "-c":
				args.config = next();
				break;
			case "--help":
			case "-h":
				args.help = true;
				break;
			case "--version":
			case "-v":
				args.version = true;
				break;
			case "--force":
			case "-f":
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
	console.log(
		boxen(chalk.cyanBright("🚀 OpenAPI MCP Generator"), {
			padding: 1,
			borderColor: "cyan",
			borderStyle: "round",
		}),
	);

    const msg = `${chalk.bold("Usage:")}
  ${chalk.green("mcpgen")} ${chalk.yellow("--input")} ${chalk.blue("<openapi.(json|yaml)>")} ${chalk.yellow("--out")} ${chalk.blue("<dir>")} [${chalk.yellow("--name")} ${chalk.blue("<server-name>")}] [${chalk.yellow("--runtime")} ${chalk.blue("bun|node|hono")}] [${chalk.yellow("--force")}]
  ${chalk.green("mcpgen")} ${chalk.yellow("--config")} ${chalk.blue("<config.yaml>")} [${chalk.yellow("--out")} ${chalk.blue("<dir>")}] [${chalk.yellow("--force")}]
  ${chalk.green("mcpgen")} ${chalk.yellow("version")}

${chalk.bold("Examples:")}
  ${chalk.green("mcpgen")} ${chalk.yellow("--input")} ${chalk.blue("./petstore.yaml")} ${chalk.yellow("--out")} ${chalk.blue("./output")} ${chalk.yellow("--name")} ${chalk.blue("petstore-mcp")}
  ${chalk.green("mcpgen")} ${chalk.yellow("--config")} ${chalk.blue("./mcpgen.config.yaml")} ${chalk.yellow("--out")} ${chalk.blue("./output")}`;

	console.log(msg);
}

async function printVersion(): Promise<void> {
    try {
        const _pkgName: string =
            typeof BUILD_NAME !== "undefined" ? BUILD_NAME : (() => {
                try {
                    const url = new URL("../package.json", import.meta.url);
                    const pkg = JSON.parse(readFileSync(url, "utf8"));
                    return String(pkg.name ?? "mcpgen");
                } catch {
                    return "mcpgen";
                }
            })();

        const pkgVersion: string =
            typeof BUILD_VERSION !== "undefined" ? BUILD_VERSION : (() => {
                try {
                    const url = new URL("../package.json", import.meta.url);
                    const pkg = JSON.parse(readFileSync(url, "utf8"));
                    return String(pkg.version ?? "0.0.0");
                } catch {
                    return "0.0.0";
                }
            })();

        type BunRuntime = { version: string };
        const bunGlobal = (globalThis as unknown as { Bun?: BunRuntime }).Bun;
        const isBun = typeof bunGlobal !== "undefined";
        const bunVersion: string | null = isBun ? (bunGlobal?.version ?? null) : null;
        const nodeVersion = process.versions?.node ? `v${process.versions.node}` : process.version;
        const runtime = isBun ? `Bun ${bunVersion}` : `Node.js ${nodeVersion}`;

        const buildTimeConst = typeof BUILD_TIME !== "undefined" ? BUILD_TIME : undefined;
        const gitCommitConst = typeof GIT_COMMIT !== "undefined" ? GIT_COMMIT : undefined;

        let releaseDate = buildTimeConst ?? "";
        let commitSha = gitCommitConst ?? "";

        if (!releaseDate || !commitSha) {
            try {
                const { execSync } = await import("node:child_process");
                if (!releaseDate) {
                    try {
                        releaseDate = execSync("git show -s --format=%cI HEAD", { stdio: ["ignore", "pipe", "ignore"] })
                            .toString()
                            .trim();
                    } catch {}
                }
                if (!commitSha) {
                    try {
                        commitSha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
                            .toString()
                            .trim();
                    } catch {}
                }
            } catch {
                // ignore
            }
        }

        console.log(chalk.cyan(`mcpgen ${pkgVersion}`));
        console.log(chalk.gray(`Runtime: ${runtime}`));
        if (releaseDate) console.log(chalk.gray(`Release: ${releaseDate}`));
        if (commitSha) console.log(chalk.gray(`Commit: ${commitSha}`));
    } catch (_e) {
        console.log(chalk.cyan("mcpgen"));
    }
}

function isSpecPathValid(path?: string): boolean {
	if (!path) return false;
	const ext = extname(path).toLowerCase();
	return (
		(ext === ".yaml" || ext === ".yml" || ext === ".json") &&
		existsSync(resolve(process.cwd(), path))
	);
}

export async function collectInputs(args: Args): Promise<{
	input: string;
	out: string;
	name: string;
	runtime: Runtime;
	force: boolean;
} | null> {
	if (args.config) {
		try {
			const { readFileSync } = await import("node:fs");
			const { resolve } = await import("node:path");
			const YAML = await import("yaml");
			const raw = readFileSync(resolve(process.cwd(), args.config), "utf8");
			type Config = Partial<{
				openapi: string;
				spec: string;
				input: string;
				name: string;
				serverName: string;
			}>;
			const cfg = YAML.parse(raw) as unknown as Config;
			const input = String(cfg?.openapi ?? cfg?.spec ?? cfg?.input ?? "");
			const name = String(cfg?.name ?? cfg?.serverName ?? "mcp-server");
			const out = args.out ?? "output";
			const runtime: Runtime = "bun";
			if (!isSpecPathValid(input)) {
				console.log(
					chalk.red("❌ Invalid or missing 'openapi' in config.yaml"),
				);
				return null;
			}
			return { input, out, name, runtime, force: Boolean(args.force) };
		} catch (e) {
			console.log(
				chalk.red(
					`❌ Failed to read config: ${e instanceof Error ? e.message : String(e)}`,
				),
			);
			return null;
		}
	}

	const missing = !args.input || !args.out || !args.runtime || !args.name;
	if (!missing) {
		return {
			input: args.input as string,
			out: args.out as string,
			name: args.name as string,
			runtime: args.runtime ?? "bun",
			force: Boolean(args.force),
		};
	}

	type GroupContext = { results: Record<string, unknown> };
	type GroupPrompt = (ctx?: GroupContext) => Promise<unknown> | undefined;
	const prompts: Record<string, GroupPrompt> = {};

	if (!args.input) {
		prompts.input = () =>
			p.text({
				message: "Path to OpenAPI document (json|yaml)",
				placeholder: "./petstore.yaml",
				validate(value: string) {
					if (!value || value.trim().length === 0) return "Path is required";
					const ext = extname(value).toLowerCase();
					if (![".yaml", ".yml", ".json"].includes(ext))
						return "File must be .yaml/.yml or .json";
					if (!existsSync(resolve(process.cwd(), value)))
						return "File not found";
				},
			});
	}

	if (!args.runtime) {
		prompts.runtime = () =>
			p.select({
				message: "Select runtime",
				options: [
					{ value: "bun", label: "Bun (recommended)" },
					{ value: "node", label: "Node.js" },
					{ value: "hono", label: "Hono Web Server (HTTP + SSE + Stdio)" },
				],
				initialValue: "bun",
			});
	}

	if (!args.name) {
		prompts.name = async (
			{ results }: GroupContext = { results: {} as Record<string, unknown> },
		) => {
			const inputPath = args.input ?? results.input ?? "";
			const suggested = inputPath
				? await suggestNameFromSpec(String(inputPath))
				: "mcp-server";
			return p.text({
				message: "Server name",
				placeholder: suggested,
				initialValue: suggested,
				validate(value: string) {
					if (!value || value.trim().length === 0) return "Name is required";
				},
			});
		};
	}

	if (!args.out) {
		prompts.out = (
			{ results }: GroupContext = { results: {} as Record<string, unknown> },
		) => {
			const name = args.name ?? results.name ?? "mcp-server";
			const suggested = `./servers/${slugify(String(name))}`;
			return p.text({
				message: "Output directory",
				placeholder: suggested,
				initialValue: suggested,
				validate(value: string) {
					if (!value || value.trim().length === 0)
						return "Output directory is required";
				},
			});
		};
	}

	const answers = (await p.group(
		prompts as unknown as Parameters<typeof p.group>[0],
		{
			onCancel: () => {
				p.cancel("Operation cancelled.");
			},
		},
	)) as Record<string, unknown>;

	if (p.isCancel(answers)) return null;

	const input = (args.input ?? answers.input) as string;
	const runtime = (args.runtime ?? answers.runtime ?? "bun") as Runtime;
	const name = (args.name ?? answers.name) as string;
	const out = (args.out ?? answers.out) as string;
	const force = Boolean(args.force);

	if (!isSpecPathValid(input)) {
		console.log(
			chalk.red(
				"❌ Invalid input path. Use a .yaml/.yml/.json file that exists.",
			),
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
					p.cancel("Aborted by user");
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
    // Subcommands
    if (argv[0] === "version") {
        await printVersion();
        process.exit(0);
    }
    if (argv[0] === "help") {
        usage();
        process.exit(0);
    }

    const args = parseArgs(argv);

    if (args.version) {
        await printVersion();
        process.exit(0);
    }

	if (args.help) {
		usage();
		process.exit(0);
	}

	// Early validation for non-interactive mode
	if (args.input && !isSpecPathValid(args.input)) {
		console.log(
			chalk.red(
				"❌ Invalid input path. Use a .yaml/.yml/.json file that exists.",
			),
		);
		process.exit(1);
	}

	// Welcome banner
	console.log(
		boxen(chalk.cyanBright("🤖 OpenAPI MCP Generator"), {
			padding: 1,
			borderColor: "cyan",
			borderStyle: "round",
		}),
	);

	consola.info("Welcome!");
	await p.intro(chalk.green("Let's generate your MCP server!"));

	const collected = await collectInputs(args);
	if (!collected) process.exit(1);
	const { input, out, name, runtime } = collected;

	// Enhanced spinner with @clack/prompts
	const spinner = p.spinner();
	spinner.start("Parsing OpenAPI specification...");

	try {
		const generator = new OpenAPIMcpGenerator({
			debug: false,
		});

		spinner.message("Generating MCP server code...");
		const outputPath = resolve(process.cwd(), out, "mcp-server", "index.ts");
		await generator.generateFromOpenAPI(input, outputPath, name, runtime);

		spinner.stop("✅ Generation complete!");

		console.log(
			boxen(
				`${chalk.bold("Created server:")} ${chalk.cyanBright(name)}\n` +
					`${chalk.bold("Output:")} ${chalk.blue(resolve(process.cwd(), out))}\n\n` +
					`${chalk.bold("Quick start:")}\n` +
					`${chalk.gray("cd")} ${chalk.yellow(out)} ${chalk.gray("&&")} ${chalk.yellow("bun run start")}\n` +
					`${chalk.gray("Or run directly:")} ${chalk.yellow(`bun --bun ${outputPath}`)}`,
				{
					padding: 1,
					borderColor: "green",
					borderStyle: "round",
				},
			),
		);

		consola.success(`Project "${name}" created successfully!`);
		p.outro(chalk.green("🎉 All set!"));
	} catch (err) {
		spinner.stop("❌ Generation failed");
		consola.error(
			`Generation failed: ${err instanceof Error ? err.message : String(err)}`,
		);
		p.cancel(chalk.red("Exiting"));
		process.exit(1);
	}
}

if (import.meta.main) {
	// Run only when executed directly, not during tests/imports
	// eslint-disable-next-line @typescript-eslint/no-floating-promises
	main();
}
