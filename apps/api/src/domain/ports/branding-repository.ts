import type { UpdateBrandingRequest } from '@siga/shared';

export interface BrandingRecord extends UpdateBrandingRequest {
  readonly updatedAt: Date;
}

export interface BrandingRepository {
  get(): Promise<BrandingRecord | null>;
  save(data: UpdateBrandingRequest): Promise<BrandingRecord>;
}
