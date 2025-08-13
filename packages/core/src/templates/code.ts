// Lightweight tagged template for code generation with dedent and trimming
export function code(
	strings: TemplateStringsArray,
	...values: unknown[]
): string {
	// Interleave strings and values
	let raw = "";
	for (let i = 0; i < strings.length; i++) {
		raw += strings[i];
		if (i < values.length) raw += valueToString(values[i]);
	}

	// Normalize newlines
	raw = raw.replace(/\r\n?/g, "\n");

	// Trim leading/trailing blank lines
	raw = raw.replace(/^\n+/, "").replace(/\n+$/, "\n");

	// Dedent based on minimum indentation of non-empty lines
	const lines = raw.split("\n");
	const indents = lines
		.filter((l) => l.trim().length > 0)
		.map((l) => l.match(/^\s*/)?.[0].length ?? 0);
	const minIndent = indents.length ? Math.min(...indents) : 0;

	if (minIndent > 0) {
		raw = lines.map((l) => l.slice(Math.min(minIndent, l.length))).join("\n");
	}

	return raw;
}

export function joinCode(
	parts: Array<string | false | null | undefined>,
	sep = "\n",
): string {
	return parts
		.filter((p): p is string => typeof p === "string" && p.length > 0)
		.join(sep);
}

function valueToString(v: unknown): string {
	if (v === undefined || v === null || v === false) return "";
	if (Array.isArray(v)) return v.map(valueToString).join("");
	if (typeof v === "object" && v !== null && "toString" in (v as object))
		return String(v);
	return String(v);
}

export function escapeSingleQuotes(str: string): string {
	return str.replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
}
