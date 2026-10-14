// Errores que el front muestra tal cual.

export class ApiClientError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof ApiClientError
    ? error.message
    : 'Algo falló. Intenta de nuevo.'
}
