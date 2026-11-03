import type { Role } from '@siga/shared';
import { Navigate, Outlet, useLocation } from 'react-router';
import { Spinner } from '../components/atoms/spinner';
import { useAuth } from './auth-context';

export function RequireAuth() {
  const { state } = useAuth();
  const location = useLocation();
  if (state.status === 'loading') return <Spinner fullPage label="Verificando sesión…" />;
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

export function RequireRole({ roles }: { readonly roles: readonly Role[] }) {
  const { state } = useAuth();
  if (state.status !== 'authenticated') return null;
  if (!roles.includes(state.user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
