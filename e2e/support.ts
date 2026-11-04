import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const API_URL = 'http://localhost:3100/api/v1';
export type Who =
  'admin' | 'supervisor' | 'tecnico1' | 'tecnico2' | 'tecnico3' | 'solicitante1' | 'solicitante2';

export const statusBadge = (page: Page, label: string) =>
  page.locator('span').filter({ hasText: new RegExp(`^${label}$`) });

export const password = (): string => process.env.SEED_DEFAULT_PASSWORD ?? '';

export const emailOf = (who: Who): string => `${who}@siga-ti.test`;

export const loginUi = async (page: Page, who: Who): Promise<void> => {
  await page.goto('/login');
  await page.getByLabel('Correo institucional').fill(emailOf(who));
  await page.getByLabel('Contraseña').fill(password());
  await page.getByRole('button', { name: 'Ingresar' }).click();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
};

export const apiToken = async (request: APIRequestContext, who: Who): Promise<string> => {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: { email: emailOf(who), password: password() },
  });
  expect(response.ok()).toBe(true);
  return ((await response.json()) as { accessToken: string }).accessToken;
};

export const createTicketViaApi = async (
  request: APIRequestContext,
  who: Who,
  title: string,
): Promise<string> => {
  const token = await apiToken(request, who);
  const headers = { Authorization: `Bearer ${token}` };
  const categories = (await (await request.get(`${API_URL}/categories`, { headers })).json()) as {
    items: { id: string }[];
  };
  const response = await request.post(`${API_URL}/tickets`, {
    headers,
    data: {
      title,
      description: 'Solicitud creada por la prueba E2E para verificar permisos.',
      categoryId: categories.items[0]?.id,
      priority: 'MEDIA',
    },
  });
  expect(response.status()).toBe(201);
  return ((await response.json()) as { id: string }).id;
};
