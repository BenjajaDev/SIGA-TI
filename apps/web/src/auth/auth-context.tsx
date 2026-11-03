import { useQueryClient } from '@tanstack/react-query';
import type { User } from '@siga/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { services } from '../services';

type AuthState =
  | { readonly status: 'loading' }
  | { readonly status: 'anonymous' }
  | { readonly status: 'authenticated'; readonly user: User };

interface AuthContextValue {
  readonly state: AuthState;
  readonly login: (email: string, password: string) => Promise<void>;
  readonly logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const expire = useCallback(() => {
    queryClient.clear();
    setState({ status: 'anonymous' });
  }, [queryClient]);

  useEffect(() => {
    let active = true;
    services.http.onSessionExpired(expire);
    services.auth
      .restoreSession()
      .then((user) => {
        if (active) setState({ status: 'authenticated', user });
      })
      .catch(() => {
        if (active) setState({ status: 'anonymous' });
      });
    return () => {
      active = false;
    };
  }, [expire]);

  const login = useCallback(async (email: string, password: string) => {
    const user = await services.auth.login(email, password);
    setState({ status: 'authenticated', user });
  }, []);

  const logout = useCallback(async () => {
    try {
      await services.auth.logout();
    } finally {
      expire();
    }
  }, [expire]);

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export function useCurrentUser(): User {
  const { state } = useAuth();
  if (state.status !== 'authenticated') throw new Error('No hay un usuario autenticado');
  return state.user;
}
