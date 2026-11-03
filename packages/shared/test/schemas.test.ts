import { describe, expect, it } from 'vitest';
import {
  assignTicketRequestSchema,
  createTicketRequestSchema,
  listTicketsQuerySchema,
  loginRequestSchema,
  resolutionQuerySchema,
  transitionTicketRequestSchema,
} from '../src';

const validTicket = {
  title: 'Sin acceso a la plataforma',
  description: 'No puedo ingresar al aula virtual desde ayer',
  categoryId: '3f2b8c1e-7d4a-4f1b-9c2e-1a2b3c4d5e6f',
  priority: 'ALTA',
};

describe('createTicketRequestSchema', () => {
  it('acepta una solicitud válida y recorta espacios', () => {
    const parsed = createTicketRequestSchema.parse({ ...validTicket, title: '  Sin acceso  ' });
    expect(parsed.title).toBe('Sin acceso');
  });

  it.each([
    ['título corto', { title: 'abc' }],
    ['descripción larga', { description: 'x'.repeat(5001) }],
    ['prioridad desconocida', { priority: 'URGENTE' }],
    ['categoría no UUID', { categoryId: '123' }],
    ['campo extra', { status: 'CERRADA' }],
  ])('rechaza %s', (_name, patch) => {
    expect(createTicketRequestSchema.safeParse({ ...validTicket, ...patch }).success).toBe(false);
  });
});

describe('transitionTicketRequestSchema', () => {
  it('no admite ASIGNADA como destino', () => {
    expect(transitionTicketRequestSchema.safeParse({ to: 'ASIGNADA' }).success).toBe(false);
    expect(transitionTicketRequestSchema.safeParse({ to: 'RESUELTA', note: 'Hecho' }).success).toBe(
      true,
    );
  });
});

describe('loginRequestSchema', () => {
  it('normaliza el correo a minúsculas', () => {
    expect(loginRequestSchema.parse({ email: 'Ana@Siga-TI.test', password: 'x' }).email).toBe(
      'ana@siga-ti.test',
    );
  });
});

describe('listTicketsQuerySchema', () => {
  it('aplica paginación por defecto y convierte números', () => {
    expect(listTicketsQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
    expect(listTicketsQuerySchema.parse({ page: '2', pageSize: '50' })).toMatchObject({
      page: 2,
      pageSize: 50,
    });
  });

  it('limita el tamaño de página', () => {
    expect(listTicketsQuerySchema.safeParse({ pageSize: '101' }).success).toBe(false);
  });
});

describe('otros contratos', () => {
  it('exige UUID al asignar', () => {
    expect(assignTicketRequestSchema.safeParse({ assigneeId: 'abc' }).success).toBe(false);
  });

  it('el rango de resolución debe ser coherente', () => {
    expect(
      resolutionQuerySchema.safeParse({ from: '2026-02-01T00:00:00Z', to: '2026-01-01T00:00:00Z' })
        .success,
    ).toBe(false);
  });
});
