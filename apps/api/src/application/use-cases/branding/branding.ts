import { DEFAULT_BRANDING, type UpdateBrandingRequest } from '@siga/shared';
import type { Actor } from '../../../domain/entities';
import type { BrandingRecord, BrandingRepository } from '../../../domain/ports/branding-repository';
import { assertAdmin } from '../../../domain/services/ticket-access-policy';

export interface BrandingView extends UpdateBrandingRequest {
  readonly updatedAt: Date | null;
}

export class GetBrandingUseCase {
  constructor(private readonly branding: BrandingRepository) {}

  async execute(): Promise<BrandingView> {
    const stored = await this.branding.get();
    return stored ?? { ...DEFAULT_BRANDING, updatedAt: null };
  }
}

export class UpdateBrandingUseCase {
  constructor(private readonly branding: BrandingRepository) {}

  execute(actor: Actor, data: UpdateBrandingRequest): Promise<BrandingRecord> {
    assertAdmin(actor);
    return this.branding.save(data);
  }
}
