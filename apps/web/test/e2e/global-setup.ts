import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const apiRequire = createRequire(new URL('../../../api/package.json', import.meta.url));

export default function setup(): void {
  const envFile = fileURLToPath(new URL('../../../../.env', import.meta.url));
  if (existsSync(envFile)) process.loadEnvFile(envFile);

  if (process.env.DATABASE_URL === undefined || process.env.SEED_DEFAULT_PASSWORD === undefined) {
    throw new Error('Defina DATABASE_URL y SEED_DEFAULT_PASSWORD en .env para las pruebas E2E.');
  }

  const apiDirectory = fileURLToPath(new URL('../../../api', import.meta.url));
  execFileSync(
    process.execPath,
    [apiRequire.resolve('prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: apiDirectory,
      env: process.env,
      stdio: 'inherit',
    },
  );
  execFileSync(
    process.execPath,
    [apiRequire.resolve('tsx/cli'), '--env-file=../../.env', 'prisma/seed/demo.ts'],
    {
      cwd: apiDirectory,
      env: process.env,
      stdio: 'inherit',
    },
  );
}
