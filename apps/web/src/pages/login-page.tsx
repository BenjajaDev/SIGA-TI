import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { BrandLogo } from '../components/atoms/brand-logo';
import { DemoAccounts } from '../components/organisms/demo-accounts';
import { LoginForm, type LoginPrefill } from '../components/organisms/login-form';
import { demoAccountsEnabled, webEnv } from '../config/env';
import { useBranding } from '../hooks/use-branding';

interface LocationState {
  readonly from?: string;
}

const HIGHLIGHTS: readonly { readonly title: string; readonly text: string }[] = [
  { title: 'Trazabilidad completa', text: 'Cada cambio queda en un historial inmutable.' },
  { title: 'Flujo por roles', text: 'Solicitantes, técnicos, supervisores y administración.' },
  { title: 'Indicadores y SLA', text: 'Carga de trabajo y cumplimiento de plazos en un panel.' },
];

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: branding } = useBranding();
  const [prefill, setPrefill] = useState<LoginPrefill | null>(null);
  const from = (location.state as LocationState | null)?.from;
  const name = branding?.institutionName ?? 'SIGA-TI';

  if (state.status === 'authenticated') return <Navigate to={from ?? '/'} replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-12 text-white lg:flex">
        <div
          aria-hidden="true"
          className="pattern-grid mask-fade-left pointer-events-none absolute inset-0"
        />
        <div
          aria-hidden="true"
          className="pattern-stripes pointer-events-none absolute -bottom-28 -left-28 size-[26rem] rounded-full opacity-70"
        />
        <div className="page-enter relative flex items-center gap-3">
          <BrandLogo size="large" />
          <span className="text-xl font-semibold">{name}</span>
        </div>
        <div className="page-enter relative">
          <h1 className="max-w-lg text-4xl font-bold leading-tight tracking-tight">
            Gestión de solicitudes de TI
          </h1>
          <p className="mt-3 max-w-md text-white/85">
            Registre, asigne y siga cada solicitud en un solo lugar.
          </p>
          <ul className="mt-8 grid max-w-md gap-3">
            {HIGHLIGHTS.map((item) => (
              <li
                key={item.title}
                className="rounded-xl bg-white/10 px-4 py-3 ring-1 ring-inset ring-white/15 backdrop-blur-sm"
              >
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="text-sm text-white/80">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/75">Prototipo con datos ficticios</p>
      </aside>

      <main className="flex items-center justify-center bg-brand-gradient-soft p-6">
        <div className="page-enter w-full max-w-md space-y-5">
          <div className="bg-brand-gradient -mx-6 -mt-6 flex items-center gap-3 p-4 text-white lg:hidden">
            <BrandLogo size="small" />
            <span className="font-semibold">{name}</span>
          </div>
          <div className="space-y-6 rounded-2xl border border-surface-border bg-surface p-6 shadow-brand-card">
            <div>
              <h2 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h2>
              <p className="mt-1 text-sm text-slate-600">Use su cuenta institucional.</p>
            </div>
            <LoginForm
              prefill={prefill}
              onSubmit={async ({ email, password }) => {
                await login(email, password);
                void navigate(from ?? '/', { replace: true });
              }}
            />
          </div>
          {demoAccountsEnabled && webEnv.VITE_DEMO_PASSWORD !== undefined && (
            <DemoAccounts
              password={webEnv.VITE_DEMO_PASSWORD}
              onPick={(account) => {
                setPrefill((current) => ({
                  email: account.email,
                  password: webEnv.VITE_DEMO_PASSWORD ?? '',
                  nonce: (current?.nonce ?? 0) + 1,
                }));
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
