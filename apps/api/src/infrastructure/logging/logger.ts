import { pino, type Logger } from 'pino';
import type { Env } from '../../config/env';

export const REDACTED_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  '*.password',
  '*.passwordHash',
  '*.accessToken',
  '*.refreshToken',
];

export const createLogger = (env: Pick<Env, 'LOG_LEVEL' | 'NODE_ENV'>): Logger =>
  pino({
    level: env.NODE_ENV === 'test' ? 'silent' : env.LOG_LEVEL,
    redact: { paths: REDACTED_PATHS, censor: '[REDACTED]' },
  });
