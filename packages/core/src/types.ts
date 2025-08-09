export type GenerateOptions = {
  name?: string;
  outDir: string;
  runtime?: "bun" | "node";
};

export type OpenAPISource = {
  path: string;
  format?: "json" | "yaml";
};

