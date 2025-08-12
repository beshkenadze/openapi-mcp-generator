import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { validate, dereference } from '@scalar/openapi-parser';

/**
 * Converts a string to slug format (lowercase, alphanumeric, dashes)
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Reads OpenAPI specification title and suggests a server name
 */
export async function suggestNameFromSpec(filePath: string): Promise<string> {
  try {
    const fullPath = resolve(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf8');
    
    const { schema } = await dereference(content);
    
    if (schema?.info?.title) {
      return slugify(schema.info.title + '-mcp');
    }
    
    // Fallback to filename
    const filename = filePath.split('/').pop()?.split('.')[0] || 'openapi';
    return slugify(filename + '-mcp');
  } catch (error) {
    console.warn('Failed to read spec title:', error instanceof Error ? error.message : String(error));
    // Fallback to filename
    const filename = filePath.split('/').pop()?.split('.')[0] || 'openapi';
    return slugify(filename + '-mcp');
  }
}

/**
 * Reads title from OpenAPI specification
 */
export async function readTitleFromSpec(filePath: string): Promise<string | null> {
  try {
    const fullPath = resolve(process.cwd(), filePath);
    const content = readFileSync(fullPath, 'utf8');
    
    const { schema } = await dereference(content);
    return schema?.info?.title || null;
  } catch {
    return null;
  }
}