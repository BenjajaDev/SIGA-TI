import { InvalidCredentialsError } from '../../../domain/errors';
import type { IdentityProvider } from '../../../domain/ports/identity-provider';
import type { UserRepository } from '../../../domain/ports/user-repository';
import type { Clock } from '../../../domain/ports/security';
import type { IssuedSession, SessionIssuer } from './session-issuer';

export interface LoginInput {
  readonly email: string;
  readonly password: string;
}

export class LoginUseCase {
  constructor(
    private readonly identity: IdentityProvider,
    private readonly users: UserRepository,
    private readonly sessions: SessionIssuer,
    private readonly clock: Clock,
  ) {}

  async execute(input: LoginInput): Promise<IssuedSession> {
    const identity = await this.identity.authenticate(input.email, input.password);
    if (identity === null) throw new InvalidCredentialsError();

    const user = await this.users.findByEmail(identity.email);
    if (user?.isActive !== true) throw new InvalidCredentialsError();

    await this.users.touchLastLogin(user.id, this.clock.now());
    return this.sessions.issue(user);
  }
}
