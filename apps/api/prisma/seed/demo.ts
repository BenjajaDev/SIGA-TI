import { fileURLToPath } from 'node:url';
import { PRIORITIES, type TicketStatus } from '@siga/shared';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/prisma-client';
import { Argon2PasswordHasher } from '../../src/infrastructure/security/argon2-password-hasher';
import { seedBase } from './base';
import { seedEnvSchema } from './env';

const SUBJECTS = [
  'No enciende mi laptop',
  'Error al acceder al Aula Virtual',
  'Configuración de VPN para teletrabajo',
  'Instalación de MATLAB y licencias',
  'Impresora del tercer piso no funciona',
  'Cambio de contraseña institucional',
  'Solicitud de mouse y teclado',
  'Problemas con el Wi-Fi en el auditorio',
  'Correo institucional bloqueado',
  'Actualización de software de seguridad',
] as const;

const DESCRIPTIONS = [
  'Desde esta mañana el equipo no responde al botón de encendido.',
  'Me sale un error 403 al intentar entrar con mi cuenta.',
  'Necesito acceso remoto para el proyecto de investigación.',
  'Requiero la última versión para la clase de cálculo.',
  'Se quedó atascada una hoja y no imprime nada.',
  'Olvidé mi clave anterior y el sistema de recuperación falla.',
  'El scroll del mouse está fallando y faltan teclas en el teclado.',
  'La señal es muy débil y se desconecta constantemente.',
  'No puedo enviar ni recibir correos desde ayer.',
  'El antivirus dice que la licencia expiró.',
] as const;

const DEMO_STATUSES: readonly TicketStatus[] = [
  'ABIERTA',
  'ASIGNADA',
  'EN_PROGRESO',
  'EN_ESPERA',
  'RESUELTA',
  'CERRADA',
];

const AGE_RANGE_DAYS: Readonly<Record<TicketStatus, readonly [number, number]>> = {
  ABIERTA: [0, 2],
  ASIGNADA: [2, 5],
  EN_PROGRESO: [5, 10],
  EN_ESPERA: [5, 10],
  RESUELTA: [10, 20],
  CERRADA: [20, 30],
};

const pickRandom = <T>(items: readonly T[], label: string): T => {
  const item = items[Math.floor(Math.random() * items.length)];
  if (item === undefined) throw new Error(`No hay elementos disponibles para ${label}.`);
  return item;
};

const randomDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const ticketIdOf = (index: number): string =>
  `00000000-0000-4000-8000-${(index + 1).toString(16).padStart(12, '0')}`;

