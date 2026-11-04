import { z } from 'zod';

const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api/v1'),
  VITE_SHOW_DEMO_ACCOUNTS: z.stringbool().default(false),
  VITE_DEMO_PASSWORD: z.string().min(1).optional(),
});

export const webEnv = webEnvSchema.parse(import.meta.env);

export const demoAccountsEnabled =
  webEnv.VITE_SHOW_DEMO_ACCOUNTS && webEnv.VITE_DEMO_PASSWORD !== undefined;
