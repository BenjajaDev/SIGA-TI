import type { UpdateBrandingRequest } from '@siga/shared';
import type { BrandingRecord, BrandingRepository } from '../../../domain/ports/branding-repository';
import type { Database } from '../prisma-client';

const SINGLETON_ID = 'default';

export class PrismaBrandingRepository implements BrandingRepository {
  constructor(private readonly db: Database) {}

  async get(): Promise<BrandingRecord | null> {
    const row = await this.db.brandSettings.findUnique({ where: { id: SINGLETON_ID } });
    return row;
  }

  save(data: UpdateBrandingRequest): Promise<BrandingRecord> {
    return this.db.brandSettings.upsert({
      where: { id: SINGLETON_ID },
      create: { id: SINGLETON_ID, ...data },
      update: data,
    });
  }
}
