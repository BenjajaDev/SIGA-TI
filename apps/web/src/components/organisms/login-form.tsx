import { zodResolver } from '@hookform/resolvers/zod';
import { loginRequestSchema } from '@siga/shared';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import type { z } from 'zod';
import { errorMessage } from '../../services/api-error';
import { Alert } from '../atoms/alert';
import { Button } from '../atoms/button';
import { Input } from '../atoms/controls';
import { FormField } from '../molecules/form-field';

type LoginValues = z.input<typeof loginRequestSchema>;

export interface LoginPrefill {
  readonly email: string;
  readonly password: string;
  /** Cambia en cada selección para volver a aplicar los mismos valores. */
  readonly nonce: number;
}

interface LoginFormProps {
  readonly prefill?: LoginPrefill | null;
  readonly onSubmit: (values: { email: string; password: string }) => Promise<void>;
}

export function LoginForm({ onSubmit, prefill = null }: LoginFormProps) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues, unknown, z.output<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
  });

  useEffect(() => {
    if (prefill === null) return;
    setValue('email', prefill.email, { shouldValidate: true });
    setValue('password', prefill.password, { shouldValidate: true });
  }, [prefill, setValue]);

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