export const seedDemo = async (db: Database): Promise<void> => {
  const users = await db.user.findMany({ where: { isActive: true } });
  const categories = await db.category.findMany({ where: { isActive: true } });
  const slaPolicies = await db.slaPolicy.findMany();
  const requesters = users.filter((user) => user.role === 'SOLICITANTE');
  const technicians = users.filter((user) => user.role === 'TECNICO');
  const supervisors = users.filter((user) => user.role === 'SUPERVISOR');

  if (requesters.length === 0 || categories.length === 0 || slaPolicies.length === 0) {
    throw new Error('Ejecute primero la semilla base para crear usuarios, categorías y SLA.');
  }

  const now = new Date();
  for (let index = 0; index < 40; index++) {
    const ticketId = ticketIdOf(index);
    await db.$transaction(async (transaction) => {
      if (await transaction.ticket.findUnique({ where: { id: ticketId }, select: { id: true } })) {
        return;
      }

      const requester = pickRandom(requesters, 'solicitantes');
      const category = pickRandom(categories, 'categorías');
      const priority = pickRandom(PRIORITIES, 'prioridades');
      const sla = slaPolicies.find((policy) => policy.priority === priority);
      if (sla === undefined) {
        throw new Error(`No existe una política SLA para la prioridad ${priority}.`);
      }

      const status = DEMO_STATUSES[index % DEMO_STATUSES.length];
      if (status === undefined) throw new Error('No hay estados configurados para datos demo.');
      const [minimumAge, maximumAge] = AGE_RANGE_DAYS[status];
      const ageInDays = minimumAge + Math.random() * (maximumAge - minimumAge);
      const createdAt = new Date(now.getTime() - ageInDays * 86_400_000);
      const assignee = status === 'ABIERTA' ? null : pickRandom(technicians, 'técnicos');
      if (assignee !== null && supervisors.length === 0) {
        throw new Error('Se necesita al menos un supervisor para asignar solicitudes de demo.');
      }

      const assignedAt = new Date(createdAt.getTime() + 3_600_000);
      const startedAt = new Date(createdAt.getTime() + 7_200_000);
      const resolutionHours = 2 + Math.random() * Math.max(1, sla.resolutionHours * 1.5 - 2);
      const resolvedAt =
        status === 'RESUELTA' || status === 'CERRADA'
          ? new Date(createdAt.getTime() + resolutionHours * 3_600_000)
          : null;
      const closedAt =
        status === 'CERRADA' && resolvedAt !== null
          ? new Date(resolvedAt.getTime() + 12 * 3_600_000)
          : null;
      const updatedAt =
        closedAt ??
        resolvedAt ??
        (status === 'EN_ESPERA'
          ? new Date(startedAt.getTime() + 3_600_000)
          : status === 'EN_PROGRESO'
            ? startedAt
            : status === 'ASIGNADA'
              ? assignedAt
              : createdAt);

      await transaction.ticket.create({
        data: {
          id: ticketId,
          title: pickRandom(SUBJECTS, 'títulos'),
          description: pickRandom(DESCRIPTIONS, 'descripciones'),
          categoryId: category.id,
          priority,
          status,
          requesterId: requester.id,
          assigneeId: assignee?.id ?? null,
          dueAt: new Date(createdAt.getTime() + sla.resolutionHours * 3_600_000),
          resolvedAt,
          closedAt,
          createdAt,
          updatedAt,
        },
      });

      await transaction.ticketEvent.create({
        data: {
          ticketId,
          type: 'CREATED',
          actorId: requester.id,
          toStatus: 'ABIERTA',
          createdAt,
        },
      });

      if (assignee !== null) {
        const supervisor = pickRandom(supervisors, 'supervisores');
        await transaction.ticketEvent.create({
          data: {
            ticketId,
            type: 'ASSIGNED',
            actorId: supervisor.id,
            fromStatus: 'ABIERTA',
            toStatus: 'ASIGNADA',
            toAssigneeId: assignee.id,
            createdAt: assignedAt,
          },
        });

        if (status !== 'ASIGNADA') {
          await transaction.ticketEvent.create({
            data: {
              ticketId,
              type: 'STATUS_CHANGED',
              actorId: assignee.id,
              fromStatus: 'ASIGNADA',
              toStatus: 'EN_PROGRESO',
              createdAt: startedAt,
            },
          });
        }

        if (status === 'EN_ESPERA') {
          await transaction.ticketEvent.create({
            data: {
              ticketId,
              type: 'STATUS_CHANGED',
              actorId: assignee.id,
              fromStatus: 'EN_PROGRESO',
              toStatus: 'EN_ESPERA',
              createdAt: new Date(startedAt.getTime() + 3_600_000),
            },
          });
        }

        if (resolvedAt !== null) {
          await transaction.ticketEvent.create({
            data: {
              ticketId,
              type: 'STATUS_CHANGED',
              actorId: assignee.id,
              fromStatus: 'EN_PROGRESO',
              toStatus: 'RESUELTA',
              createdAt: resolvedAt,
            },
          });
        }

        if (closedAt !== null) {
          await transaction.ticketEvent.create({
            data: {
              ticketId,
              type: 'STATUS_CHANGED',
              actorId: requester.id,
              fromStatus: 'RESUELTA',
              toStatus: 'CERRADA',
              createdAt: closedAt,
            },
          });
        }
      }

      const commentAt = randomDate(createdAt, now);
      if (Math.random() > 0.5) {
        await transaction.comment.create({
          data: {
            ticketId,
            authorId: requester.id,
            body: '¿Hay alguna novedad con mi solicitud?',
            visibility: 'PUBLICO',
            createdAt: commentAt,
          },
        });
      }

      if (assignee !== null && Math.random() > 0.7) {
        await transaction.comment.create({
          data: {
            ticketId,
            authorId: assignee.id,
            body: 'Iniciando diagnóstico del requerimiento.',
            visibility: 'INTERNO',
            createdAt: commentAt,
          },
        });
      }
    });
  }
};

const main = async (): Promise<void> => {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map(
      (issue) => `- ${issue.path.join('.')}: ${issue.message}`,
    );
    throw new Error(`Las semillas no pueden ejecutarse:\n${issues.join('\n')}`);
  }

  const db = createDatabase(parsed.data.DATABASE_URL);
  try {
    await seedBase(db, new Argon2PasswordHasher(), parsed.data.SEED_DEFAULT_PASSWORD);
    await seedDemo(db);
  } finally {
    await db.$disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
