import type { Express } from 'express';
import request from 'supertest';
import { loadEnv, type Env } from '../../src/config/env';
import type { Clock } from '../../src/domain/ports/security';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/prisma-client';
import { Argon2PasswordHasher } from '../../src/infrastructure/security/argon2-password-hasher';
import { buildApp } from '../../src/main';
import { seedBase } from '../../prisma/seed/base';
import { emailOf } from '../../prisma/seed/data';

export const TEST_PASSWORD = 'Test-Password-2026!';

export class MutableClock implements Clock {
  constructor(private current: Date = new Date()) {}

  now(): Date {
    return new Date(this.current);
  }

  set(date: Date): void {
    this.current = date;
  }

  advanceHours(hours: number): void {
    this.current = new Date(this.current.getTime() + hours * 3_600_000);
  }
}

const fastHasher = new Argon2PasswordHasher({ memoryCost: 1024, timeCost: 1, parallelism: 1 });

export interface TestContext {
  readonly env: Env;
  readonly db: Database;
  readonly app: Express;
  readonly clock: MutableClock;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export const createTestContext = (
  envOverrides: Readonly<Record<string, string>> = {},
): TestContext => {
  const env = loadEnv({
    ...process.env,
    NODE_ENV: 'test',
    DATABASE_URL: process.env.TEST_DATABASE_URL,
    RATE_LIMIT_LOGIN_MAX: '100000',
    ...envOverrides,
  });
  const db = createDatabase(env.DATABASE_URL);
  const clock = new MutableClock();
  const app = buildApp(env, db, { clock, hasher: fastHasher });

  const reset = async (): Promise<void> => {
    await db.$executeRawUnsafe(
      'TRUNCATE TABLE comments, ticket_events, tickets, refresh_tokens, users, categories, sla_policies, brand_settings RESTART IDENTITY CASCADE',
    );
    await seedBase(db, fastHasher, TEST_PASSWORD);
    clock.set(new Date());
  };

  return { env, db, app, clock, reset, close: () => db.$disconnect() };
};

export type SeedUserKey =
  'admin' | 'supervisor' | 'tecnico1' | 'tecnico2' | 'tecnico3' | 'solicitante1' | 'solicitante2';

export const loginAs = async (app: Express, key: SeedUserKey): Promise<string> => {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: emailOf(key), password: TEST_PASSWORD });
  return (response.body as { accessToken: string }).accessToken;
};

export const userIdOf = async (db: Database, key: SeedUserKey): Promise<string> =>
  (await db.user.findUniqueOrThrow({ where: { email: emailOf(key) } })).id;

export const firstCategoryId = async (db: Database): Promise<string> =>
  (await db.category.findFirstOrThrow({ orderBy: { name: 'asc' } })).id;
