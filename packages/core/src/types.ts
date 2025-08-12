/**
 * OpenAPI Schema Definition
 * Represents the structure of an OpenAPI schema object
 */
export interface OpenAPISchema {
  type?: string;
  format?: string;
  enum?: string[];
  items?: OpenAPISchema;
  properties?: Record<string, OpenAPISchema>;
  required?: string[];
  minimum?: number;
  maximum?: number;
  description?: string;
  $ref?: string;
}

/**
 * OpenAPI Parameter Definition
 * Represents a parameter in an OpenAPI operation
 */
export interface OpenAPIParameter {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required?: boolean;
  schema?: OpenAPISchema;
  description?: string;
}

/**
 * OpenAPI Request Body Definition
 * Represents the request body of an OpenAPI operation
 */
export interface OpenAPIRequestBody {
  content: Record<string, { schema?: OpenAPISchema }>;
  required?: boolean;
  description?: string;
}

/**
 * OpenAPI Response Definition
 * Represents a response in an OpenAPI operation
 */
export interface OpenAPIResponse {
  description: string;
  content?: Record<string, { schema?: OpenAPISchema }>;
  headers?: Record<string, { schema?: OpenAPISchema }>;
}

/**
 * OpenAPI Operation Definition
 * Represents a single OpenAPI operation (GET, POST, etc.)
 */
export interface OpenAPIOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  parameters?: OpenAPIParameter[];
  requestBody?: OpenAPIRequestBody;
  responses: Record<string, OpenAPIResponse>;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
}

/**
 * OpenAPI Path Definition
 * Represents a path item with multiple HTTP methods
 */
export interface OpenAPIPath {
  [method: string]: OpenAPIOperation;
}

/**
 * OpenAPI Info Definition
 * Represents the info section of an OpenAPI document
 */
export interface OpenAPIInfo {
  title?: string;
  version?: string;
  description?: string;
  termsOfService?: string;
  contact?: {
    name?: string;
    url?: string;
    email?: string;
  };
  license?: {
    name: string;
    url?: string;
  };
}

/**
 * OpenAPI Components Definition
 * Represents the components section of an OpenAPI document
 */
export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema>;
  responses?: Record<string, OpenAPIResponse>;
  parameters?: Record<string, OpenAPIParameter>;
  requestBodies?: Record<string, OpenAPIRequestBody>;
  headers?: Record<string, OpenAPISchema>;
  securitySchemes?: Record<string, any>;
}

/**
 * Complete OpenAPI Document Definition
 * Represents a full OpenAPI 3.x specification document
 */
export interface OpenAPIDocument {
  openapi: string;
  info?: OpenAPIInfo;
  servers?: Array<{
    url: string;
    description?: string;
  }>;
  paths?: Record<string, OpenAPIPath>;
  components?: OpenAPIComponents;
  security?: Array<Record<string, string[]>>;
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

/**
 * Generator Configuration Options
 */
export interface GeneratorOptions {
  /** Enable debug logging */
  debug?: boolean;
  /** Skip Biome formatting */
  skipFormatting?: boolean;
  /** Custom indentation (spaces) */
  indentSize?: 2 | 4 | 8;
  /** Quote style preference */
  quoteStyle?: 'single' | 'double';
  /** Use trailing commas */
  trailingCommas?: boolean;
}