import clsx from 'clsx';
import { useState, type ReactNode } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { useAuth, useCurrentUser } from '../../auth/auth-context';
import { useBranding } from '../../hooks/use-branding';
import { ROLE_LABEL } from '../../lib/labels';
import { BrandLogo } from '../atoms/brand-logo';
import { Button } from '../atoms/button';

interface NavItem {
  readonly to: string;
  readonly label: string;
  readonly icon: ReactNode;
}

const iconClass = 'h-5 w-5 shrink-0';

const linkClass = ({ isActive }: { isActive: boolean }): string =>
  clsx(
    'group relative flex min-h-12 items-center gap-3 rounded-xl px-3 text-base font-normal transition-all duration-200',
    isActive
      ? 'bg-brand-gradient-active font-medium text-white shadow-sm ring-1 ring-white/20 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-accent'
      : 'text-white/85 hover:bg-white/10 hover:text-white',
  );

export function AppShell() {
  const user = useCurrentUser();
  const { logout } = useAuth();
  const { data: branding } = useBranding();
  const location = useLocation();
  const [sidebarPath, setSidebarPath] = useState<string | null>(null);
  const sidebarOpen = sidebarPath === location.pathname;

  const items: readonly NavItem[] = [
    {
      to: '/tickets',
      label: 'Solicitudes',
      icon: (
        <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path
            d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z"
            strokeWidth="1.7"
          />
          <path d="M4 9h4l1.5 2h5L16 9h4" strokeWidth="1.7" strokeLinejoin="round" />
        </svg>
      ),
    },
    ...(user.role !== 'ADMIN'
      ? [
          {
            to: '/tickets/nueva',
            label: 'Nueva solicitud',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M12 5v14M5 12h14" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            ),
          },
        ]
      : []),
    ...(user.role === 'SUPERVISOR' || user.role === 'ADMIN'
      ? [
          {
            to: '/panel',
            label: 'Panel',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M4 4.75A.75.75 0 0 1 4.75 4h5.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-5.5ZM13 4.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-2.5ZM13 12.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v6.5a.75.75 0 0 1-.75.75h-5.5a.75.75 0 0 1-.75-.75v-6.5ZM4 15.75a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-.75.75h-5.5A.75.75 0 0 1 4 19.25v-3.5Z"
                  strokeWidth="1.5"
                />
              </svg>
            ),
          },
        ]
      : []),
    ...(user.role === 'ADMIN'
      ? [
          {
            to: '/apariencia',
            label: 'Apariencia',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M4 7h8m4 0h4M4 17h3m4 0h9M12 4v6M7 14v6"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
                <circle cx="14" cy="7" r="2" fill="currentColor" stroke="none" />
                <circle cx="9" cy="17" r="2" fill="currentColor" stroke="none" />
              </svg>
            ),
          },
          {
            to: '/usuarios',
            label: 'Usuarios',
            icon: (
              <svg className={iconClass} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20m15-9v6m-3-3h6M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ),
          },
        ]
      : []),
  ];
  const isManager = user.role === 'SUPERVISOR' || user.role === 'ADMIN';
  const primaryItems = items
    .filter((item) => item.to !== '/apariencia' && item.to !== '/usuarios')
    .sort((left, right) => Number(right.to === '/panel') - Number(left.to === '/panel'));
  const adminItems = items
    .filter((item) => item.to === '/usuarios' || item.to === '/apariencia')
    .sort((left, right) => Number(right.to === '/usuarios') - Number(left.to === '/usuarios'));
  const allItems = [...primaryItems, ...adminItems];
  const activeSection =
    allItems.find((item) => location.pathname === item.to) ??
    allItems
      .filter((item) => location.pathname.startsWith(`${item.to}/`))
      .sort((left, right) => right.to.length - left.to.length)[0];

  const initials = user.fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-canvas">
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-3 focus:shadow-lg"
      >
        Saltar al contenido
      </a>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[2px] lg:hidden"
          onClick={() => {
            setSidebarPath(null);
          }}
        />
      )}

      <aside
        aria-label="Navegación principal"
        className={clsx(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-white/10 bg-shell-sidebar bg-shell-gradient px-4 py-5 text-white shadow-2xl shadow-slate-950/15',
          'transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none lg:translate-x-0',
          sidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full',
        )}
      >
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
            <BrandLogo size="small" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-medium tracking-tight text-white">
              {branding?.institutionName ?? 'SIGA-TI'}
            </p>
            <p className="text-sm font-normal text-white/75">Gestión de TI</p>
          </div>
          <button
            type="button"
            aria-label="Cerrar navegación"
            className="ml-auto rounded-lg p-2 text-white/70 transition hover:bg-white/10 hover:text-white lg:hidden"
            onClick={() => {
              setSidebarPath(null);
            }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="m6 6 12 12M18 6 6 18" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="mt-10 px-3 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
          {isManager ? 'Gestión de servicios' : 'Espacio de trabajo'}
        </div>
        <nav className="mt-3 flex flex-col gap-1" aria-label="Secciones">
          {primaryItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={
                item.to === '/tickets' ||
                item.to === '/panel' ||
                item.to === '/apariencia' ||
                item.to === '/usuarios'
              }
              className={linkClass}
              onClick={() => {
                setSidebarPath(null);
              }}
            >
              <span className="text-white/70 transition-colors duration-200 group-hover:text-current">
                {item.icon}
              </span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {adminItems.length > 0 && (
          <>
            <div className="mt-8 px-3 text-xs font-medium uppercase tracking-[0.14em] text-white/70">
              Configuración
            </div>
            <nav className="mt-3 flex flex-col gap-1" aria-label="Administración">
              {adminItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={linkClass}
                  onClick={() => {
                    setSidebarPath(null);
                  }}
                >
                  <span className="text-white/70 transition-colors duration-200 group-hover:text-current">
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}

        <div className="mt-auto rounded-2xl bg-white/10 p-3 ring-1 ring-white/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-base font-medium text-white shadow-sm">
              {initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium text-white">
                {user.fullName}
              </span>
              <span className="block truncate text-sm text-white/75">{ROLE_LABEL[user.role]}</span>
            </span>
          </div>
          <Button
            variant="ghost"
            className="mt-3 w-full justify-start text-base font-normal text-white/85 hover:bg-white/10 hover:text-white"
            onClick={() => {
              void logout();
            }}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path
                d="M10 17l5-5-5-5m5 5H3m9-9h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Cerrar sesión
          </Button>
        </div>
        <p className="px-3 pt-4 text-xs text-white/60">Prototipo · Datos ficticios</p>
      </aside>

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 flex h-[4.5rem] items-center justify-between border-b border-surface-border bg-surface/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Abrir navegación"
              aria-expanded={sidebarOpen}
              className="rounded-xl border border-surface-border p-2 text-slate-600 transition hover:bg-brand-50 hover:text-brand-800 lg:hidden"
              onClick={() => {
                setSidebarPath(location.pathname);
              }}
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M4 7h16M4 12h16M4 17h16" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </button>
            <div className="min-w-0">
              <span className="block truncate text-base font-medium text-slate-900">
                {activeSection?.label ?? 'SIGA-TI'}
              </span>
              <span className="hidden text-sm text-slate-600 sm:block">
                {branding?.institutionName ?? 'Sistema de Gestión de Solicitudes TI'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-brand-50 py-1 pl-1 pr-3 ring-1 ring-brand-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gradient text-sm font-medium text-white shadow-sm">
              {initials}
            </span>
            <span className="hidden text-sm font-medium text-brand-800 sm:block">
              {ROLE_LABEL[user.role]}
            </span>
          </div>
        </header>
        <main
          id="contenido"
          className="mx-auto min-h-[calc(100vh-4.5rem)] max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-9"
        >
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
