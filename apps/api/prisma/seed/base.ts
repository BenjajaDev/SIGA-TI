import { fileURLToPath } from 'node:url';
import { PRIORITIES } from '@siga/shared';
import type { PasswordHasher } from '../../src/domain/ports/security';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/prisma-client';
import { Argon2PasswordHasher } from '../../src/infrastructure/security/argon2-password-hasher';
import { CATEGORIES, emailOf, SLA_HOURS, USERS } from './data';
import { seedEnvSchema } from './env';

export const seedBase = async (
  db: Database,
  hasher: PasswordHasher,
  defaultPassword: string,
): Promise<void> => {
  for (const priority of PRIORITIES) {
    await db.slaPolicy.upsert({
      where: { priority },
      create: { priority, resolutionHours: SLA_HOURS[priority] },
      update: { resolutionHours: SLA_HOURS[priority] },
    });
  }

  for (const category of CATEGORIES) {
    await db.category.upsert({
      where: { name: category.name },
      create: { ...category },
      update: { description: category.description },
    });
  }

  const passwordHash = await hasher.hash(defaultPassword);
  for (const user of USERS) {
    const email = emailOf(user.localPart);
    await db.user.upsert({
      where: { email },
      create: { email, fullName: user.fullName, role: user.role, passwordHash },
      update: { fullName: user.fullName, role: user.role, passwordHash },
    });
  }
};

const main = async (): Promise<void> => {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `- ${i.path.join('.')}: ${i.message}`);
    throw new Error(
      `Las semillas no pueden ejecutarse (no corren en producción):\n${issues.join('\n')}`,
    );
  }
  const db = createDatabase(parsed.data.DATABASE_URL);
  try {
    await seedBase(db, new Argon2PasswordHasher(), parsed.data.SEED_DEFAULT_PASSWORD);
  } finally {
    await db.$disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
