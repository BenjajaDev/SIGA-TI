import type { Database } from '../persistence/prisma-client';
import type { ExternalIdentity, IdentityProvider } from '../../domain/ports/identity-provider';
import type { PasswordHasher } from '../../domain/ports/security';

/**
 * Directorio institucional simulado: valida contra las credenciales ficticias de la tabla `users`.
 * Se reemplaza por un adaptador OIDC sin tocar casos de uso.
 */
export class SimulatedIdentityProvider implements IdentityProvider {
  private decoyHash: Promise<string> | undefined;

  constructor(
    private readonly db: Database,
    private readonly hasher: PasswordHasher,
  ) {}

  async authenticate(email: string, password: string): Promise<ExternalIdentity | null> {
    const row = await this.db.user.findUnique({ where: { email: email.toLowerCase() } });
    const storedHash = row?.passwordHash ?? null;
    const matches = await this.hasher.verify(storedHash ?? (await this.getDecoyHash()), password);
    if (row === null || storedHash === null || !matches) return null;
    return { email: row.email, fullName: row.fullName };
  }

  /** Iguala el tiempo de respuesta cuando el usuario no existe. */
  private getDecoyHash(): Promise<string> {
    this.decoyHash ??= this.hasher.hash('decoy-password-never-matches');
    return this.decoyHash;
  }
}
