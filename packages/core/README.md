# @workspace/core

Advanced generator library for creating MCP servers from OpenAPI specifications using AST manipulation.

## Features
- **AST-based Code Generation**: Uses `ts-morph` for precise TypeScript code generation
- **OpenAPI Parsing**: Built on `@scalar/openapi-parser` with validation and dereferencing
- **Type-Safe**: Full TypeScript support with Zod schema validation
- **CamelCase Naming**: Converts OpenAPI operations to camelCase method names
- **Biome Formatting**: Automatic code formatting with Biome v2 integration
- **Comprehensive Mapping**: Maps OpenAPI paths, parameters, request bodies, and responses to MCP tools

## Core API

### OpenAPIMcpGenerator Class
The main generator class that converts OpenAPI specifications to MCP servers.

```ts
import { OpenAPIMcpGenerator, type GeneratorOptions } from '@workspace/core';

// With default options
const generator = new OpenAPIMcpGenerator();
await generator.generateFromOpenAPI(
  './petstore.yaml',    // OpenAPI file path (JSON or YAML)
  './server.ts',        // Output file path
  'petstore-mcp'        // Server name
);

// With custom options
const customGenerator = new OpenAPIMcpGenerator({
  debug: true,           // Enable debug logging
  indentSize: 2,         // Use 2-space indentation
  quoteStyle: 'double',  // Use double quotes
  trailingCommas: false, // Disable trailing commas
  skipFormatting: true   // Skip Biome formatting
});
```

### Type Exports
All TypeScript interfaces are available for import:

```ts
import type {
  // Core OpenAPI types
  OpenAPISchema,
  OpenAPIParameter,
  OpenAPIOperation,
  OpenAPIDocument,
  
  // Generator configuration
  GeneratorOptions,
  
  // Additional types
  OpenAPIRequestBody,
  OpenAPIResponse,
  OpenAPIPath,
  OpenAPIInfo,
  OpenAPIComponents
} from '@workspace/core';
```

### Generator Options
Configure the generator behavior with `GeneratorOptions`:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `debug` | `boolean` | `false` | Enable debug logging |
| `skipFormatting` | `boolean` | `false` | Skip Biome formatting step |
| `indentSize` | `2 \| 4 \| 8` | `4` | Number of spaces for indentation |
| `quoteStyle` | `'single' \| 'double'` | `'single'` | Quote style for strings |
| `trailingCommas` | `boolean` | `true` | Use trailing commas |

## Generated Server Features

The generated MCP server includes:
- **Individual MCP Tools**: Each OpenAPI operation becomes an MCP tool
- **Zod Validation**: Input parameters validated with Zod schemas
- **Type Safety**: Full TypeScript support with proper interfaces
- **Path Parameters**: Automatic URL building with path parameter substitution
- **Query Parameters**: Support for query string parameters
- **Request Bodies**: JSON request body handling
- **Error Handling**: Comprehensive HTTP error handling
- **Environment Variables**: Configurable base URL via `API_BASE_URL`

## Example Output

Given a simple OpenAPI spec, the generator creates:

```ts
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

const server = new McpServer({
  name: 'petstore-mcp',
  version: '1.0.0'
});

server.registerTool(
  'getPetById',
  {
    title: 'Find pet by ID',
    description: 'Returns a single pet',
    inputSchema: {
      petId: z.string().describe('Path parameter: petId')
    }
  },
  async (params) => {
    // HTTP request implementation with error handling
  }
);
```

## Development

- **Build**: `bun run build` - Creates dist/ with JS and TypeScript declarations
- **Typecheck**: `bun run typecheck` - Validates TypeScript without emitting
- **Test**: `bun run test` - Runs test suite
- **Lint**: `bun run lint` - Code quality checks with Biome

## Package Structure

```
src/
├── index.ts      # Main exports (class + types)
├── generator.ts  # OpenAPIMcpGenerator implementation
└── types.ts      # TypeScript interfaces and types
```

## Technical Details

- **AST Generation**: Uses `ts-morph` for precise TypeScript code generation
- **OpenAPI Parsing**: Built on `@scalar/openapi-parser` with validation and dereferencing
- **Type Safety**: Comprehensive TypeScript interfaces separated into `types.ts`
- **Configurable**: Flexible generator options for different coding styles
- **Formatting**: Optional Biome integration for consistent code style
- **Modular Design**: Clean separation between generator logic and type definitions
