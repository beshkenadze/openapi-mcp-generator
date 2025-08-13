// Main generator class
export { OpenAPIMcpGenerator } from "./generator.js";

// Utility functions
export { slugify, suggestNameFromSpec, readTitleFromSpec } from "./utils.js";
export {
	code,
	joinCode,
	escapeSingleQuotes,
	renderServerHeader,
	renderServerInit,
	renderRegisterTool,
	renderHelpers,
} from "./templates/index.js";

// Type definitions
export type {
	OpenAPISchema,
	OpenAPIParameter,
	OpenAPIRequestBody,
	OpenAPIResponse,
	OpenAPIOperation,
	OpenAPIPath,
	OpenAPIInfo,
	OpenAPIComponents,
	OpenAPIDocument,
	GeneratorOptions,
} from "./types.js";
