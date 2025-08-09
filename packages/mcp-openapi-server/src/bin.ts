import { start } from "./index.js";

async function main() {
  await start();
}

if ((import.meta as any).main) {
  main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
}

