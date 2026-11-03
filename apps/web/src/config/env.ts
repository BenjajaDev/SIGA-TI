import { z } from 'zod';

const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1).default('/api/v1'),
});

export const webEnv = webEnvSchema.parse(import.meta.env);
