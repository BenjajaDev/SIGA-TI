import { Argon2PasswordHasher } from '../../src/infrastructure/security/argon2-password-hasher';
import { createDatabase } from '../../src/infrastructure/persistence/prisma-client';
import { seedBase } from './base';
import { seedEnvSchema } from './env';

const parsed = seedEnvSchema.safeParse(process.env);
if (!parsed.success)
  throw new Error('Reinicio de BD no permitido: requiere NODE_ENV=test|development.');

const db = createDatabase(parsed.data.DATABASE_URL);
try {
  await db.$executeRawUnsafe(
    'TRUNCATE TABLE comments, ticket_events, tickets, refresh_tokens, users, categories, sla_policies, brand_settings RESTART IDENTITY CASCADE',
  );
  await seedBase(db, new Argon2PasswordHasher(), parsed.data.SEED_DEFAULT_PASSWORD);
} finally {
  await db.$disconnect();
}
