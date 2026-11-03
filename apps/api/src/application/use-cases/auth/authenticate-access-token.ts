import type { User } from '../../../domain/entities';
import { UnauthenticatedError } from '../../../domain/errors';
import type { TokenService } from '../../../domain/ports/security';
import type { UserRepository } from '../../../domain/ports/user-repository';

export class AuthenticateAccessTokenUseCase {
  constructor(
    private readonly tokens: TokenService,
    private readonly users: UserRepository,
  ) {}

  async execute(accessToken: string): Promise<User> {
    const claims = await this.tokens.verifyAccessToken(accessToken);
    if (claims === null) throw new UnauthenticatedError('Sesión inválida o expirada');
    const user = await this.users.findById(claims.userId);
    if (user?.isActive !== true) throw new UnauthenticatedError('Sesión inválida o expirada');
    return user;
  }
}
