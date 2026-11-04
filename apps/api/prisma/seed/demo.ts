import { fileURLToPath } from 'node:url';
import type { TicketStatus } from '@siga/shared';
import { AssignTicketUseCase } from '../../src/application/use-cases/tickets/assign-ticket';
import { AddCommentUseCase } from '../../src/application/use-cases/tickets/comments';
import { CreateTicketUseCase } from '../../src/application/use-cases/tickets/create-ticket';
import { TransitionTicketUseCase } from '../../src/application/use-cases/tickets/transition-ticket';
import type { Actor } from '../../src/domain/entities';
import type { Clock } from '../../src/domain/ports/security';
import {
  PrismaCategoryRepository,
  PrismaSlaPolicyRepository,
} from '../../src/infrastructure/persistence/repositories/prisma-catalog-repositories';
import { PrismaCommentRepository } from '../../src/infrastructure/persistence/repositories/prisma-comment-repository';
import { PrismaTicketRepository } from '../../src/infrastructure/persistence/repositories/prisma-ticket-repository';
import { PrismaUserRepository } from '../../src/infrastructure/persistence/repositories/prisma-user-repository';
import { createDatabase, type Database } from '../../src/infrastructure/persistence/prisma-client';
import { emailOf } from './data';
import { DEMO_TICKETS } from './demo-data';
import { seedEnvSchema } from './env';

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const MS_PER_MINUTE = 60_000;
const SPAN_DAYS = 30;

class SettableClock implements Clock {
  constructor(private current: Date) {}
  now(): Date {
    return new Date(this.current);
  }
  set(date: Date): void {
    this.current = date;
  }
}

/** PRNG determinista (mulberry32): mismos datos en cada ejecución. */
const createRandom = (seed: number): (() => number) => {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
};

const pick = <T>(items: readonly T[], index: number): T => {
  const item = items[index % items.length];
  if (item === undefined) throw new Error('Lista vacía en la semilla demo');
  return item;
};

export interface DemoSummary {
  readonly tickets: number;
  readonly byStatus: Readonly<Partial<Record<TicketStatus, number>>>;
}

export interface DemoOptions {
  readonly now?: Date;
  readonly seed?: number;
}

