export interface Envelope<T> {
  i?: T | null;
  resp?: { s?: number; m?: string };
}

class ApiError extends Error {
  constructor(
    readonly path: string,
    reason: string,
  ) {
    super(path + ': ' + reason);
    this.name = 'ApiError';
  }
}

export function unwrap<T>(path: string, body: Envelope<T> | null | undefined): T {
  if (body?.resp?.s !== 1 || body.i == null)
    throw new ApiError(path, body?.resp?.m || 'failure answer');
  return body.i;
}
