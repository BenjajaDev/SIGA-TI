import { UnauthenticatedError } from '../../../domain/errors';
import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository';
import type { Clock, TokenService } from '../../../domain/ports/security';
import type { UserRepository } from '../../../domain/ports/user-repository';
import type { IssuedSession, SessionIssuer } from './session-issuer';

export class RefreshSessionUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly users: UserRepository,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string): Promise<IssuedSession> {
    const now = this.clock.now();
    const record = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(refreshToken));
    if (record === null) throw new UnauthenticatedError('Sesión inválida');

    if (record.revokedAt !== null) {
      await this.refreshTokens.revokeAllForUser(record.userId, now);
      throw new UnauthenticatedError('Sesión inválida');
    }
    if (record.expiresAt.getTime() <= now.getTime()) {
      throw new UnauthenticatedError('La sesión expiró');
    }

    const won = await this.refreshTokens.revoke(record.id, now);
    if (!won) {
      await this.refreshTokens.revokeAllForUser(record.userId, now);
      throw new UnauthenticatedError('Sesión inválida');
    }

    const user = await this.users.findById(record.userId);
    if (user?.isActive !== true) throw new UnauthenticatedError('Sesión inválida');
    return this.sessions.issue(user);
  }
}
