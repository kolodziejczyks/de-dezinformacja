import { copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const target = join(root, 'src/environments/environment.ts');
const example = join(root, 'src/environments/environment.example.ts');

if (!existsSync(target)) {
  copyFileSync(example, target);
}
