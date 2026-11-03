import type { RefreshTokenRecord } from '../entities';

export interface RefreshTokenRepository {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void>;
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  /** Revoca el token solo si seguía vigente; false si otro proceso ya lo había revocado. */
  revoke(id: string, at: Date): Promise<boolean>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
}
