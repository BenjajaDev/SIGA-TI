import { expect, test } from '@playwright/test';
import { createTicketViaApi, emailOf, loginUi, password } from './support';

test('credenciales inválidas muestran un error sin revelar si el usuario existe', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(emailOf('solicitante1'));
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('alert')).toHaveText('Correo o contraseña incorrectos');
  await expect(page).toHaveURL(/\/login$/);
  expect(password()).not.toBe('incorrecta');
});

test('las rutas protegidas exigen sesión', async ({ page }) => {
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login$/);
});

test('cada rol ve solo la navegación y los datos que le corresponden', async ({
  browser,
  request,
}) => {
  const ticketId = await createTicketViaApi(
    request,
    'solicitante1',
    'E2E: ticket privado de solicitante1',
  );

  const owner = await (await browser.newContext()).newPage();
  await loginUi(owner, 'solicitante1');
  const nav = owner.getByRole('navigation', { name: 'Principal' });
  await expect(nav.getByRole('link', { name: 'Solicitudes' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Panel' })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Apariencia' })).toHaveCount(0);
  await owner.goto('/panel');
  await expect(owner).toHaveURL(/\/tickets$/);

  const other = await (await browser.newContext()).newPage();
  await loginUi(other, 'solicitante2');
  await other.goto(`/tickets/${ticketId}`);
  await expect(other.getByRole('heading', { name: 'Solicitud no encontrada' })).toBeVisible();
  await other.goto('/tickets');
  await expect(other.getByText('E2E: ticket privado de solicitante1')).toHaveCount(0);

  const admin = await (await browser.newContext()).newPage();
  await loginUi(admin, 'admin');
  const adminNav = admin.getByRole('navigation', { name: 'Principal' });
  await expect(adminNav.getByRole('link', { name: 'Apariencia' })).toBeVisible();
  await expect(adminNav.getByRole('link', { name: 'Nueva solicitud' })).toHaveCount(0);
  await admin.goto(`/tickets/${ticketId}`);
  await expect(admin.getByRole('heading', { level: 1 })).toContainText(
    'E2E: ticket privado de solicitante1',
  );
  await expect(
    admin.getByText('No tiene acciones disponibles sobre esta solicitud.'),
  ).toBeVisible();
});

test('cerrar sesión devuelve al ingreso y bloquea la navegación', async ({ page }) => {
  await loginUi(page, 'tecnico1');
  await page.getByRole('button', { name: 'Salir' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/tickets');
  await expect(page).toHaveURL(/\/login$/);
});
