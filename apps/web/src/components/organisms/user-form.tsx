import {
  createUserRequestSchema,
  ROLES,
  updateUserRequestSchema,
  type CreateUserRequest,
  type Role,
  type UpdateUserRequest,
  type User,
} from '@siga/shared';
import { useState, type SyntheticEvent } from 'react';
import { errorMessage } from '../../services/api-error';
import { ROLE_LABEL } from '../../lib/labels';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Input, Select } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

interface UserFormProps {
  readonly initial: User | null;
  readonly submitting: boolean;
  readonly onCancel: () => void;
  readonly onSubmit: (data: CreateUserRequest | UpdateUserRequest) => Promise<void>;
}

export function UserForm({ initial, submitting, onCancel, onSubmit }: UserFormProps) {
  const [email, setEmail] = useState(initial?.email ?? '');
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [role, setRole] = useState<Role>(initial?.role ?? 'SOLICITANTE');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const data =
      initial === null
        ? createUserRequestSchema.safeParse({ email, fullName, role, password })
        : updateUserRequestSchema.safeParse({
            email,
            fullName,
            role,
            isActive,
            ...(password !== '' && { password }),
          });
    if (!data.success) {
      setError(data.error.issues[0]?.message ?? 'Revise los datos ingresados.');
      return;
    }

    try {
      await onSubmit(data.data);
    } catch (submitError) {
      setError(errorMessage(submitError));
    }
  };

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
      className="space-y-4"
    >
      {error !== null && <Alert>{error}</Alert>}
      <FormField id="user-full-name" label="Nombre completo">
        <Input
          id="user-full-name"
          autoComplete="name"
          maxLength={120}
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
          }}
          required
        />
      </FormField>
      <FormField id="user-email" label="Correo electrónico">
        <Input
          id="user-email"
          type="email"
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
          }}
          required
        />
      </FormField>
      <FormField id="user-role" label="Rol">
        <Select
          id="user-role"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as Role);
          }}
        >
          {ROLES.map((value) => (
            <option key={value} value={value}>
              {ROLE_LABEL[value]}
            </option>
          ))}
        </Select>
      </FormField>
      {initial !== null && (
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => {
              setIsActive(event.target.checked);
            }}
            className="h-4 w-4 rounded border-slate-300 text-brand-700 focus:ring-brand-700"
          />
          Cuenta activa
        </label>
      )}
      <FormField
        id="user-password"
        label={initial === null ? 'Contraseña inicial' : 'Nueva contraseña'}
        hint={
          initial === null
            ? 'Al menos 12 caracteres'
            : 'Déjela vacía para conservar la contraseña actual'
        }
      >
        <Input
          id="user-password"
          type="password"
          autoComplete="new-password"
          minLength={initial === null ? 12 : undefined}
          maxLength={128}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
          }}
          required={initial === null}
        />
      </FormField>
      <div className="flex flex-wrap gap-2 pt-2">
        <Button type="submit" loading={submitting}>
          {initial === null ? 'Crear usuario' : 'Guardar cambios'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
