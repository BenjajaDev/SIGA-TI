import clsx from 'clsx';
import { NavLink, Outlet } from 'react-router';
import { useCurrentUser, useAuth } from '../../auth/auth-context';
import { useBranding } from '../../hooks/use-branding';
import { ROLE_LABEL } from '../../lib/labels';
import { BrandLogo } from '../atoms/brand-logo';
import { Button } from '../atoms/button';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly visible: boolean;
}

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  clsx(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-white/25 text-white' : 'text-white/85 hover:bg-white/15 hover:text-white',
  );

export function AppShell() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { data: branding } = useBranding();

  const items: readonly NavItem[] = [
    { to: '/tickets', label: 'Solicitudes', visible: true },
    { to: '/tickets/nueva', label: 'Nueva solicitud', visible: user.role !== 'ADMIN' },
    { to: '/panel', label: 'Panel', visible: user.role === 'SUPERVISOR' || user.role === 'ADMIN' },
    { to: '/apariencia', label: 'Apariencia', visible: user.role === 'ADMIN' },
  ];

  return (
    <div className="min-h-screen">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <header className="bg-brand-gradient text-white shadow">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <div className="flex items-center gap-3">
            <BrandLogo />
            <span className="text-lg font-semibold">{branding?.institutionName ?? 'SIGA-TI'}</span>
          </div>
          <nav aria-label="Principal" className="flex flex-1 flex-wrap gap-1">
            {items
              .filter((item) => item.visible)
              .map((item) => (
                <NavLink key={item.to} to={item.to} end className={linkClass}>
                  {item.label}
                </NavLink>
              ))}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-right leading-tight">
              <span className="block font-medium">{user.fullName}</span>
              <span className="block text-xs text-white/80">{ROLE_LABEL[user.role]}</span>
            </span>
            <Button
              variant="secondary"
              onClick={() => {
                void logout();
              }}
            >
              Salir
            </Button>
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
