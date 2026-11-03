import type { User } from '../../../domain/entities';
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository';
import type { Clock, TokenService } from '../../../domain/ports/security';

export interface SessionPolicy {
  readonly accessTtlSeconds: number;
  readonly refreshTtlMs: number;
}

export interface IssuedSession {
  readonly user: User;
  readonly accessToken: string;
  readonly expiresIn: number;
  readonly refreshToken: string;
  readonly refreshExpiresAt: Date;
}

export class SessionIssuer {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly clock: Clock,
    private readonly policy: SessionPolicy,
  ) {}

  async issue(user: User): Promise<IssuedSession> {
    const accessToken = await this.tokens.signAccessToken({ userId: user.id, role: user.role });
    const refreshToken = this.tokens.generateRefreshToken();
    const refreshExpiresAt = new Date(this.clock.now().getTime() + this.policy.refreshTtlMs);
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: this.tokens.hashRefreshToken(refreshToken),
      expiresAt: refreshExpiresAt,
    });
    return {
      user,
      accessToken,
      expiresIn: this.policy.accessTtlSeconds,
      refreshToken,
      refreshExpiresAt,
    };
  }
}
