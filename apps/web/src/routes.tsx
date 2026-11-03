import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { RequireAuth, RequireRole } from './auth/route-guards';
import { Spinner } from './components/atoms/spinner';
import { AppShell } from './components/organisms/app-shell';
import { BrandingPage } from './pages/branding-page';
import { LoginPage } from './pages/login-page';
import { NewTicketPage } from './pages/new-ticket-page';
import { NotFoundPage } from './pages/not-found-page';
import { TicketDetailPage } from './pages/ticket-detail-page';
import { TicketsPage } from './pages/tickets-page';

const DashboardPage = lazy(() =>
  import('./pages/dashboard-page').then((module) => ({ default: module.DashboardPage })),
);

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="/tickets" replace />} />
          <Route path="/tickets" element={<TicketsPage />} />
          <Route element={<RequireRole roles={['SOLICITANTE', 'TECNICO', 'SUPERVISOR']} />}>
            <Route path="/tickets/nueva" element={<NewTicketPage />} />
          </Route>
          <Route path="/tickets/:ticketId" element={<TicketDetailPage />} />
          <Route element={<RequireRole roles={['SUPERVISOR', 'ADMIN']} />}>
            <Route
              path="/panel"
              element={
                <Suspense fallback={<Spinner />}>
                  <DashboardPage />
                </Suspense>
              }
            />
          </Route>
          <Route element={<RequireRole roles={['ADMIN']} />}>
            <Route path="/apariencia" element={<BrandingPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
