import { expect, test } from '@playwright/test';
import { API_URL, apiToken, createTicketViaApi, loginUi } from './support';

test('el panel refleja los datos reales de la API', async ({ page, request }) => {
  await createTicketViaApi(request, 'solicitante2', 'E2E: dato para el panel');
  const token = await apiToken(request, 'supervisor');
  const summary = (await (
    await request.get(`${API_URL}/dashboard/summary`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  ).json()) as { total: number; backlog: number };

  await loginUi(page, 'supervisor');
  await page
    .getByRole('navigation', { name: 'Principal' })
    .getByRole('link', { name: 'Panel' })
    .click();
  await expect(page.getByRole('heading', { name: 'Panel de indicadores' })).toBeVisible();
  const total = page
    .locator('dt', { hasText: 'Total de solicitudes' })
    .locator('xpath=following-sibling::dd');
  await expect(total).toHaveText(String(summary.total));
  const backlog = page.locator('dt', { hasText: 'Backlog' }).locator('xpath=following-sibling::dd');
  await expect(backlog).toHaveText(String(summary.backlog));
  await expect(page.getByRole('img', { name: 'Gráfico de solicitudes por estado' })).toBeVisible();
  const workload = page.getByRole('table', { name: 'Solicitudes abiertas por técnico' });
  await expect(workload.getByRole('row')).toHaveCount(4);
});

test('el administrador edita nombre, colores y degradado, y el cambio persiste', async ({
  page,
}) => {
  await loginUi(page, 'admin');
  await page.getByRole('link', { name: 'Apariencia' }).click();
  await expect(page.getByRole('heading', { name: 'Apariencia' })).toBeVisible();

  await page.getByLabel('Color primario', { exact: true }).fill('#ffee99');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/demasiado claro/)).toBeVisible();

  await page.getByLabel('Nombre de la institución').fill('Universidad E2E');
  await page.getByLabel('Color primario', { exact: true }).fill('#7a1030');
  await page.getByLabel('Color secundario', { exact: true }).fill('#b45309');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/Cambios guardados/)).toBeVisible();

  const readVar = (name: string) =>
    page.evaluate(
      (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(),
      name,
    );
  expect(await readVar('--brand-primary')).toBe('#7a1030');
  expect(await readVar('--brand-secondary')).toBe('#b45309');

  await page.reload();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  await expect(page.getByText('Universidad E2E').first()).toBeVisible();
  expect(await readVar('--brand-primary')).toBe('#7a1030');
  const header = page.locator('header').first();
  await expect(header).toHaveCSS('background-image', /linear-gradient/);

  await page.getByRole('button', { name: 'Restaurar valores por defecto' }).click();
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(page.getByText(/Cambios guardados/)).toBeVisible();
  expect(await readVar('--brand-primary')).toBe('#1e3a8a');
});

test('el login muestra el tema público sin sesión', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  const color = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--brand-primary').trim(),
  );
  expect(color).toMatch(/^#[0-9a-f]{6}$/i);
});
