export interface Envelope<T> {
  i?: T | null;
  l?: T | null;
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

export function unwrap<T>(
  path: string,
  body: Envelope<T> | null | undefined,
  key: 'i' | 'l' = 'i',
): T {
  const v = body?.[key];
  if (
    body?.resp?.s !== 1 ||
    v == null ||
    typeof v !== 'object' ||
    (key === 'l' && !Array.isArray(v))
  )
    throw new ApiError(path, body?.resp?.m || 'failure answer');
  return v;
}
