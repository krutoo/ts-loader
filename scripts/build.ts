/**
 * This script will build package.
 */
import { exec } from 'node:child_process';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

// clean dist folder
await fs.rm('./dist', { recursive: true, force: true });

// compile esm files
await execAsync('npx tsc -p tsconfig.build.json');

// resolve paths
await execAsync('tsc-alias -p tsconfig.build.json');

// format (for reduce package size by replacing indent from 4 to 2)
await execAsync(
  'npx prettier "dist/**/*.js" --write --log-level=silent --ignore-path=./.nonexistent',
);
