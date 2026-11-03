import { z } from 'zod';

export const seedEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test']),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  SEED_DEFAULT_PASSWORD: z.string().min(12),
});

export type SeedEnv = z.infer<typeof seedEnvSchema>;
