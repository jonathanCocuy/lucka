// Errors the front shows as they are.

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
