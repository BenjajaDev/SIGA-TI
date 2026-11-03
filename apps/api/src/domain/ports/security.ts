import type { Role } from '@siga/shared';

export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  verify(hash: string, plain: string): Promise<boolean>;
}

export interface AccessTokenClaims {
  readonly userId: string;
  readonly role: Role;
}

export interface TokenService {
  signAccessToken(claims: AccessTokenClaims): Promise<string>;
  /** Devuelve null si el token es inválido o expiró. */
  verifyAccessToken(token: string): Promise<AccessTokenClaims | null>;
  generateRefreshToken(): string;
  hashRefreshToken(token: string): string;
}

export interface Clock {
  now(): Date;
}
