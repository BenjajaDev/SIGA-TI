import { createHash, randomBytes } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { roleSchema } from '@siga/shared';
import type { AccessTokenClaims, TokenService } from '../../domain/ports/security';

const ALGORITHM = 'HS256';
const REFRESH_TOKEN_BYTES = 32;

export class JoseTokenService implements TokenService {
  private readonly key: Uint8Array;

  constructor(
    secret: string,
    private readonly accessTtlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  signAccessToken(claims: AccessTokenClaims): Promise<string> {
    return new SignJWT({ role: claims.role })
      .setProtectedHeader({ alg: ALGORITHM })
      .setSubject(claims.userId)
      .setJti(randomBytes(16).toString('hex'))
      .setIssuedAt()
      .setExpirationTime(`${this.accessTtlSeconds}s`)
      .sign(this.key);
  }

  async verifyAccessToken(token: string): Promise<AccessTokenClaims | null> {
    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: [ALGORITHM] });
      const role = roleSchema.safeParse(payload.role);
      if (payload.sub === undefined || !role.success) return null;
      return { userId: payload.sub, role: role.data };
    } catch {
      return null;
    }
  }

  generateRefreshToken(): string {
    return randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
  }

  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
