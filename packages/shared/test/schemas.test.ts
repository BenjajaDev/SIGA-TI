import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BRANDING,
  assignTicketRequestSchema,
  availableTransitions,
  canAssign,
  canComment,
  canWriteInternalComment,
  contrastWithWhite,
  updateBrandingRequestSchema,
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

describe('reglas de solicitudes compartidas', () => {
  const ctx = (role: 'SOLICITANTE' | 'TECNICO' | 'SUPERVISOR' | 'ADMIN', userId: string) => ({
    role,
    userId,
    requesterId: 'req',
    assigneeId: 'tec',
  });

  it('el técnico asignado ve iniciar y el solicitante no', () => {
    expect(availableTransitions('ASIGNADA', ctx('TECNICO', 'tec')).map((r) => r.to)).toEqual([
      'EN_PROGRESO',
    ]);
    expect(availableTransitions('ASIGNADA', ctx('SOLICITANTE', 'req'))).toEqual([]);
  });

  it('el solicitante cierra o reabre una solicitud resuelta', () => {
    expect(
      availableTransitions('RESUELTA', ctx('SOLICITANTE', 'req'))
        .map((r) => r.to)
        .sort(),
    ).toEqual(['CERRADA', 'EN_PROGRESO']);
  });

  it('el admin no tiene acciones; el supervisor sí', () => {
    expect(availableTransitions('EN_PROGRESO', ctx('ADMIN', 'adm'))).toEqual([]);
    expect(availableTransitions('EN_PROGRESO', ctx('SUPERVISOR', 'sup')).length).toBe(2);
  });

  it('solo el supervisor asigna y no en estados finales', () => {
    expect(canAssign('ABIERTA', 'SUPERVISOR')).toBe(true);
    expect(canAssign('RESUELTA', 'SUPERVISOR')).toBe(false);
    expect(canAssign('ABIERTA', 'TECNICO')).toBe(false);
  });

  it('no se comenta una solicitud cerrada', () => {
    expect(canComment(ctx('SOLICITANTE', 'req'), 'CERRADA')).toBe(false);
    expect(canComment(ctx('ADMIN', 'adm'), 'ABIERTA')).toBe(false);
    expect(canWriteInternalComment(ctx('SOLICITANTE', 'req'), 'ABIERTA')).toBe(false);
    expect(canWriteInternalComment(ctx('TECNICO', 'tec'), 'ABIERTA')).toBe(true);
  });
});

describe('identidad visual', () => {
  it('calcula el contraste contra blanco', () => {
    expect(contrastWithWhite('#000000')).toBeCloseTo(21, 0);
    expect(contrastWithWhite('#ffffff')).toBeCloseTo(1, 1);
  });

  it('rechaza un primario claro y acepta uno oscuro', () => {
    const base = { ...DEFAULT_BRANDING };
    expect(
      updateBrandingRequestSchema.safeParse({ ...base, primaryColor: '#ffee99' }).success,
    ).toBe(false);
    expect(
      updateBrandingRequestSchema.safeParse({ ...base, primaryColor: '#7a1030' }).success,
    ).toBe(true);
  });

  it('solo admite imágenes seguras como logo', () => {
    const base = { ...DEFAULT_BRANDING };
    expect(
      updateBrandingRequestSchema.safeParse({ ...base, logoDataUrl: 'data:text/html;base64,AAAA' })
        .success,
    ).toBe(false);
    expect(
      updateBrandingRequestSchema.safeParse({ ...base, logoDataUrl: 'data:image/png;base64,AAAA' })
        .success,
    ).toBe(true);
  });
});
