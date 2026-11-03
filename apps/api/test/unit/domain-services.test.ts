import { describe, expect, it } from 'vitest';
import { computeResolutionStats } from '../../src/domain/services/resolution-metrics';
import { computeDueAt, isOverdue } from '../../src/domain/services/sla';
import { formatTicketCode } from '../../src/domain/services/ticket-code';
import { ticketIn } from '../helpers/fixtures';

const at = (iso: string): Date => new Date(iso);

describe('formatTicketCode', () => {
  it.each([
    [1, 'SIGA-000001'],
    [123, 'SIGA-000123'],
    [999_999, 'SIGA-999999'],
    [1_000_000, 'SIGA-1000000'],
  ])('%i → %s', (number, code) => {
    expect(formatTicketCode(number)).toBe(code);
  });
});

describe('SLA', () => {
  const created = at('2026-03-01T08:00:00Z');

  it('el vencimiento suma las horas de la política', () => {
    expect(computeDueAt(created, 24).toISOString()).toBe('2026-03-02T08:00:00.000Z');
    expect(computeDueAt(created, 8).toISOString()).toBe('2026-03-01T16:00:00.000Z');
  });

  it('solo vence una solicitud sin resolver pasada su fecha', () => {
    const open = { ...ticketIn('EN_PROGRESO'), dueAt: at('2026-03-01T10:00:00Z') };
    expect(isOverdue(open, at('2026-03-01T09:59:59Z'))).toBe(false);
    expect(isOverdue(open, at('2026-03-01T10:00:01Z'))).toBe(true);
    const resolved = { ...ticketIn('RESUELTA'), dueAt: at('2026-03-01T10:00:00Z') };
    expect(isOverdue(resolved, at('2026-04-01T00:00:00Z'))).toBe(false);
  });
});

describe('computeResolutionStats', () => {
  it('sin muestras no inventa promedios', () => {
    expect(computeResolutionStats([])).toEqual({
      resolvedCount: 0,
      averageResolutionHours: null,
      slaCompliancePercent: null,
      withinSlaCount: 0,
      breachedCount: 0,
    });
  });

  it('calcula promedio y cumplimiento (el límite exacto cuenta como cumplido)', () => {
    const created = at('2026-01-01T00:00:00Z');
    const stats = computeResolutionStats([
      {
        createdAt: created,
        resolvedAt: at('2026-01-01T10:00:00Z'),
        dueAt: at('2026-01-01T23:00:00Z'),
      },
      {
        createdAt: created,
        resolvedAt: at('2026-01-02T00:00:00Z'),
        dueAt: at('2026-01-01T12:00:00Z'),
      },
      {
        createdAt: created,
        resolvedAt: at('2026-01-01T02:00:00Z'),
        dueAt: at('2026-01-01T02:00:00Z'),
      },
    ]);
    expect(stats.resolvedCount).toBe(3);
    expect(stats.averageResolutionHours).toBe(12);
    expect(stats.withinSlaCount).toBe(2);
    expect(stats.breachedCount).toBe(1);
    expect(stats.slaCompliancePercent).toBe(66.7);
  });
});
