import { ROLE_LABEL } from '../../lib/labels';
import { DEMO_ACCOUNTS, type DemoAccount } from '../../lib/demo-accounts';

interface DemoAccountsProps {
  readonly password: string;
  readonly onPick: (account: DemoAccount) => void;
}

export function DemoAccounts({ password, onPick }: DemoAccountsProps) {
  return (
    <section
      aria-labelledby="demo-accounts-title"
      className="rounded-2xl border border-surface-border bg-brand-gradient-soft p-4"
    >
      <h3 id="demo-accounts-title" className="text-sm font-semibold text-slate-900">
        Cuentas de demostración
      </h3>
      <p className="mt-1 text-xs text-slate-600">
        Toque una cuenta para completar el formulario. Contraseña común:{' '}
        <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-[0.8rem] text-brand-800">
          {password}
        </code>
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {DEMO_ACCOUNTS.map((account) => (
          <li key={account.email}>
            <button
              type="button"
              onClick={() => {
                onPick(account);
              }}
              className="group flex min-h-12 w-full flex-col items-start rounded-xl bg-white/85 px-3 py-2 text-left ring-1 ring-inset ring-surface-border transition-[transform,box-shadow,background-color] duration-200 hover:bg-white hover:shadow-md active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              <span className="text-sm font-medium text-slate-900">
                {ROLE_LABEL[account.role]} · {account.fullName}
              </span>
              <span className="w-full break-all font-mono text-[0.7rem] leading-snug text-slate-600">
                {account.email}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
