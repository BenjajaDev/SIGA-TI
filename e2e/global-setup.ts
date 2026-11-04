import { execFileSync } from 'node:child_process';

export default function globalSetup(): void {
  const databaseUrl = process.env.TEST_DATABASE_URL;
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (databaseUrl === undefined || password === undefined) {
    throw new Error('Defina TEST_DATABASE_URL y SEED_DEFAULT_PASSWORD (ver .env.example)');
  }
  const env = {
    ...process.env,
    DATABASE_URL: databaseUrl,
    NODE_ENV: 'test',
    SEED_DEFAULT_PASSWORD: password,
  };
  execFileSync('pnpm', ['--filter', '@siga/api', 'exec', 'prisma', 'migrate', 'deploy'], {
    env,
    stdio: 'pipe',
  });
  execFileSync('pnpm', ['--filter', '@siga/api', 'exec', 'tsx', 'prisma/seed/e2e-reset.ts'], {
    env,
    stdio: 'pipe',
  });
}
