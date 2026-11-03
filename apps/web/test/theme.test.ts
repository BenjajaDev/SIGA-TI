import { describe, expect, it } from 'vitest';
import { applyTheme, themeVariables } from '../src/lib/theme';
import { describeEvent } from '../src/lib/labels';

describe('tema', () => {
  it('convierte la identidad visual en variables CSS', () => {
    expect(
      themeVariables({ primaryColor: '#111111', secondaryColor: '#222222', gradientAngle: 45 }),
    ).toEqual({
      '--brand-primary': '#111111',
      '--brand-secondary': '#222222',
      '--brand-angle': '45deg',
    });
  });

  it('aplica las variables al elemento', () => {
    const el = document.createElement('div');
    applyTheme({ primaryColor: '#7a1030', secondaryColor: '#b45309', gradientAngle: 90 }, el);
    expect(el.style.getPropertyValue('--brand-primary')).toBe('#7a1030');
    expect(el.style.getPropertyValue('--brand-angle')).toBe('90deg');
  });
});

describe('describeEvent', () => {
  const base = {
    id: '1',
    type: 'STATUS_CHANGED',
    actor: { id: 'a', fullName: 'Ana' },
    fromStatus: 'ASIGNADA',
    toStatus: 'EN_PROGRESO',
    fromAssignee: null,
    toAssignee: null,
    note: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  } as const;
  it('redacta cada tipo de evento en español', () => {
    expect(describeEvent(base)).toBe('Ana cambió el estado de Asignada a En progreso');
    expect(
      describeEvent({ ...base, type: 'ASSIGNED', toAssignee: { id: 't', fullName: 'Tomás' } }),
    ).toContain('asignó la solicitud a Tomás');
    expect(describeEvent({ ...base, type: 'CREATED' })).toBe('Ana registró la solicitud');
  });
});
