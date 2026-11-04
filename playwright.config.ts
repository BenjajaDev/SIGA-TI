import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

if (existsSync('.env')) process.loadEnvFile('.env');

const API_PORT = 3100;
const WEB_PORT = 5174;
const WEB_URL = `http://localhost:${String(WEB_PORT)}`;

const required = (name: string): string => {
  const value = process.env[name];
  if (value === undefined || value === '') throw new Error(`Defina ${name} (ver .env.example)`);
  return value;
};

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  reporter: [['list']],
  use: {
    baseURL: WEB_URL,
    locale: 'es-CL',
    timezoneId: 'America/Santiago',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'pnpm --filter @siga/api exec tsx src/server.ts',
      url: `http://localhost:${String(API_PORT)}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 60_000,
      env: {
        NODE_ENV: 'test',
        PORT: String(API_PORT),
        DATABASE_URL: required('TEST_DATABASE_URL'),
        CORS_ALLOWED_ORIGINS: WEB_URL,
        JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
        RATE_LIMIT_LOGIN_MAX: '1000',
      },
    },
    {
      command: `pnpm --filter @siga/web exec vite --port ${String(WEB_PORT)} --strictPort`,
      url: WEB_URL,
      reuseExistingServer: false,
      timeout: 60_000,
      env: { VITE_DEV_API_PROXY_TARGET: `http://localhost:${String(API_PORT)}` },
    },
  ],
});
