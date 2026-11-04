import {
  createUserRequestSchema,
  updateUserRequestSchema,
  type CreateUserRequest,
  type Role,
  type UpdateUserRequest,
  type User,
} from '@siga/shared';
import { useState } from 'react';
import { useCurrentUser } from '../auth/auth-context';
import { Alert } from '../components/atoms/alert';
import { Button } from '../components/atoms/button';
import { Card } from '../components/atoms/card';
import { Select } from '../components/atoms/controls';
import { EmptyState, QueryState } from '../components/molecules/query-state';
import { PageHeader } from '../components/molecules/page-header';
import { UserForm } from '../components/organisms/user-form';
import { useCreateUser, useDeactivateUser, useUpdateUser, useUsers } from '../hooks/use-catalog';
import { ROLE_LABEL } from '../lib/labels';
import { errorMessage } from '../services/api-error';

interface UserFilter {
  readonly role?: Role;
  readonly isActive?: boolean;
}

const formatDate = (value: string): string =>
  new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium' }).format(new Date(value));

export function UsersPage() {
  const currentUser = useCurrentUser();
  const [role, setRole] = useState<Role | ''>('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<User | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const filter: UserFilter = {
    ...(role !== '' && { role }),
    ...(status !== 'all' && { isActive: status === 'active' }),
  };
  const users = useUsers(filter);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();

  const closeForm = () => {
    setFormOpen(false);
    setEditingUser(null);
  };

  const saveUser = async (data: CreateUserRequest | UpdateUserRequest) => {
    if (editingUser === null) {
      await createUser.mutateAsync(createUserRequestSchema.parse(data));
    } else {
      await updateUser.mutateAsync({
        id: editingUser.id,
        body: updateUserRequestSchema.parse(data),
      });
    }
    closeForm();
  };

  const toggleActive = async (user: User) => {
    setActionError(null);
    try {
      if (user.isActive) {
        await deactivateUser.mutateAsync(user.id);
      } else {
        await updateUser.mutateAsync({
          id: user.id,
          body: {
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            isActive: true,
          },
        });
      }
      setPendingDeactivation(null);
    } catch (error) {
      setActionError(errorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración de usuarios"
        subtitle="Cree cuentas, cambie roles y gestione el acceso al sistema."
        actions={
          <Button
            variant="inverse"
            onClick={() => {
              setEditingUser(null);
              setFormOpen(true);
            }}
          >
            Nuevo usuario
          </Button>
        }
      />

      {formOpen && (
        <Card title={editingUser === null ? 'Crear usuario' : 'Editar usuario'}>
          <UserForm
            key={editingUser?.id ?? 'new'}
            initial={editingUser}
            submitting={createUser.isPending || updateUser.isPending}
            onCancel={closeForm}
            onSubmit={saveUser}
          />
        </Card>
      )}

      {actionError !== null && <Alert>{actionError}</Alert>}

      <Card
        title="Usuarios registrados"
        actions={
          <div className="flex gap-2">
            <Select
              aria-label="Filtrar por rol"
              value={role}
              onChange={(event) => {
                setRole(event.target.value as Role | '');
              }}
              className="min-w-36"
            >
              <option value="">Todos los roles</option>
              {Object.entries(ROLE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value as 'all' | 'active' | 'inactive');
              }}
              className="min-w-32"
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Desactivados</option>
            </Select>
          </div>
        }
      >
        <QueryState
          isPending={users.isPending}
          error={users.error}
          onRetry={() => {
            void users.refetch();
          }}
        >
          {users.data?.length === 0 ? (
            <EmptyState
              title="No hay usuarios para mostrar"
              description="Pruebe con otros filtros o cree una cuenta nueva."
            />
          ) : (
            <div className="-mx-5 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Usuario</th>
                    <th className="px-4 py-3 font-semibold">Rol</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Creado</th>
                    <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.data?.map((user) => (
                    <tr key={user.id} className="transition-colors hover:bg-slate-50/80">
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-900">{user.fullName}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{user.email}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-700">{ROLE_LABEL[user.role]}</td>
                      <td className="px-4 py-4">
                        <span
                          className={
                            user.isActive
                              ? 'rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                              : 'rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'
                          }
                        >
                          {user.isActive ? 'Activo' : 'Desactivado'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-slate-600">{formatDate(user.createdAt)}</td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="secondary"
                            className="min-h-9 px-3 py-1 text-xs"
                            onClick={() => {
                              setEditingUser(user);
                              setFormOpen(true);
                            }}
                          >
                            Editar
                          </Button>
                          {user.isActive ? (
                            pendingDeactivation?.id === user.id ? (
                              <>
                                <Button
                                  variant="danger"
                                  className="min-h-9 px-3 py-1 text-xs"
                                  loading={deactivateUser.isPending}
                                  onClick={() => {
                                    void toggleActive(user);
                                  }}
                                >
                                  Confirmar
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="min-h-9 px-3 py-1 text-xs"
                                  onClick={() => {
                                    setPendingDeactivation(null);
                                  }}
                                >
                                  No
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                className="min-h-9 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                                disabled={user.id === currentUser.id}
                                title={
                                  user.id === currentUser.id
                                    ? 'No puede desactivar su propia cuenta'
                                    : undefined
                                }
                                onClick={() => {
                                  setPendingDeactivation(user);
                                }}
                              >
                                Desactivar
                              </Button>
                            )
                          ) : (
                            <Button
                              variant="secondary"
                              className="min-h-9 px-3 py-1 text-xs"
                              loading={updateUser.isPending}
                              onClick={() => {
                                void toggleActive(user);
                              }}
                            >
                              Reactivar
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </QueryState>
      </Card>
    </div>
  );
}
