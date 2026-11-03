import type { RefreshTokenRepository } from '../../../domain/ports/refresh-token-repository';
import type { Clock, TokenService } from '../../../domain/ports/security';

export class LogoutUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    private readonly clock: Clock,
  ) {}

  async execute(refreshToken: string | undefined): Promise<void> {
    if (refreshToken === undefined) return;
    const record = await this.refreshTokens.findByHash(this.tokens.hashRefreshToken(refreshToken));
    if (record !== null) await this.refreshTokens.revoke(record.id, this.clock.now());
  }
}
