import { EnvValidationError, loadEnv, type Env } from './config/env';
import { createLogger } from './infrastructure/logging/logger';
import { createDatabase } from './infrastructure/persistence/prisma-client';
import { buildApp } from './main';

const loadEnvOrExit = (): Env => {
  try {
    return loadEnv(process.env);
  } catch (error) {
    if (!(error instanceof EnvValidationError)) throw error;
    process.stderr.write(`${error.message}\n`);
    return process.exit(1);
  }
};

const env = loadEnvOrExit();
const logger = createLogger(env);
const db = createDatabase(env.DATABASE_URL);
const app = buildApp(env, db, { logger });

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'SIGA-TI API escuchando');
});

const shutdown = (signal: string): void => {
  logger.info({ signal }, 'Cerrando servidor');
  server.close(() => {
    void db.$disconnect().finally(() => process.exit(0));
  });
};
process.on('SIGINT', () => {
  shutdown('SIGINT');
});
process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
