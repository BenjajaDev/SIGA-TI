import { webEnv } from '../config/env';
import { createAuthService } from './auth-service';
import { createBrandingService } from './branding-service';
import { createCatalogService } from './catalog-service';
import { createDashboardService } from './dashboard-service';
import { createHttpClient } from './http-client';
import { createTicketService } from './ticket-service';

const http = createHttpClient({ baseUrl: webEnv.VITE_API_BASE_URL });

export const services = {
  http,
  auth: createAuthService(http),
  tickets: createTicketService(http),
  catalog: createCatalogService(http),
  branding: createBrandingService(http),
  dashboard: createDashboardService(http),
};
