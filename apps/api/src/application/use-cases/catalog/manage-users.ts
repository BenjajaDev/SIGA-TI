import type { CreateUserRequest, UpdateUserRequest } from '@siga/shared';
import type { Actor, User } from '../../../domain/entities';
import { ConflictError, ForbiddenError, NotFoundError } from '../../../domain/errors';
import type { Clock, PasswordHasher } from '../../../domain/ports/security';
import type { UserRepository } from '../../../domain/ports/user-repository';
import { assertAdmin } from '../../../domain/services/ticket-access-policy';

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
  ) {}

  async execute(actor: Actor, input: CreateUserRequest): Promise<User> {
    assertAdmin(actor);
    if (await this.users.findByEmail(input.email)) {
      throw new ConflictError('EMAIL_IN_USE', 'Ya existe un usuario con ese correo.');
    }

    const user = await this.users.create({
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      passwordHash: await this.hasher.hash(input.password),
    });
    if (user === null) {
      throw new ConflictError('EMAIL_IN_USE', 'Ya existe un usuario con ese correo.');
    }
    return user;
  }
}

export class UpdateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, userId: string, input: UpdateUserRequest): Promise<User> {
    assertAdmin(actor);
    const current = await this.users.findById(userId);
    if (current === null) throw new NotFoundError('Usuario');

    if (current.id === actor.id && (input.role !== 'ADMIN' || !input.isActive)) {
      throw new ForbiddenError('No puede cambiar su propio rol ni desactivar su cuenta.');
    }
    const losesAdminAccess =
      current.role === 'ADMIN' && current.isActive && (input.role !== 'ADMIN' || !input.isActive);
    if (losesAdminAccess && (await this.users.countActiveAdmins()) <= 1) {
      throw new ConflictError(
        'LAST_ACTIVE_ADMIN',
        'Debe existir al menos un administrador activo.',
      );
    }

    const existing = await this.users.findByEmail(input.email);
    if (existing !== null && existing.id !== userId) {
      throw new ConflictError('EMAIL_IN_USE', 'Ya existe un usuario con ese correo.');
    }

    const passwordHash =
      input.password === undefined ? undefined : await this.hasher.hash(input.password);
    const revokeSessions =
      !input.isActive || passwordHash !== undefined || input.role !== current.role;
    const updated = await this.users.update(userId, {
      email: input.email,
      fullName: input.fullName,
      role: input.role,
      isActive: input.isActive,
      ...(passwordHash !== undefined && { passwordHash }),
      ...(revokeSessions && { revokeSessionsAt: this.clock.now() }),
    });
    if (updated === null) {
      const emailOwner = await this.users.findByEmail(input.email);
      if (emailOwner !== null && emailOwner.id !== userId) {
        throw new ConflictError('EMAIL_IN_USE', 'Ya existe un usuario con ese correo.');
      }
      throw new NotFoundError('Usuario');
    }

    return updated;
  }
}

export class DeactivateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async execute(actor: Actor, userId: string): Promise<void> {
    assertAdmin(actor);
    const user = await this.users.findById(userId);
    if (user === null) throw new NotFoundError('Usuario');
    if (user.id === actor.id) {
      throw new ForbiddenError('No puede desactivar su propia cuenta.');
    }
    if (user.role === 'ADMIN' && user.isActive && (await this.users.countActiveAdmins()) <= 1) {
      throw new ConflictError(
        'LAST_ACTIVE_ADMIN',
        'Debe existir al menos un administrador activo.',
      );
    }

    const deactivated = await this.users.deactivate(userId, this.clock.now());
    if (deactivated === null) throw new NotFoundError('Usuario');
  }
}
