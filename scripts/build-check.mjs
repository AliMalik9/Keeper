/**
 * Type/compile check that is safe to run while `npm run dev` is up.
 *
 * A plain `next build` writes into .next — the same directory the dev server is
 * serving from — which corrupts it mid-flight ("Cannot find module './796.js'")
 * and takes every page down until dev is restarted. This builds into
 * .next-check instead and then throws it away.
 */
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = '.next-check';

const child = spawn('next', ['build'], {
  cwd: ROOT,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, NEXT_DIST_DIR: DIST },
});

child.on('exit', (code) => {
  rmSync(resolve(ROOT, DIST), { recursive: true, force: true });
  process.exit(code ?? 1);
});
