import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve(process.cwd(), "dist/index.js");
const code = readFileSync(out, "utf8");
if (!code.startsWith("#!/")) {
  // Use node for wider compatibility when invoked as a binary
  writeFileSync(out, `#!/usr/bin/env node\n${code}`);
}

