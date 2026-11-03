import type { Priority, Role } from '@siga/shared';

export const SEED_EMAIL_DOMAIN = 'siga-ti.test';

export const SLA_HOURS: Readonly<Record<Priority, number>> = {
  CRITICA: 8,
  ALTA: 24,
  MEDIA: 72,
  BAJA: 120,
};

export const CATEGORIES: readonly { name: string; description: string }[] = [
  { name: 'Soporte de equipos', description: 'Computadores, impresoras y periféricos' },
  { name: 'Redes y conectividad', description: 'Wi-Fi, red cableada y VPN' },
  { name: 'Cuentas y accesos', description: 'Contraseñas, permisos y cuentas institucionales' },
  { name: 'Software y licencias', description: 'Instalación y licenciamiento de software' },
  { name: 'Plataformas académicas', description: 'Aula virtual y sistemas de gestión académica' },
  { name: 'Correo y colaboración', description: 'Correo, calendario y herramientas colaborativas' },
  { name: 'Otros', description: 'Solicitudes que no calzan en otras categorías' },
];

export interface SeedUser {
  readonly localPart: string;
  readonly fullName: string;
  readonly role: Role;
}

export const USERS: readonly SeedUser[] = [
  { localPart: 'admin', fullName: 'Carolina Fuentes', role: 'ADMIN' },
  { localPart: 'supervisor', fullName: 'Rodrigo Valdés', role: 'SUPERVISOR' },
  { localPart: 'tecnico1', fullName: 'Matías Orellana', role: 'TECNICO' },
  { localPart: 'tecnico2', fullName: 'Daniela Riquelme', role: 'TECNICO' },
  { localPart: 'tecnico3', fullName: 'Felipe Contreras', role: 'TECNICO' },
  { localPart: 'solicitante1', fullName: 'Javiera Muñoz', role: 'SOLICITANTE' },
  { localPart: 'solicitante2', fullName: 'Sebastián Pizarro', role: 'SOLICITANTE' },
  { localPart: 'solicitante3', fullName: 'Camila Araya', role: 'SOLICITANTE' },
  { localPart: 'solicitante4', fullName: 'Tomás Herrera', role: 'SOLICITANTE' },
  { localPart: 'solicitante5', fullName: 'Valentina Soto', role: 'SOLICITANTE' },
];

export const emailOf = (localPart: string): string => `${localPart}@${SEED_EMAIL_DOMAIN}`;
