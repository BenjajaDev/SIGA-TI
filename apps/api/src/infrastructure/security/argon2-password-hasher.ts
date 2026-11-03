import argon2 from 'argon2';
import type { PasswordHasher } from '../../domain/ports/security';

export interface Argon2Options {
  readonly memoryCost: number;
  readonly timeCost: number;
  readonly parallelism: number;
}

/** Parámetros mínimos recomendados por OWASP para argon2id. */
export const DEFAULT_ARGON2_OPTIONS: Argon2Options = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

export class Argon2PasswordHasher implements PasswordHasher {
  constructor(private readonly options: Argon2Options = DEFAULT_ARGON2_OPTIONS) {}

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, { type: argon2.argon2id, ...this.options });
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }
}
