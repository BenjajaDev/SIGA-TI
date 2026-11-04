import type { Role } from '@siga/shared';

export interface DemoAccount {
  readonly email: string;
  readonly fullName: string;
  readonly role: Role;
}

/** Cuentas ficticias creadas por `pnpm db:seed` (dominio reservado .test). */
export const DEMO_ACCOUNTS: readonly DemoAccount[] = [
  { email: 'admin@siga-ti.test', fullName: 'Carolina Fuentes', role: 'ADMIN' },
  { email: 'supervisor@siga-ti.test', fullName: 'Rodrigo Valdés', role: 'SUPERVISOR' },
  { email: 'tecnico1@siga-ti.test', fullName: 'Matías Orellana', role: 'TECNICO' },
  { email: 'tecnico2@siga-ti.test', fullName: 'Daniela Riquelme', role: 'TECNICO' },
  { email: 'tecnico3@siga-ti.test', fullName: 'Felipe Contreras', role: 'TECNICO' },
  { email: 'solicitante1@siga-ti.test', fullName: 'Javiera Muñoz', role: 'SOLICITANTE' },
  { email: 'solicitante2@siga-ti.test', fullName: 'Sebastián Pizarro', role: 'SOLICITANTE' },
  { email: 'solicitante3@siga-ti.test', fullName: 'Camila Araya', role: 'SOLICITANTE' },
];
