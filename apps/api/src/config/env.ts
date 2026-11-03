import { z } from 'zod';

const PLACEHOLDER_SECRET_PREFIX = 'dev-only-change-me';

const isHttpOrigin = (value: string): boolean => {
  if (!URL.canParse(value)) return false;
  const url = new URL(value);
  return (url.protocol === 'http:' || url.protocol === 'https:') && url.origin === value;
};

const origin = z
  .string()
  .refine(isHttpOrigin, 'Debe ser un origen http(s) sin ruta ni barra final');

const originList = z
  .string()
  .transform((raw) =>
    raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  )
  .pipe(z.array(origin).min(1));

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
    CORS_ALLOWED_ORIGINS: originList,
    JWT_ACCESS_SECRET: z.string().min(32),
    COOKIE_SECURE: z.stringbool().default(false),
    RATE_LIMIT_LOGIN_MAX: z.coerce.number().int().min(1).default(10),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    if (!env.COOKIE_SECURE) {
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'Debe ser true en producción',
      });
    }
    if (env.JWT_ACCESS_SECRET.startsWith(PLACEHOLDER_SECRET_PREFIX)) {
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'No use el valor de ejemplo en producción',
      });
    }
  });

export type Env = Readonly<z.infer<typeof envSchema>>;

export class EnvValidationError extends Error {
  constructor(readonly issues: readonly string[]) {
    super(`Variables de entorno inválidas:\n${issues.join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

export const loadEnv = (source: Readonly<Record<string, string | undefined>>): Env => {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((issue) => `- ${issue.path.join('.')}: ${issue.message}`),
    );
  }
  return Object.freeze(result.data);
};
