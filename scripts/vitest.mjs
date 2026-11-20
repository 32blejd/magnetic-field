// Runs Vitest from a working directory with an uppercase drive letter.
// On Windows the cwd can be "c:\…" (e.g. a VS Code terminal) while Vite resolves files as "C:\…"; Vitest then loads
// two copies of itself and every test fails with "Cannot read properties of undefined (reading 'config')".
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const fixed = process.cwd().replace(/^[a-z]:/, d => d.toUpperCase());
if (fixed !== process.cwd()) process.chdir(fixed);

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('vitest/package.json', { paths: [fixed] });
await import(pathToFileURL(pkgPath.replace(/package\.json$/, 'vitest.mjs')).href);
