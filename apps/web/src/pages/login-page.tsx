import { Navigate, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../auth/auth-context';
import { BrandLogo } from '../components/atoms/brand-logo';
import { LoginForm } from '../components/organisms/login-form';
import { useBranding } from '../hooks/use-branding';

interface LocationState {
  readonly from?: string;
}

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: branding } = useBranding();
  const from = (location.state as LocationState | null)?.from;

  if (state.status === 'authenticated') return <Navigate to={from ?? '/'} replace />;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="bg-brand-gradient hidden flex-col justify-between p-10 text-white lg:flex">
        <div className="flex items-center gap-3">
          <BrandLogo size="large" />
          <span className="text-xl font-semibold">{branding?.institutionName ?? 'SIGA-TI'}</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold leading-tight">Gestión de solicitudes de TI</h1>
          <p className="mt-3 max-w-md text-white/85">
            Registre, asigne y siga cada solicitud en un solo lugar, con trazabilidad completa.
          </p>
        </div>
        <p className="text-sm text-white/70">Prototipo con datos ficticios</p>
      </aside>
      <main className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="bg-brand-gradient -mx-6 -mt-6 flex items-center gap-3 p-4 text-white lg:hidden">
            <BrandLogo size="small" />
            <span className="font-semibold">{branding?.institutionName ?? 'SIGA-TI'}</span>
          </div>
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Iniciar sesión</h2>
            <p className="mt-1 text-sm text-slate-600">Use su cuenta institucional.</p>
          </div>
          <LoginForm
            onSubmit={async ({ email, password }) => {
              await login(email, password);
              void navigate(from ?? '/', { replace: true });
            }}
          />
        </div>
      </main>
    </div>
  );
}
