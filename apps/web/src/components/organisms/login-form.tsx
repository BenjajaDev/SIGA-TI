import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema } from '@siga/shared';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { errorMessage } from '../../services/api-error';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Input } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

type LoginValues = z.input<typeof loginRequestSchema>;

interface LoginFormProps {
  readonly onSubmit: (values: { email: string; password: string }) => Promise<void>;
}

export function LoginForm({ onSubmit }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues, unknown, z.output<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await onSubmit(values);
    } catch (error) {
      setServerError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={(event) => void submit(event)} noValidate className="space-y-4">
      {serverError !== null && <Alert>{serverError}</Alert>}
      <FormField id="email" label="Correo institucional" error={errors.email?.message}>
        <Input
          id="email"
          type="email"
          autoComplete="username"
          invalid={errors.email !== undefined}
          {...register('email')}
        />
      </FormField>
      <FormField id="password" label="Contraseña" error={errors.password?.message}>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          invalid={errors.password !== undefined}
          {...register('password')}
        />
      </FormField>
      <Button type="submit" loading={isSubmitting} className="w-full">
        Ingresar
      </Button>
    </form>
  );
}
