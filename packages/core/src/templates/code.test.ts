import { describe, test, expect } from "bun:test";
import { code, joinCode } from "./code.js";

describe("code tagged template", () => {
	test("dedents and trims correctly", () => {
		const name = "World";
		const out = code`
      function greet() {
        return 'Hello, ${name}!';
      }
    `;
		expect(out.startsWith("\n")).toBe(false);
		expect(out.endsWith("\n")).toBe(true);
		expect(out).toContain("return 'Hello, World!';");
		// No extra leading indentation on first code line
		const firstLine = out.split("\n")[0];
		expect(firstLine).toBe("function greet() {");
	});

	test("joinCode filters falsy and joins with separator", () => {
		const part1 = code`const a = 1;`;
		const part2 = "";
		const part3 = code`const b = 2;`;
		const out = joinCode([part1, false, part2, null, part3], "\n");
		expect(out).toBe("const a = 1;\nconst b = 2;");
	});
});