export const seedDemo = async (db: Database, options: DemoOptions = {}): Promise<DemoSummary> => {
  if ((await db.ticket.count()) > 0) {
    throw new Error(
      'La base ya contiene solicitudes: ejecute `pnpm db:reset` y luego `pnpm db:seed`.',
    );
  }
  const now = options.now ?? new Date();
  const random = createRandom(options.seed ?? 2026);
  const clock = new SettableClock(now);

  const users = new PrismaUserRepository(db);
  const tickets = new PrismaTicketRepository(db);
  const categories = new PrismaCategoryRepository(db);
  const comments = new PrismaCommentRepository(db);
  const create = new CreateTicketUseCase(
    tickets,
    users,
    categories,
    new PrismaSlaPolicyRepository(db),
    clock,
  );
  const assign = new AssignTicketUseCase(tickets, users, clock);
  const transition = new TransitionTicketUseCase(tickets, clock);
  const addComment = new AddCommentUseCase(tickets, comments, clock);

  const actorOf = async (localPart: string): Promise<Actor> => {
    const user = await users.findByEmail(emailOf(localPart));
    if (user === null) throw new Error(`Falta el usuario ${localPart}: ejecute db:seed primero`);
    return { id: user.id, role: user.role };
  };
  const supervisor = await actorOf('supervisor');
  const technicians = await Promise.all(['tecnico1', 'tecnico2', 'tecnico3'].map(actorOf));
  const requesters = await Promise.all(
    ['solicitante1', 'solicitante2', 'solicitante3', 'solicitante4', 'solicitante5'].map(actorOf),
  );
  const categoryByName = new Map((await categories.list()).map((c) => [c.name, c.id]));

  const advance = (maxHours: number): void => {
    const window = now.getTime() - clock.now().getTime();
    const wanted = (0.5 + random() * maxHours) * MS_PER_HOUR;
    const step = Math.max(MS_PER_MINUTE, Math.min(wanted, window * 0.4));
    clock.set(new Date(clock.now().getTime() + step));
  };

  const byStatus: Partial<Record<TicketStatus, number>> = {};
  let reopenedOnce = false;
  let reassignedOnce = false;

  for (const [index, demo] of DEMO_TICKETS.entries()) {
    const age = SPAN_DAYS - (index * (SPAN_DAYS - 1)) / (DEMO_TICKETS.length - 1);
    clock.set(new Date(now.getTime() - age * MS_PER_DAY - random() * 6 * MS_PER_HOUR));

    const requester = pick(requesters, index);
    const technician = pick(technicians, index);
    const categoryId = categoryByName.get(demo.category);
    if (categoryId === undefined) throw new Error(`Categoría inexistente: ${demo.category}`);

    const ticket = await create.execute({
      actor: requester,
      title: demo.title,
      description: demo.description,
      categoryId,
      priority: demo.priority,
    });
    const move = async (to: TicketStatus, actor: Actor, note?: string): Promise<void> => {
      advance(demo.priority === 'CRITICA' ? 6 : 20);
      await transition.execute({
        actor,
        ticketId: ticket.id,
        to,
        ...(note !== undefined && { note }),
      });
    };

    if (demo.target !== 'ABIERTA') {
      advance(8);
      await assign.execute({ actor: supervisor, ticketId: ticket.id, assigneeId: technician.id });
    }
    if (['EN_PROGRESO', 'EN_ESPERA', 'RESUELTA', 'CERRADA'].includes(demo.target)) {
      await move('EN_PROGRESO', technician);
    }
    if (demo.target === 'EN_ESPERA')
      await move('EN_ESPERA', technician, 'Esperando repuesto o aprobación');
    if (demo.target === 'RESUELTA' || demo.target === 'CERRADA') {
      await move('RESUELTA', technician, 'Se aplicó la solución y se verificó el funcionamiento');
      if (!reopenedOnce && demo.target === 'RESUELTA') {
        reopenedOnce = true;
        await move('EN_PROGRESO', requester, 'El problema persiste en otro equipo');
        await move('RESUELTA', technician, 'Se corrigió también el segundo equipo');
      }
    }
    if (demo.target === 'CERRADA') await move('CERRADA', requester);

    if (demo.target === 'EN_PROGRESO' && !reassignedOnce) {
      reassignedOnce = true;
      advance(4);
      const other = pick(technicians, index + 1);
      await assign.execute({ actor: supervisor, ticketId: ticket.id, assigneeId: other.id });
    }

    if (index % 3 === 0 && demo.target !== 'ABIERTA' && demo.target !== 'CERRADA') {
      advance(3);
      await addComment.execute({
        actor: requester,
        ticketId: ticket.id,
        body: '¿Hay novedades? Es urgente para nuestra unidad.',
        visibility: 'PUBLICO',
      });
      advance(2);
      await addComment.execute({
        actor: technician,
        ticketId: ticket.id,
        body: 'Revisado el caso; avanzamos con el diagnóstico.',
        visibility: 'PUBLICO',
      });
      advance(1);
      await addComment.execute({
        actor: technician,
        ticketId: ticket.id,
        body: 'Nota interna: validar con redes antes de intervenir.',
        visibility: 'INTERNO',
      });
    }
    byStatus[demo.target] = (byStatus[demo.target] ?? 0) + 1;
  }
  return { tickets: DEMO_TICKETS.length, byStatus };
};

const main = async (): Promise<void> => {
  const parsed = seedEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      'Las semillas demo no corren en producción y requieren DATABASE_URL y SEED_DEFAULT_PASSWORD.',
    );
  }
  const db = createDatabase(parsed.data.DATABASE_URL);
  try {
    const summary = await seedDemo(db);
    process.stdout.write(`Datos demo creados: ${JSON.stringify(summary)}\n`);
  } finally {
    await db.$disconnect();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
