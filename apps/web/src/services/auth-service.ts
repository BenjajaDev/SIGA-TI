import { authSessionSchema, type User } from '@siga/shared';
import type { HttpClient } from './http-client';

export interface AuthService {
  restoreSession(): Promise<User>;
  login(email: string, password: string): Promise<User>;
  logout(): Promise<void>;
}

export const createAuthService = (client: HttpClient): AuthService => ({
  async restoreSession() {
    return (await client.refreshSession()).user;
  },
  async login(email, password) {
    const session = await client.post(
      '/auth/login',
      authSessionSchema,
      { email, password },
      { auth: false },
    );
    client.setAccessToken(session.accessToken);
    return session.user;
  },
  async logout() {
    try {
      await client.postNoContent('/auth/logout');
    } finally {
      client.setAccessToken(null);
    }
  },
});
