import { describe, expect, it } from 'vitest';
import { NotFoundError } from '../../src/domain/errors';
import {
  assertCanView,
  canComment,
  canReadInternalComments,
  canWriteInternalComments,
  visibilityScopeFor,
} from '../../src/domain/services/ticket-access-policy';
import {
  ADMIN,
  ASSIGNEE,
  OTHER_REQUESTER,
  OTHER_TECH,
  REQUESTER,
  SUPERVISOR,
  buildTicket,
} from '../helpers/fixtures';

const ticket = buildTicket();

describe('visibilidad de solicitudes', () => {
  it.each([
    ['supervisor', SUPERVISOR],
    ['admin', ADMIN],
    ['solicitante dueño', REQUESTER],
    ['técnico asignado', ASSIGNEE],
  ])('%s puede ver', (_name, actor) => {
    expect(assertCanView(actor, ticket)).toBe(ticket);
  });

  it.each([
    ['otro solicitante', OTHER_REQUESTER],
    ['otro técnico', OTHER_TECH],
  ])('%s recibe 404', (_name, actor) => {
    expect(() => assertCanView(actor, ticket)).toThrow(NotFoundError);
  });

  it('una solicitud inexistente da 404', () => {
    expect(() => assertCanView(SUPERVISOR, null)).toThrow(NotFoundError);
  });

  it('el alcance de listado es total para supervisor y admin, acotado para el resto', () => {
    expect(visibilityScopeFor(SUPERVISOR)).toEqual({ kind: 'all' });
    expect(visibilityScopeFor(ADMIN)).toEqual({ kind: 'all' });
    expect(visibilityScopeFor(ASSIGNEE)).toEqual({ kind: 'involved', userId: ASSIGNEE.id });
    expect(visibilityScopeFor(REQUESTER)).toEqual({ kind: 'involved', userId: REQUESTER.id });
  });
});

describe('comentarios', () => {
  it('internos: los leen supervisor, admin y técnico asignado; no el solicitante', () => {
    expect(canReadInternalComments(SUPERVISOR, ticket)).toBe(true);
    expect(canReadInternalComments(ADMIN, ticket)).toBe(true);
    expect(canReadInternalComments(ASSIGNEE, ticket)).toBe(true);
    expect(canReadInternalComments(REQUESTER, ticket)).toBe(false);
  });

  it('internos: los escriben supervisor y técnico asignado; no admin ni solicitante', () => {
    expect(canWriteInternalComments(SUPERVISOR, ticket)).toBe(true);
    expect(canWriteInternalComments(ASSIGNEE, ticket)).toBe(true);
    expect(canWriteInternalComments(ADMIN, ticket)).toBe(false);
    expect(canWriteInternalComments(REQUESTER, ticket)).toBe(false);
  });

  it('el admin no comenta', () => {
    expect(canComment(ADMIN, ticket)).toBe(false);
    expect(canComment(REQUESTER, ticket)).toBe(true);
  });
});
