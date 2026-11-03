import { TICKET_STATUSES, type TicketStatus } from '@siga/shared';
import { describe, expect, it } from 'vitest';
import type { Actor } from '../../src/domain/entities';
import { ConflictError, ForbiddenError, ValidationError } from '../../src/domain/errors';
import { assertTransition, timestampsAfter } from '../../src/domain/services/ticket-state-machine';
import {
  ADMIN,
  ASSIGNEE,
  OTHER_REQUESTER,
  OTHER_TECH,
  REQUESTER,
  SUPERVISOR,
  ticketIn,
} from '../helpers/fixtures';

type Outcome = 'ok' | 'forbidden' | 'conflict';

const WORKER_PAIRS: readonly (readonly [TicketStatus, TicketStatus])[] = [
  ['ASIGNADA', 'EN_PROGRESO'],
  ['EN_PROGRESO', 'EN_ESPERA'],
  ['EN_ESPERA', 'EN_PROGRESO'],
  ['EN_PROGRESO', 'RESUELTA'],
];
const OWNER_PAIRS: readonly (readonly [TicketStatus, TicketStatus])[] = [
  ['RESUELTA', 'CERRADA'],
  ['RESUELTA', 'EN_PROGRESO'],
];

const isPair = (
  pairs: readonly (readonly [TicketStatus, TicketStatus])[],
  from: TicketStatus,
  to: TicketStatus,
): boolean => pairs.some(([f, t]) => f === from && t === to);

const expectedOutcome = (actorKind: string, from: TicketStatus, to: TicketStatus): Outcome => {
  const noParty =
    actorKind === 'admin' ||
    actorKind === 'otherTech' ||
    actorKind === 'otherRequester' ||
    (actorKind === 'assignee' && from === 'ABIERTA');
  if (noParty) return 'forbidden';
  const worker = isPair(WORKER_PAIRS, from, to);
  const owner = isPair(OWNER_PAIRS, from, to);
  if (!worker && !owner) return 'conflict';
  if (actorKind === 'supervisor') return 'ok';
  if (actorKind === 'assignee') return worker ? 'ok' : 'forbidden';
  return owner ? 'ok' : 'forbidden';
};

const run = (actor: Actor, from: TicketStatus, to: TicketStatus): Outcome => {
  try {
    assertTransition(actor, ticketIn(from), to, 'nota de prueba');
    return 'ok';
  } catch (error) {
    if (error instanceof ForbiddenError) return 'forbidden';
    if (error instanceof ConflictError) return 'conflict';
    throw error;
  }
};

const ACTORS: readonly (readonly [string, Actor])[] = [
  ['supervisor', SUPERVISOR],
  ['assignee', ASSIGNEE],
  ['requester', REQUESTER],
  ['admin', ADMIN],
  ['otherTech', OTHER_TECH],
  ['otherRequester', OTHER_REQUESTER],
];

describe('máquina de estados: matriz exhaustiva rol × transición', () => {
  for (const [kind, actor] of ACTORS) {
    it(`resuelve cada par de estados para ${kind}`, () => {
      for (const from of TICKET_STATUSES) {
        for (const to of TICKET_STATUSES) {
          expect(run(actor, from, to), `${kind}: ${from} → ${to}`).toBe(
            expectedOutcome(kind, from, to),
          );
        }
      }
    });
  }
});

describe('máquina de estados: notas obligatorias', () => {
  it.each([
    ['EN_PROGRESO', 'EN_ESPERA'],
    ['EN_PROGRESO', 'RESUELTA'],
  ] as const)('exige nota en %s → %s', (from, to) => {
    expect(() => {
      assertTransition(ASSIGNEE, ticketIn(from), to, undefined);
    }).toThrow(ValidationError);
  });

  it('exige nota al reabrir', () => {
    expect(() => {
      assertTransition(REQUESTER, ticketIn('RESUELTA'), 'EN_PROGRESO', undefined);
    }).toThrow(ValidationError);
  });

  it.each([
    ['ASIGNADA', 'EN_PROGRESO'],
    ['EN_ESPERA', 'EN_PROGRESO'],
  ] as const)('no exige nota en %s → %s', (from, to) => {
    expect(() => {
      assertTransition(ASSIGNEE, ticketIn(from), to, undefined);
    }).not.toThrow();
  });
});

describe('timestampsAfter', () => {
  const now = new Date('2026-02-01T10:00:00Z');

  it('fija resolvedAt al resolver', () => {
    expect(timestampsAfter(ticketIn('EN_PROGRESO'), 'RESUELTA', now)).toEqual({
      resolvedAt: now,
      closedAt: null,
    });
  });

  it('conserva resolvedAt y fija closedAt al cerrar', () => {
    const ticket = ticketIn('RESUELTA');
    expect(timestampsAfter(ticket, 'CERRADA', now)).toEqual({
      resolvedAt: ticket.resolvedAt,
      closedAt: now,
    });
  });

  it('limpia resolvedAt al reabrir', () => {
    expect(timestampsAfter(ticketIn('RESUELTA'), 'EN_PROGRESO', now)).toEqual({
      resolvedAt: null,
      closedAt: null,
    });
  });
});
