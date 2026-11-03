import { brandingSchema, type Branding, type UpdateBrandingRequest } from '@siga/shared';
import type { HttpClient } from './http-client';

export interface BrandingService {
  get(): Promise<Branding>;
  update(body: UpdateBrandingRequest): Promise<Branding>;
}

export const createBrandingService = (client: HttpClient): BrandingService => ({
  get: () => client.get('/branding', brandingSchema),
  update: (body) => client.put('/branding', brandingSchema, body),
});
