import { describe, expect, it } from 'vitest';
import { LogoutUseCase } from '../../src/application/use-cases/auth/logout';
import { RefreshSessionUseCase } from '../../src/application/use-cases/auth/refresh-session';
import { SessionIssuer } from '../../src/application/use-cases/auth/session-issuer';
import type { RefreshTokenRecord, User } from '../../src/domain/entities';
import { UnauthenticatedError } from '../../src/domain/errors';
import type { RefreshTokenRepository } from '../../src/domain/ports/refresh-token-repository';
import type { Clock, TokenService } from '../../src/domain/ports/security';
import type { UserRepository } from '../../src/domain/ports/user-repository';

const NOW = new Date('2026-05-01T12:00:00Z');
const clock: Clock = { now: () => new Date(NOW) };

const user: User = {
  id: 'u-1',
  email: 'u@siga-ti.test',
  fullName: 'Usuario',
  role: 'SOLICITANTE',
  isActive: true,
  createdAt: NOW,
};

class FakeTokens implements TokenService {
  private counter = 0;

  signAccessToken(): Promise<string> {
    return Promise.resolve('access');
  }

  verifyAccessToken(): Promise<null> {
    return Promise.resolve(null);
  }

  generateRefreshToken(): string {
    this.counter += 1;
    return `token-${String(this.counter)}`;
  }

  hashRefreshToken(token: string): string {
    return `hash:${token}`;
  }
}

type StoredToken = RefreshTokenRecord & { readonly hash: string };

class FakeRefreshRepo implements RefreshTokenRepository {
  readonly rows = new Map<string, StoredToken>();
  private seq = 0;

  create(data: { userId: string; tokenHash: string; expiresAt: Date }): Promise<void> {
    this.seq += 1;
    const id = `r-${String(this.seq)}`;
    this.rows.set(id, {
      id,
      hash: data.tokenHash,
      userId: data.userId,
      expiresAt: data.expiresAt,
      revokedAt: null,
    });
    return Promise.resolve();
  }

  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return Promise.resolve([...this.rows.values()].find((r) => r.hash === tokenHash) ?? null);
  }

  revoke(id: string, at: Date): Promise<boolean> {
    const row = this.rows.get(id);
    if (row?.revokedAt !== null) return Promise.resolve(false);
    this.rows.set(id, { ...row, revokedAt: at });
    return Promise.resolve(true);
  }

  revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const [id, row] of this.rows) {
      if (row.userId === userId && row.revokedAt === null) {
        this.rows.set(id, { ...row, revokedAt: at });
      }
    }
    return Promise.resolve();
  }

  expireAll(): void {
    for (const [id, row] of this.rows) {
      this.rows.set(id, { ...row, expiresAt: new Date(NOW.getTime() - 1) });
    }
  }

  activeCount(): number {
    return [...this.rows.values()].filter((r) => r.revokedAt === null).length;
  }
}

const setup = (lookup: User | null = user) => {
  const tokens = new FakeTokens();
  const repo = new FakeRefreshRepo();
  const users: Pick<UserRepository, 'findById'> = { findById: () => Promise.resolve(lookup) };
  const issuer = new SessionIssuer(tokens, repo, clock, {
    accessTtlSeconds: 900,
    refreshTtlMs: 3_600_000,
  });
  return {
    repo,
    issuer,
    refresh: new RefreshSessionUseCase(tokens, repo, users as UserRepository, issuer, clock),
    logout: new LogoutUseCase(tokens, repo, clock),
  };
};

describe('RefreshSessionUseCase', () => {
  it('rota: invalida el token usado y emite uno nuevo', async () => {
    const { issuer, refresh, repo } = setup();
    const first = await issuer.issue(user);
    const second = await refresh.execute(first.refreshToken);
    expect(second.refreshToken).not.toBe(first.refreshToken);
    expect(repo.activeCount()).toBe(1);
  });

  it('reutilizar un token ya rotado revoca todas las sesiones del usuario', async () => {
    const { issuer, refresh, repo } = setup();
    const first = await issuer.issue(user);
    await refresh.execute(first.refreshToken);
    await expect(refresh.execute(first.refreshToken)).rejects.toBeInstanceOf(UnauthenticatedError);
    expect(repo.activeCount()).toBe(0);
  });

  it('rechaza tokens desconocidos', async () => {
    const { refresh } = setup();
    await expect(refresh.execute('desconocido')).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it('rechaza tokens expirados', async () => {
    const { issuer, refresh, repo } = setup();
    const session = await issuer.issue(user);
    repo.expireAll();
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });

  it('rechaza si el usuario fue desactivado', async () => {
    const { issuer, refresh } = setup({ ...user, isActive: false });
    const session = await issuer.issue(user);
    await expect(refresh.execute(session.refreshToken)).rejects.toBeInstanceOf(
      UnauthenticatedError,
    );
  });
});

describe('LogoutUseCase', () => {
  it('revoca el token y es idempotente', async () => {
    const { issuer, logout, repo } = setup();
    const session = await issuer.issue(user);
    await logout.execute(session.refreshToken);
    await logout.execute(session.refreshToken);
    await logout.execute(undefined);
    expect(repo.activeCount()).toBe(0);
  });
});
