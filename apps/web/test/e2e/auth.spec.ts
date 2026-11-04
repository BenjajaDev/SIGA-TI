import { expect, test } from '@playwright/test';

test('el administrador inicia y cierra sesión', async ({ page }) => {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (password === undefined) {
    throw new Error('SEED_DEFAULT_PASSWORD debe estar definido para las pruebas E2E.');
  }

  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill('admin@siga-ti.test');
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();

  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { name: 'Panel de indicadores' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Panel' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apariencia' })).toBeVisible();
  const sectionsNavigation = page.getByRole('navigation', { name: 'Secciones' });
  await expect(sectionsNavigation).toBeInViewport({ ratio: 1 });

  await page.setViewportSize({ width: 390, height: 844 });
  const menuButton = page.getByRole('button', { name: 'Abrir navegación' });
  await expect(menuButton).toBeVisible();
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await page
    .getByRole('navigation', { name: 'Secciones' })
    .getByRole('link', { name: 'Panel' })
    .click();
  await expect(page).toHaveURL(/\/panel$/);
  await expect(page.getByRole('heading', { name: 'Panel de indicadores' })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Gráfico de solicitudes por estado' })).toBeVisible();
  await expect(
    page.getByRole('img', { name: 'Gráfico de solicitudes por categoría' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(sectionsNavigation).toBeInViewport({ ratio: 1 });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await menuButton.click();
  await page.getByRole('button', { name: 'Cerrar sesión' }).click();
  await expect(page).toHaveURL(/\/login$/);
});

test('el administrador crea, edita y desactiva usuarios desde el panel', async ({ page }) => {
  const password = process.env.SEED_DEFAULT_PASSWORD;
  if (password === undefined) {
    throw new Error('SEED_DEFAULT_PASSWORD debe estar definido para las pruebas E2E.');
  }

  const email = `e2e-${Date.now()}@siga-ti.test`;
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill('admin@siga-ti.test');
  await page.getByLabel('Contraseña').fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await page.getByRole('link', { name: 'Usuarios' }).click();
  await expect(page.getByRole('heading', { name: 'Administración de usuarios' })).toBeVisible();

  await page.getByRole('button', { name: 'Nuevo usuario' }).click();
  await page.getByLabel('Nombre completo').fill('Usuario E2E');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Rol', { exact: true }).selectOption('TECNICO');
  await page.getByLabel('Contraseña inicial').fill('E2E-clave-segura-2026!');
  await page.getByRole('button', { name: 'Crear usuario' }).click();

  const userRow = page.getByRole('row').filter({ hasText: email });
  await expect(userRow).toContainText('Técnico');
  await userRow.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Nombre completo').fill('Usuario E2E Editado');
  await page.getByLabel('Rol', { exact: true }).selectOption('SUPERVISOR');
  await page.getByRole('button', { name: 'Guardar cambios' }).click();
  await expect(userRow).toContainText('Usuario E2E Editado');
  await expect(userRow).toContainText('Supervisor');

  await userRow.getByRole('button', { name: 'Desactivar' }).click();
  await userRow.getByRole('button', { name: 'Confirmar' }).click();
  await expect(userRow).toContainText('Desactivado');
  await userRow.getByRole('button', { name: 'Reactivar' }).click();
  await expect(userRow).toContainText('Activo');
});
