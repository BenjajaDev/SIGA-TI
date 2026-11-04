import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Ticket, User } from '@siga/shared';
import { describe, expect, it, vi } from 'vitest';
import { LoginForm } from '../src/components/organisms/login-form';
import { Pagination } from '../src/components/molecules/pagination';
import { BrandingForm } from '../src/components/organisms/branding-form';
import { ApiError } from '../src/services/api-error';

const transitionMutate = vi.fn();
vi.mock('../src/hooks/use-tickets', () => ({
  useTransitionTicket: () => ({
    mutate: transitionMutate,
    isPending: false,
    error: null,
    reset: vi.fn(),
  }),
  useAssignTicket: () => ({ mutate: vi.fn(), isPending: false, error: null }),
}));
vi.mock('../src/hooks/use-catalog', () => ({
  useUsers: () => ({ data: [{ id: 't1', fullName: 'Tomás Técnico' }] }),
}));

const { TicketActions } = await import('../src/components/organisms/ticket-actions');

const user = (role: User['role'], id: string): User => ({
  id,
  email: `${id}@siga-ti.test`,
  fullName: id,
  role,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
});
const ticket = (status: Ticket['status']): Ticket => ({
  id: 'tk',
  code: 'SIGA-000001',
  title: 'Título',
  description: 'Descripción',
  category: { id: 'c', name: 'Redes' },
  priority: 'ALTA',
  status,
  requester: { id: 'req', fullName: 'Rita' },
  assignee: { id: 'tec', fullName: 'Tec' },
  dueAt: '2026-01-02T00:00:00.000Z',
  isOverdue: false,
  resolvedAt: null,
  closedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('LoginForm', () => {
  it('muestra errores de validación y no envía', async () => {
    const onSubmit = vi.fn();
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    expect(await screen.findByText('Correo inválido')).toBeInTheDocument();
    expect(screen.getByText('La contraseña es obligatoria')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('envía el correo normalizado y muestra el error del servidor', async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos'),
      );
    render(<LoginForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText('Correo institucional'), 'Ana@SIGA-TI.test');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'secreta');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ email: 'ana@siga-ti.test', password: 'secreta' });
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
  });
});

describe('Pagination', () => {
  it('deshabilita los extremos y emite el cambio de página', async () => {
    const onChange = vi.fn();
    render(<Pagination page={1} totalPages={3} totalItems={50} onChange={onChange} />);
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});

describe('TicketActions', () => {
  it('el técnico asignado inicia el trabajo sin nota', async () => {
    transitionMutate.mockClear();
    render(<TicketActions ticket={ticket('ASIGNADA')} user={user('TECNICO', 'tec')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar trabajo' }));
    expect(transitionMutate).toHaveBeenCalledWith({ to: 'EN_PROGRESO' }, expect.anything());
    expect(screen.queryByText('Reasignar a')).not.toBeInTheDocument();
  });

  it('resolver exige una nota antes de confirmar', async () => {
    transitionMutate.mockClear();
    render(<TicketActions ticket={ticket('EN_PROGRESO')} user={user('TECNICO', 'tec')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Marcar como resuelta' }));
    expect(transitionMutate).not.toHaveBeenCalled();
    const confirm = screen.getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Nota para/), 'Se reemplazó el equipo');
    await userEvent.click(confirm);
    expect(transitionMutate).toHaveBeenCalledWith(
      { to: 'RESUELTA', note: 'Se reemplazó el equipo' },
      expect.anything(),
    );
  });

  it('el solicitante puede cerrar o reabrir; el supervisor además reasigna', () => {
    const { unmount } = render(
      <TicketActions ticket={ticket('RESUELTA')} user={user('SOLICITANTE', 'req')} />,
    );
    expect(screen.getByRole('button', { name: 'Cerrar solicitud' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reabrir' })).toBeInTheDocument();
    unmount();
    render(<TicketActions ticket={ticket('EN_PROGRESO')} user={user('SUPERVISOR', 'sup')} />);
    expect(screen.getByText('Reasignar a')).toBeInTheDocument();
  });

  it('el administrador no tiene acciones', () => {
    render(<TicketActions ticket={ticket('EN_PROGRESO')} user={user('ADMIN', 'adm')} />);
    expect(screen.getByText(/acceso de consulta/)).toBeInTheDocument();
  });
});

describe('BrandingForm', () => {
  const initial = {
    institutionName: 'Mi U',
    primaryColor: '#1e3a8a',
    secondaryColor: '#0f766e',
    gradientAngle: 135,
    logoDataUrl: null,
  };

  it('rechaza un color primario ilegible con texto blanco', async () => {
    const onSubmit = vi.fn();
    render(<BrandingForm initial={initial} onSubmit={onSubmit} />);
    const input = screen.getByLabelText('Color primario', { selector: '#primaryColor' });
    await userEvent.clear(input);
    await userEvent.type(input, '#ffee99');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByText(/demasiado claro/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('guarda los valores válidos conservando el ángulo', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<BrandingForm initial={initial} onSubmit={onSubmit} />);
    const name = screen.getByLabelText('Nombre de la institución');
    await userEvent.clear(name);
    await userEvent.type(name, 'Universidad X');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ ...initial, institutionName: 'Universidad X' });
    });
    expect(await screen.findByText(/Cambios guardados/)).toBeInTheDocument();
  });
});
