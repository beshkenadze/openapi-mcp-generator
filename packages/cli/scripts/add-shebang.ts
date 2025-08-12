#!/usr/bin/env bun
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const distPath = resolve(import.meta.dir, '../dist/index.js');
const content = readFileSync(distPath, 'utf8');

if (!content.startsWith('#!/usr/bin/env node')) {
  const newContent = '#!/usr/bin/env node\n' + content;
  writeFileSync(distPath, newContent);
  console.log('✅ Added shebang to CLI binary');
} else {
  console.log('✅ Shebang already exists');
}