export interface ExternalIdentity {
  readonly email: string;
  readonly fullName: string;
}

export interface IdentityProvider {
  /** Devuelve la identidad si las credenciales son válidas; null en caso contrario. */
  authenticate(email: string, password: string): Promise<ExternalIdentity | null>;
}
