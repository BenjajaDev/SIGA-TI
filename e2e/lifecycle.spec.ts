import { expect, test } from '@playwright/test';
import { loginUi, statusBadge } from './support';

test('ciclo completo: crear, asignar, resolver y cerrar', async ({ browser }) => {
  const solicitante = await (await browser.newContext()).newPage();
  const supervisor = await (await browser.newContext()).newPage();
  const tecnico = await (await browser.newContext()).newPage();

  await loginUi(solicitante, 'solicitante1');
  await solicitante.getByRole('link', { name: 'Nueva solicitud' }).first().click();
  await solicitante.getByLabel('Título').fill('E2E: no funciona el proyector');
  await solicitante
    .getByLabel('Descripción')
    .fill('El proyector de la sala 105 no enciende desde la mañana.');
  await solicitante.getByLabel('Categoría').selectOption({ label: 'Soporte de equipos' });
  await solicitante.getByLabel('Prioridad').selectOption({ label: 'Alta' });
  await solicitante.getByRole('button', { name: 'Registrar solicitud' }).click();

  const heading = solicitante.getByRole('heading', { level: 1 });
  await expect(heading).toContainText('E2E: no funciona el proyector');
  const detailUrl = solicitante.url();
  await expect(statusBadge(solicitante, 'Abierta')).toBeVisible();
  await expect(solicitante.getByText('Javiera Muñoz registró la solicitud')).toBeVisible();

  await loginUi(supervisor, 'supervisor');
  await supervisor.goto(detailUrl);
  await supervisor.getByLabel('Asignar a').selectOption({ label: 'Daniela Riquelme' });
  await supervisor.getByRole('button', { name: 'Asignar', exact: true }).click();
  await expect(statusBadge(supervisor, 'Asignada')).toBeVisible();
  await expect(supervisor.getByText('asignó la solicitud a Daniela Riquelme')).toBeVisible();

  await loginUi(tecnico, 'tecnico2');
  await expect(tecnico.getByRole('link', { name: 'E2E: no funciona el proyector' })).toBeVisible();
  await tecnico.goto(detailUrl);
  await tecnico.getByRole('button', { name: 'Iniciar trabajo' }).click();
  await expect(statusBadge(tecnico, 'En progreso')).toBeVisible();
  await tecnico.getByRole('button', { name: 'Marcar como resuelta' }).click();
  await expect(tecnico.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
  await tecnico.getByLabel(/Nota para/).fill('Se reemplazó la lámpara del proyector');
  await tecnico.getByRole('button', { name: 'Confirmar' }).click();
  await expect(statusBadge(tecnico, 'Resuelta')).toBeVisible();
  await expect(tecnico.getByText('Se reemplazó la lámpara del proyector')).toBeVisible();

  await solicitante.reload();
  await expect(statusBadge(solicitante, 'Resuelta')).toBeVisible();
  await solicitante.getByRole('button', { name: 'Cerrar solicitud' }).click();
  await expect(statusBadge(solicitante, 'Cerrada')).toBeVisible();
  await expect(solicitante.getByText(/La solicitud está cerrada/)).toBeVisible();
  await expect(solicitante.getByText('cambió el estado de Resuelta a Cerrada')).toBeVisible();
});
