import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { DemoAccounts } from '../src/components/organisms/demo-accounts';
import { LoginForm, type LoginPrefill } from '../src/components/organisms/login-form';
import { TicketProgress } from '../src/components/organisms/ticket-progress';

function Harness() {
  const [prefill, setPrefill] = useState<LoginPrefill | null>(null);
  return (
    <>
      <LoginForm prefill={prefill} onSubmit={vi.fn()} />
      <DemoAccounts
        password="Clave-Demo-1"
        onPick={(account) => {
          setPrefill((current) => ({
            email: account.email,
            password: 'Clave-Demo-1',
            nonce: (current?.nonce ?? 0) + 1,
          }));
        }}
      />
    </>
  );
}

describe('cuentas de demostración', () => {
  it('lista los roles y muestra la contraseña común', () => {
    render(<Harness />);
    expect(screen.getByText('Clave-Demo-1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Administrador · Carolina Fuentes/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Técnico ·/ })).toHaveLength(3);
  });

  it('al tocar una cuenta rellena correo y contraseña sin enviar el formulario', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Técnico · Daniela Riquelme/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Correo institucional')).toHaveValue('tecnico2@siga-ti.test');
    });
    expect(screen.getByLabelText('Contraseña')).toHaveValue('Clave-Demo-1');
  });

  it('permite cambiar de cuenta y volver a elegir la misma', async () => {
    render(<Harness />);
    await userEvent.click(screen.getByRole('button', { name: /Administrador/ }));
    await userEvent.click(screen.getByRole('button', { name: /Supervisor/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Correo institucional')).toHaveValue('supervisor@siga-ti.test');
    });
    await userEvent.clear(screen.getByLabelText('Correo institucional'));
    await userEvent.click(screen.getByRole('button', { name: /Supervisor/ }));
    await waitFor(() => {
      expect(screen.getByLabelText('Correo institucional')).toHaveValue('supervisor@siga-ti.test');
    });
  });
});

describe('TicketProgress', () => {
  it('marca el paso actual y los completados', () => {
    render(<TicketProgress status="EN_PROGRESO" />);
    const steps = screen.getAllByRole('listitem');
    expect(steps).toHaveLength(5);
    expect(steps[2]).toHaveAttribute('aria-current', 'step');
    expect(steps[0]).not.toHaveAttribute('aria-current');
  });

  it('muestra «En espera» pausada sobre el paso En progreso', () => {
    render(<TicketProgress status="EN_ESPERA" />);
    expect(screen.getByText('En espera')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')[2]).toHaveAttribute('aria-current', 'step');
  });

  it('una solicitud cerrada completa todos los pasos', () => {
    render(<TicketProgress status="CERRADA" />);
    expect(screen.queryByRole('listitem', { current: 'step' })).not.toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(5);
  });
});
