import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client';

export type Database = PrismaClient;

export const createDatabase = (connectionString: string): Database =>
  new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
